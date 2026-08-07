/**
 * PAM 二期云同步 API（D5 · Pages Functions）
 *
 * 路由：/api/ledger
 *   GET → 读 KV：200 { version, updatedAt, data } | 404（未建账）
 *   PUT → 写 KV（乐观锁）：body { version, data }
 *         409 { serverVersion, serverUpdatedAt }（本地落后，冲突）
 *         200 { version, updatedAt }
 *
 * 全部先校验 Cloudflare Access JWT（Cf-Access-Jwt-Assertion）；
 * 无 / 校验失败 → 401。身份 = email claim，键 = `ledger:{email}`。
 * 破坏性 DELETE 不做（防误删；清云数据走 CF 控制台）。
 *
 * 环境变量：
 *   CF_ACCESS_TEAM_DOMAIN  Access 团队域名（xxx.cloudflareaccess.com）
 *   CF_ACCESS_AUD          Access Application AUD
 *   PAM_LEDGER             KV namespace 绑定
 */
import { verifyAccessJwt } from '../_lib/accessJwt.js'

const LEDGER_PREFIX = 'ledger:'

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  })
}

async function requireAuth(context) {
  const { CF_ACCESS_TEAM_DOMAIN: teamDomain, CF_ACCESS_AUD: aud } = context.env
  if (!teamDomain || !aud) {
    return { ok: false, reason: 'server not configured (missing CF_ACCESS_TEAM_DOMAIN / CF_ACCESS_AUD)' }
  }
  return verifyAccessJwt(context.request, { teamDomain, aud })
}

export async function onRequestGet(context) {
  const auth = await requireAuth(context)
  if (!auth.ok) return json({ error: auth.reason }, 401)

  const key = LEDGER_PREFIX + auth.email
  const raw = await context.env.PAM_LEDGER.get(key)
  if (raw == null) return json({ error: 'not found' }, 404)

  return json(JSON.parse(raw))
}

export async function onRequestPut(context) {
  const auth = await requireAuth(context)
  if (!auth.ok) return json({ error: auth.reason }, 401)

  let body
  try {
    body = await context.request.json()
  } catch {
    return json({ error: 'bad json body' }, 400)
  }
  if (body == null || typeof body !== 'object' || body.data == null || typeof body.data !== 'object') {
    return json({ error: 'body must be { version: number, data: object }' }, 400)
  }

  const clientVersion = Number.isInteger(body.version) && body.version >= 0 ? body.version : 0
  const key = LEDGER_PREFIX + auth.email
  const now = new Date().toISOString()

  const raw = await context.env.PAM_LEDGER.get(key)
  if (raw != null) {
    const server = JSON.parse(raw)
    if (clientVersion < server.version) {
      return json(
        { error: 'conflict', serverVersion: server.version, serverUpdatedAt: server.updatedAt },
        409
      )
    }
    const next = { version: server.version + 1, updatedAt: now, data: body.data }
    await context.env.PAM_LEDGER.put(key, JSON.stringify(next))
    return json({ version: next.version, updatedAt: next.updatedAt })
  }

  // 首次上云（老账本 / 新设备首写）
  const first = { version: 1, updatedAt: now, data: body.data }
  await context.env.PAM_LEDGER.put(key, JSON.stringify(first))
  return json({ version: 1, updatedAt: now })
}