/**
 * D5 门闩 · API smoke（模拟 JWT）
 * 本地验证 functions/api/_lib/accessJwt.js 的校验逻辑：
 * 生成测试 RSA 密钥对 → stub fetch 返回 mock JWKS → 签发各类 JWT → 断言结果。
 * 运行：node scripts/smoke-access-jwt.mjs
 */
import assert from 'node:assert/strict'
import { verifyAccessJwt } from '../functions/api/_lib/accessJwt.js'

const TEAM_DOMAIN = 'test-team.cloudflareaccess.com'
const AUD = 'test-aud-0000'
const EMAIL = 'user@example.com'

// 1. 测试密钥对 + mock JWKS
const { publicKey, privateKey } = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['sign', 'verify']
)
const jwkPub = await crypto.subtle.exportKey('jwk', publicKey)
const MOCK_JWKS = { keys: [{ kty: 'RSA', n: jwkPub.n, e: jwkPub.e, alg: 'RS256', use: 'sig', kid: 'test-kid' }] }

const realFetch = globalThis.fetch
globalThis.fetch = async (url) => {
  if (String(url).includes('/cdn-cgi/access/certs')) {
    return { ok: true, status: 200, json: async () => MOCK_JWKS }
  }
  return realFetch(url)
}

// 2. JWT 工具（RS256 签名）
const b64url = (bytes) => Buffer.from(bytes).toString('base64url')
const signJwt = async (overrides = {}) => {
  const header = { alg: 'RS256', kid: 'test-kid', typ: 'JWT' }
  const body = {
    aud: AUD,
    email: EMAIL,
    exp: Math.floor(Date.now() / 1000) + 3600,
    iss: `https://${TEAM_DOMAIN}`,
    iat: Math.floor(Date.now() / 1000) - 10,
    ...overrides
  }
  const data = `${b64url(Buffer.from(JSON.stringify(header)))}.${b64url(Buffer.from(JSON.stringify(body)))}`
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(data))
  return `${data}.${b64url(Buffer.from(sig))}`
}
const makeRequest = (token) =>
  new Request('https://flow.mgtv.dev/api/ledger', {
    headers: token ? { 'Cf-Access-Jwt-Assertion': token } : {}
  })

// 3. 用例 6 条
let r = await verifyAccessJwt(makeRequest(null), { teamDomain: TEAM_DOMAIN, aud: AUD })
assert.equal(r.ok, false); assert.match(r.reason, /missing/)

r = await verifyAccessJwt(makeRequest(await signJwt({})), { teamDomain: TEAM_DOMAIN, aud: AUD })
assert.equal(r.ok, true); assert.equal(r.email, EMAIL)

r = await verifyAccessJwt(makeRequest(await signJwt({ exp: Math.floor(Date.now() / 1000) - 60 })), { teamDomain: TEAM_DOMAIN, aud: AUD })
assert.equal(r.ok, false); assert.match(r.reason, /expired/)

r = await verifyAccessJwt(makeRequest(await signJwt({ aud: 'other-aud' })), { teamDomain: TEAM_DOMAIN, aud: AUD })
assert.equal(r.ok, false); assert.match(r.reason, /aud/)

r = await verifyAccessJwt(makeRequest(await signJwt({ iss: 'https://evil.example.com' })), { teamDomain: TEAM_DOMAIN, aud: AUD })
assert.equal(r.ok, false); assert.match(r.reason, /iss/)

{
  const good = await signJwt({})
  const [h, p] = good.split('.')
  const payload = JSON.parse(Buffer.from(p, 'base64url').toString())
  payload.email = 'hacker@example.com'
  const tampered = `${h}.${b64url(Buffer.from(JSON.stringify(payload)))}.${good.split('.')[2]}`
  r = await verifyAccessJwt(makeRequest(tampered), { teamDomain: TEAM_DOMAIN, aud: AUD })
  assert.equal(r.ok, false); assert.match(r.reason, /signature/)
}

console.log('OK access-jwt smoke: 6/6 passed (no-token / valid / expired / aud / iss / tampered)')