/**
 * Cloudflare Access JWT 校验（Pages Functions · 零依赖）
 *
 * 校验请求头 `Cf-Access-Jwt-Assertion`：
 *  1. RS256 验签（JWKS 从团队域名 /cdn-cgi/access/certs 拉取，缓存 1h；
 *     验签失败时带 60s 冷却强制刷新一次——应对签名密钥轮换）
 *  2. aud 包含 Access Application AUD
 *  3. exp 未过期；nbf / iat 校验（60s 时钟偏移容忍）
 *  4. iss 必须为团队域名（P1 起强制，缺失即拒绝）
 *  5. 返回 email claim（小写）作为身份
 *
 * P1 加固（审查 S2/S3/S4）：JWKS 强制刷新 + 冷却、iss 强制、nbf/iat。
 * 冷却的作用：垃圾 token 无法把每次请求都放大成一次 JWKS 回源。
 *
 * 文档：https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
 */

const JWKS_CACHE_TTL_MS = 60 * 60 * 1000 // 1 小时
const JWKS_FORCED_REFRESH_COOLDOWN_MS = 60 * 1000 // 强制刷新冷却（防垃圾 token 放大回源）
const CLOCK_SKEW_TOLERANCE_S = 60

let jwksCache = { at: 0, keys: [] }
let lastForcedRefreshAt = 0

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

async function verifyWithKeys(keys, data, sig) {
  for (const key of keys) {
    if (await verifySignature(key, data, sig)) return true
  }
  return false
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
  if (payload.nbf && payload.nbf > now + CLOCK_SKEW_TOLERANCE_S) {
    return { ok: false, reason: 'token not yet valid' }
  }
  if (payload.iat && payload.iat > now + CLOCK_SKEW_TOLERANCE_S) {
    return { ok: false, reason: 'iat in future' }
  }

  const audMatch = payload.aud
    ? Array.isArray(payload.aud)
      ? payload.aud.includes(aud)
      : payload.aud === aud
    : false
  if (!audMatch) return { ok: false, reason: 'aud mismatch' }

  // P1：iss 强制（Access 必带；缺失视为不匹配）
  if (payload.iss !== `https://${teamDomain}`) {
    return { ok: false, reason: 'iss mismatch' }
  }

  const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  const sig = b64urlToBytes(parts[2])

  let verified = await verifyWithKeys(await getJwks(teamDomain), data, sig)
  if (!verified && Date.now() - lastForcedRefreshAt > JWKS_FORCED_REFRESH_COOLDOWN_MS) {
    // 可能是签名密钥轮换导致缓存失效：带冷却地强制刷新一次再验
    lastForcedRefreshAt = Date.now()
    const keys = await fetchJwks(teamDomain)
    jwksCache = { at: Date.now(), keys }
    verified = await verifyWithKeys(keys, data, sig)
  }
  if (!verified) return { ok: false, reason: 'signature invalid' }

  if (!payload.email) return { ok: false, reason: 'no email claim' }
  return { ok: true, email: String(payload.email).toLowerCase() }
}
