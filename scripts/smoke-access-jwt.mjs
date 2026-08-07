/**
 * D5 门闩 · API smoke（模拟 JWT）+ P1 加固回归
 * 本地验证 functions/api/_lib/accessJwt.js 的校验逻辑：
 * 生成测试 RSA 密钥对 → stub fetch 返回 mock JWKS → 签发各类 JWT → 断言结果。
 * 运行：node scripts/smoke-access-jwt.mjs
 *
 * 用例顺序有意为之：强制刷新 JWKS 带 60s 冷却，全进程只允许触发一次，
 * 所以「密钥轮换」（要求刷新发生）必须排在「篡改签名」（要求刷新被冷却挡下）之前。
 * 其余用例都在验签之前返回，不会消耗冷却额度。
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
let MOCK_JWKS = { keys: [{ kty: 'RSA', n: jwkPub.n, e: jwkPub.e, alg: 'RS256', use: 'sig', kid: 'test-kid' }] }
let jwksFetchCount = 0

const realFetch = globalThis.fetch
globalThis.fetch = async (url) => {
  if (String(url).includes('/cdn-cgi/access/certs')) {
    jwksFetchCount++
    return { ok: true, status: 200, json: async () => MOCK_JWKS }
  }
  return realFetch(url)
}

// 2. JWT 工具（RS256 签名）
const b64url = (bytes) => Buffer.from(bytes).toString('base64url')
const signJwt = async (overrides = {}, key = privateKey) => {
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
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(data))
  return `${data}.${b64url(Buffer.from(sig))}`
}
const makeRequest = (token) =>
  new Request('https://flow.mgtv.dev/api/ledger', {
    headers: token ? { 'Cf-Access-Jwt-Assertion': token } : {}
  })

// ── 3. 原有 5 条（D5） ───────────────────────────────────────
// 1) 无 token
let r = await verifyAccessJwt(makeRequest(null), { teamDomain: TEAM_DOMAIN, aud: AUD })
assert.equal(r.ok, false); assert.match(r.reason, /missing/)

// 2) 正常 token（顺便把旧 key 灌进 JWKS 缓存，供后面的轮换用例用）
r = await verifyAccessJwt(makeRequest(await signJwt({})), { teamDomain: TEAM_DOMAIN, aud: AUD })
assert.equal(r.ok, true); assert.equal(r.email, EMAIL)

// 3) 过期
r = await verifyAccessJwt(makeRequest(await signJwt({ exp: Math.floor(Date.now() / 1000) - 60 })), { teamDomain: TEAM_DOMAIN, aud: AUD })
assert.equal(r.ok, false); assert.match(r.reason, /expired/)

// 4) aud 不匹配
r = await verifyAccessJwt(makeRequest(await signJwt({ aud: 'other-aud' })), { teamDomain: TEAM_DOMAIN, aud: AUD })
assert.equal(r.ok, false); assert.match(r.reason, /aud/)

// 5) iss 是别人的团队域名
r = await verifyAccessJwt(makeRequest(await signJwt({ iss: 'https://evil.example.com' })), { teamDomain: TEAM_DOMAIN, aud: AUD })
assert.equal(r.ok, false); assert.match(r.reason, /iss/)

// ── 4. P1 新增：S3 iss 强制 / S4 nbf·iat / S2 JWKS 强制刷新（带冷却） ──
// 6) iss 缺失 → 拒绝（P1 前「存在才校验」会放行）
r = await verifyAccessJwt(makeRequest(await signJwt({ iss: undefined })), { teamDomain: TEAM_DOMAIN, aud: AUD })
assert.equal(r.ok, false); assert.match(r.reason, /iss/)

// 7) nbf 在未来（超出 60s 容忍）→ 拒绝
r = await verifyAccessJwt(makeRequest(await signJwt({ nbf: Math.floor(Date.now() / 1000) + 120 })), { teamDomain: TEAM_DOMAIN, aud: AUD })
assert.equal(r.ok, false); assert.match(r.reason, /not yet valid/)

// 8) iat 在未来（超出 60s 容忍）→ 拒绝
r = await verifyAccessJwt(makeRequest(await signJwt({ iat: Math.floor(Date.now() / 1000) + 120 })), { teamDomain: TEAM_DOMAIN, aud: AUD })
assert.equal(r.ok, false); assert.match(r.reason, /iat in future/)

// 9) 签名密钥轮换（S2）：缓存里是旧 key，新 key 签发 → 验签失败 → 强制刷新 JWKS → 通过
{
  const countBefore = jwksFetchCount
  const { publicKey: newPub, privateKey: newPriv } = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify']
  )
  const newJwkPub = await crypto.subtle.exportKey('jwk', newPub)
  MOCK_JWKS = { keys: [{ kty: 'RSA', n: newJwkPub.n, e: newJwkPub.e, alg: 'RS256', use: 'sig', kid: 'new-kid' }] }

  r = await verifyAccessJwt(makeRequest(await signJwt({}, newPriv)), { teamDomain: TEAM_DOMAIN, aud: AUD })
  assert.equal(r.ok, true); assert.equal(r.email, EMAIL)
  assert.equal(jwksFetchCount, countBefore + 1, '轮换后应恰好强制刷新一次 JWKS')
}

// 10) 篡改 payload → 验签失败；且冷却期内不再回源 JWKS（S2 冷却，防垃圾 token 放大回源）
{
  const countBefore = jwksFetchCount
  const good = await signJwt({})           // 用旧 key 签，此时 JWKS 里只有新 key
  const [h, p] = good.split('.')
  const payload = JSON.parse(Buffer.from(p, 'base64url').toString())
  payload.email = 'hacker@example.com'
  const tampered = `${h}.${b64url(Buffer.from(JSON.stringify(payload)))}.${good.split('.')[2]}`
  r = await verifyAccessJwt(makeRequest(tampered), { teamDomain: TEAM_DOMAIN, aud: AUD })
  assert.equal(r.ok, false); assert.match(r.reason, /signature/)
  assert.equal(jwksFetchCount, countBefore, '60s 冷却内不应重复回源 JWKS')
}

console.log('OK access-jwt smoke: 10/10 passed (no-token / valid / expired / aud / iss / iss-missing / nbf / iat / 密钥轮换强刷 / 篡改+冷却)')
