/**
 * PAM 二期云同步 API（D5 · Pages Functions + P1 加固）
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
 * P1 加固（审查 I6/S1/S5）：
 *   - 409 仅当 clientVersion < server.version；clientVersion > server.version
 *     （KV 最终一致的 stale read，或云端被重置）→ 接受并跳到 clientVersion + 1，
 *     吸收假冲突并终止清云后的乒乓覆盖
 *   - JSON.parse 包 try/catch，坏 KV 值返回 500 可读错误而非未捕获异常
 *   - PUT body 大小上限 5MB → 413
 *
 * 已知取舍（审查 I5，不在本批修）：KV 无 CAS 且最终一致，「读→比→写」非原子，
 * 近乎同时的双端推送仍可能后写覆盖先写；兜底靠前端冲突覆盖前备份。
 *
 * 环境变量：
 *   CF_ACCESS_TEAM_DOMAIN  Access 团队域名（xxx.cloudflareaccess.com）
 *   CF_ACCESS_AUD          Access Application AUD
 *   PAM_LEDGER             KV namespace 绑定
 */
import { verifyAccessJwt } from '../_lib/accessJwt.js'

const LEDGER_PREFIX = 'ledger:'
const MAX_BODY_BYTES = 5 * 1024 * 1024

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  })
}

/** 坏 KV 值不抛异常，交调用方转 500（审查 S1） */
function parseLedger(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
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

  const ledger = parseLedger(raw)
  if (ledger == null) return json({ error: 'ledger data corrupted' }, 500)

  return json(ledger)
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

  const serialized = JSON.stringify(body.data)
  if (serialized.length > MAX_BODY_BYTES) {
    return json({ error: 'body too large' }, 413)
  }

  const clientVersion = Number.isInteger(body.version) && body.version >= 0 ? body.version : 0
  const key = LEDGER_PREFIX + auth.email
  const now = new Date().toISOString()

  const raw = await context.env.PAM_LEDGER.get(key)
  if (raw != null) {
    const server = parseLedger(raw)
    if (server == null) return json({ error: 'ledger data corrupted' }, 500)

    if (clientVersion < server.version) {
      return json(
        { error: 'conflict', serverVersion: server.version, serverUpdatedAt: server.updatedAt },
        409
      )
    }

    // clientVersion > server.version：stale read（KV 最终一致）或云端被重置——
    // 接受并跳到 clientVersion + 1，既不制造假冲突，也终止清云后的乒乓覆盖
    const next = {
      version: Math.max(server.version, clientVersion) + 1,
      updatedAt: now,
      data: body.data
    }
    await context.env.PAM_LEDGER.put(key, JSON.stringify(next))
    return json({ version: next.version, updatedAt: next.updatedAt })
  }

  // 首次上云（老账本 / 新设备首写）
  const first = { version: 1, updatedAt: now, data: body.data }
  await context.env.PAM_LEDGER.put(key, JSON.stringify(first))
  return json({ version: 1, updatedAt: now })
}
