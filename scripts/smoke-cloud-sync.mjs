/**
 * D6 门闩 · 双标签云同步 smoke（模拟）
 * 用两个独立模块实例模拟「设备 A / 设备 B」+ mock 云端（KV 版乐观锁）：
 *   A 记账 → 防抖推云 → B 启动拉云拿到数据 → 冲突 409 → 用本地/用云端解决
 * 运行：node scripts/smoke-cloud-sync.mjs
 */
import assert from 'node:assert/strict'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const EMAIL_KEY = 'ledger:user@example.com'

// ── mock 云端：模拟 functions/api/ledger 的 KV + 乐观锁 ──
const cloudKV = new Map()
async function mockFetch(url, opts = {}) {
  const method = (opts.method || 'GET').toUpperCase()
  if (method === 'GET') {
    const raw = cloudKV.get(EMAIL_KEY)
    if (!raw) return { status: 404, ok: false, json: async () => ({ error: 'not found' }) }
    return { status: 200, ok: true, json: async () => JSON.parse(raw) }
  }
  if (method === 'PUT') {
    const body = JSON.parse(opts.body)
    const raw = cloudKV.get(EMAIL_KEY)
    const now = new Date().toISOString()
    if (raw) {
      const server = JSON.parse(raw)
      if (body.version < server.version) {
        return {
          status: 409, ok: false,
          json: async () => ({ error: 'conflict', serverVersion: server.version, serverUpdatedAt: server.updatedAt })
        }
      }
      const next = { version: server.version + 1, updatedAt: now, data: body.data }
      cloudKV.set(EMAIL_KEY, JSON.stringify(next))
      return { status: 200, ok: true, json: async () => ({ version: next.version, updatedAt: next.updatedAt }) }
    }
    const first = { version: 1, updatedAt: now, data: body.data }
    cloudKV.set(EMAIL_KEY, JSON.stringify(first))
    return { status: 200, ok: true, json: async () => ({ version: 1, updatedAt: now }) }
  }
  throw new Error(`unexpected method ${method}`)
}

// ── mock localStorage（每台"设备"独立） ──
function createLocalStorage() {
  const store = new Map()
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)) },
    removeItem: (k) => { store.delete(k) },
    _store: store
  }
}

// ── 设备 A：记账 → 自动推云 ──
const lsA = createLocalStorage()
globalThis.localStorage = lsA
globalThis.fetch = mockFetch
const devA = await import('../src/utils/cloudSync.js?browser=A')
devA.initSync({})
lsA.setItem('pam-bank-accounts', JSON.stringify([{ id: 1, bank: 'A银行', balance: 1000 }]))
await sleep(2600) // 等防抖推送

let cloud = JSON.parse(cloudKV.get(EMAIL_KEY))
assert.equal(cloud.version, 1, 'A 首次推云应 version=1')
assert.deepEqual(cloud.data['pam-bank-accounts'], [{ id: 1, bank: 'A银行', balance: 1000 }])
assert.equal(devA.getLocalVersion(), 1, 'A 本地版本应更新为 1')
console.log('✓ A 记账自动推云 → 云端 v1')

// ── 设备 B：新设备启动 → 拉云合入 ──
const lsB = createLocalStorage()
globalThis.localStorage = lsB
let conflictInfo = null
const devB = await import('../src/utils/cloudSync.js?browser=B')
devB.initSync({ onConflict: (sv, sa) => { conflictInfo = { sv, sa } } })
await sleep(800) // 等 B 的启动拉云异步完成
assert.equal(devB.getLocalVersion(), 1, 'B 拉云后本地版本=1')
assert.deepEqual(
  JSON.parse(lsB.getItem('pam-bank-accounts')),
  [{ id: 1, bank: 'A银行', balance: 1000 }],
  'B 本地应合入 A 的账本数据'
)
console.log('✓ B 启动拉云 → 本地合入 A 数据')

// ── 冲突：A 先改推 v2，B 带 v1 推 → 409 ──
lsA.setItem('pam-bank-accounts', JSON.stringify([{ id: 1, bank: 'A银行', balance: 2000 }]))
await sleep(2600)
cloud = JSON.parse(cloudKV.get(EMAIL_KEY))
assert.equal(cloud.version, 2, 'A 二次推云应 version=2')

lsB.setItem('pam-bank-movements', JSON.stringify([{ id: 1, desc: 'B 离线记的流水' }]))
await sleep(2600) // B 带 v1 推 → 409
assert.ok(conflictInfo, 'B 应收到 409 冲突回调')
assert.equal(conflictInfo.sv, 2, '冲突回调应带 serverVersion=2')
console.log('✓ 冲突检测：B 带 v1 推被 409，收到 serverVersion=2')

// ── 冲突解决 ①：用本地覆盖云端 ──
await devB.resolveConflictUseLocal(conflictInfo.sv)
cloud = JSON.parse(cloudKV.get(EMAIL_KEY))
assert.equal(cloud.version, 3, '用本地解决后云端应 version=3')
assert.deepEqual(cloud.data['pam-bank-movements'], [{ id: 1, desc: 'B 离线记的流水' }])
console.log('✓ 冲突解决「用本地」→ 云端被 B 数据覆盖')

// ── 冲突解决 ②：用云端覆盖本地（B 重新选择云端） ──
lsB.setItem('pam-bank-accounts', JSON.stringify([{ id: 9, bank: 'B乱改', balance: 999 }])) // 本地再乱改
await devB.resolveConflictUseCloud()
assert.deepEqual(
  JSON.parse(lsB.getItem('pam-bank-accounts')),
  [{ id: 1, bank: 'A银行', balance: 1000 }],
  '用云端解决后 B 本地应回到云端数据（上一步已用本地覆盖云端，故为 1000）'
)
assert.equal(devB.getLocalVersion(), 3)
console.log('✓ 冲突解决「用云端」→ B 本地被云端覆盖')

console.log('\nOK cloud-sync smoke: 全部通过（A 推云 / B 拉云 / 409 冲突 / 双向解决）')