/**
 * Cloudflare Access JWT 校验（Pages Functions · 零依赖）
 *
 * 校验请求头 `Cf-Access-Jwt-Assertion`：
 *  1. RS256 验签（JWKS 从团队域名 /cdn-cgi/access/certs 拉取，缓存 1h）
 *  2. aud 包含 Access Application AUD
 *  3. exp 未过期
 *  4. iss 为团队域名（存在则校验）
 *  5. 返回 email claim（小写）作为身份
 *
 * 文档：https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
 */

const JWKS_CACHE_TTL_MS = 60 * 60 * 1000 // 1 小时

let jwksCache = { at: 0, keys: [] }

/** base64url → UTF-8 字符串（JWT payload 段） */
function b64urlDecode(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
  const bin = atob(b64 + pad)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

/** base64url → Uint8Array（JWT 签名段） */
function b64urlToBytes(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
  const bin = atob(b64 + pad)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function fetchJwks(teamDomain) {
  const res = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`)
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`)
  const data = await res.json()
  return Array.isArray(data.keys) ? data.keys : []
}

async function getJwks(teamDomain) {
  if (Date.now() - jwksCache.at < JWKS_CACHE_TTL_MS && jwksCache.keys.length > 0) {
    return jwksCache.keys
  }
  const keys = await fetchJwks(teamDomain)
  jwksCache = { at: Date.now(), keys }
  return keys
}

async function verifySignature(jwk, data, sig) {
  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', use: 'sig' },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  )
  return crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, sig, data)
}

/**
 * 校验请求携带的 Access JWT。
 * @param {Request} request
 * @param {{ teamDomain: string, aud: string }} cfg
 * @returns {Promise<{ ok: true, email: string } | { ok: false, reason: string }>}
 */
export async function verifyAccessJwt(request, { teamDomain, aud }) {
  const token = request.headers.get('Cf-Access-Jwt-Assertion')
  if (!token) return { ok: false, reason: 'missing Cf-Access-Jwt-Assertion' }

  const parts = token.split('.')
  if (parts.length !== 3) return { ok: false, reason: 'malformed token' }

  let payload
  try {
    payload = JSON.parse(b64urlDecode(parts[1]))
  } catch {
    return { ok: false, reason: 'bad payload' }
  }

  const now = Date.now() / 1000
  if (!payload.exp || payload.exp < now) return { ok: false, reason: 'token expired' }

  const audMatch = payload.aud
    ? Array.isArray(payload.aud)
      ? payload.aud.includes(aud)
      : payload.aud === aud
    : false
  if (!audMatch) return { ok: false, reason: 'aud mismatch' }

  if (payload.iss && payload.iss !== `https://${teamDomain}`) {
    return { ok: false, reason: 'iss mismatch' }
  }

  const keys = await getJwks(teamDomain)
  const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  const sig = b64urlToBytes(parts[2])

  for (const key of keys) {
    if (await verifySignature(key, data, sig)) {
      if (!payload.email) return { ok: false, reason: 'no email claim' }
      return { ok: true, email: String(payload.email).toLowerCase() }
    }
  }
  return { ok: false, reason: 'signature invalid' }
}
