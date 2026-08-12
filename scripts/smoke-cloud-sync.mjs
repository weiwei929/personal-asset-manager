/**
 * D6 门闩 · 双标签云同步 smoke（模拟）+ v1.08.12 S1' 门闩
 * 用两个独立模块实例模拟「设备 A / 设备 B」+ mock 云端（KV 版乐观锁）：
 *   A 记账 → 防抖推云 → B 启动拉云拿到数据 → 冲突 409 → 用本地/用云端解决
 * S1'：settle 前不抢跑 PUT；hydrate 失败禁推；online → re-settle
 * 运行：node scripts/smoke-cloud-sync.mjs
 */
import assert from 'node:assert/strict'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const EMAIL_KEY = 'ledger:user@example.com'

// ── mock 云端：模拟 functions/api/ledger 的 KV + 乐观锁 ──
const cloudKV = new Map()
let putCount = 0
async function mockFetch(url, opts = {}) {
  const method = (opts.method || 'GET').toUpperCase()
  // 支持 AbortSignal（P0-5）
  if (opts.signal?.aborted) {
    const err = new Error('The operation was aborted')
    err.name = 'AbortError'
    throw err
  }
  if (method === 'GET') {
    const raw = cloudKV.get(EMAIL_KEY)
    if (!raw) return { status: 404, ok: false, json: async () => ({ error: 'not found' }) }
    return { status: 200, ok: true, type: 'basic', json: async () => JSON.parse(raw) }
  }
  if (method === 'PUT') {
    putCount++
    const body = JSON.parse(opts.body)
    const raw = cloudKV.get(EMAIL_KEY)
    const now = new Date().toISOString()
    if (raw) {
      const server = JSON.parse(raw)
      if (body.version < server.version) {
        return {
          status: 409, ok: false, type: 'basic',
          json: async () => ({ error: 'conflict', serverVersion: server.version, serverUpdatedAt: server.updatedAt })
        }
      }
      const next = { version: Math.max(server.version, body.version) + 1, updatedAt: now, data: body.data }
      cloudKV.set(EMAIL_KEY, JSON.stringify(next))
      return { status: 200, ok: true, type: 'basic', json: async () => ({ version: next.version, updatedAt: next.updatedAt }) }
    }
    const first = { version: 1, updatedAt: now, data: body.data }
    cloudKV.set(EMAIL_KEY, JSON.stringify(first))
    return { status: 200, ok: true, type: 'basic', json: async () => ({ version: 1, updatedAt: now }) }
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

// ═══════════════ S1'：settle 前不抢跑 PUT（B5 / C1） ═══════════════
const lsGate = createLocalStorage()
globalThis.localStorage = lsGate
globalThis.fetch = mockFetch
const putsBeforeSettle = putCount
const devGate = await import('../src/utils/cloudSync.js?browser=gate')
devGate.initSync({}) // 只装 patch，不 settle
assert.equal(devGate.isPushArmed(), false, 'initSync 后闸门应关闭')
lsGate.setItem('pam-bank-accounts', JSON.stringify([{ id: 1, bank: '抢跑银行', balance: 1 }]))
await sleep(2600)
assert.equal(putCount, putsBeforeSettle, 'settle 前不得 PUT')
assert.ok(lsGate.getItem('pam-sync-dirty') != null, '闸门关闭时仍应累积 dirty')
const gateOutcome = await devGate.settleLedger()
assert.equal(gateOutcome, 'empty-cloud', '无云有本地 → empty-cloud')
assert.equal(devGate.isPushArmed(), true, 'empty-cloud 应放开闸门')
await sleep(2600)
assert.ok(putCount > putsBeforeSettle, 'settle 放闸后应补推')
assert.equal(devGate.getLocalVersion(), 1)
devGate.resetSyncState()
console.log('✓ S1\' settle 前不抢跑 PUT；empty-cloud 放闸后补推')

// ── 设备 A：settle 后记账 → 自动推云 ──
cloudKV.clear()
putCount = 0
const lsA = createLocalStorage()
globalThis.localStorage = lsA
globalThis.fetch = mockFetch
const devA = await import('../src/utils/cloudSync.js?browser=A')
devA.initSync({})
await devA.settleLedger()
lsA.setItem('pam-bank-accounts', JSON.stringify([{ id: 1, bank: 'A银行', balance: 1000 }]))
await sleep(2600)

let cloud = JSON.parse(cloudKV.get(EMAIL_KEY))
assert.equal(cloud.version, 1, 'A 首次推云应 version=1')
assert.deepEqual(cloud.data['pam-bank-accounts'], [{ id: 1, bank: 'A银行', balance: 1000 }])
assert.equal(devA.getLocalVersion(), 1, 'A 本地版本应更新为 1')
console.log('✓ A 记账自动推云 → 云端 v1')

// ── 设备 B：新设备启动 → settle 拉云合入 ──
const lsB = createLocalStorage()
globalThis.localStorage = lsB
let conflictInfo = null
const devB = await import('../src/utils/cloudSync.js?browser=B')
devB.initSync({ onConflict: (sv, sa) => { conflictInfo = { sv, sa } } })
const bOutcome = await devB.settleLedger()
assert.equal(bOutcome, 'hydrated', 'B 应 hydrated')
assert.equal(devB.getLocalVersion(), 1, 'B 拉云后本地版本=1')
assert.deepEqual(
  JSON.parse(lsB.getItem('pam-bank-accounts')),
  [{ id: 1, bank: 'A银行', balance: 1000 }],
  'B 本地应合入 A 的账本数据'
)
assert.equal(devB.isPushArmed(), true, 'hydrated 应放开闸门')
console.log('✓ B settle 拉云 → 本地合入 A 数据')

// ── 冲突：A 先改推 v2，B 带 v1 推 → 409 ──
lsA.setItem('pam-bank-accounts', JSON.stringify([{ id: 1, bank: 'A银行', balance: 2000 }]))
await sleep(2600)
cloud = JSON.parse(cloudKV.get(EMAIL_KEY))
assert.equal(cloud.version, 2, 'A 二次推云应 version=2')

lsB.setItem('pam-bank-movements', JSON.stringify([{ id: 1, desc: 'B 离线记的流水' }]))
await sleep(2600)
assert.ok(conflictInfo, 'B 应收到 409 冲突回调')
assert.equal(conflictInfo.sv, 2, '冲突回调应带 serverVersion=2')
assert.equal(devB.isPushArmed(), false, '冲突后闸门应关闭')
console.log('✓ 冲突检测：B 带 v1 推被 409，收到 serverVersion=2；闸门关闭')

// ── 冲突解决 ①：用本地覆盖云端（豁免闸门）──
await devB.resolveConflictUseLocal(conflictInfo.sv)
cloud = JSON.parse(cloudKV.get(EMAIL_KEY))
assert.equal(cloud.version, 3, '用本地解决后云端应 version=3')
assert.deepEqual(cloud.data['pam-bank-movements'], [{ id: 1, desc: 'B 离线记的流水' }])
assert.equal(devB.isPushArmed(), true, '冲突解决后应放开闸门')
console.log('✓ 冲突解决「用本地」→ 云端被 B 数据覆盖（闸门豁免）')

// ── 冲突解决 ②：用云端覆盖本地 ──
lsB.setItem('pam-bank-accounts', JSON.stringify([{ id: 9, bank: 'B乱改', balance: 999 }]))
await sleep(100) // 允许置 dirty，但先解决冲突路径
await devB.resolveConflictUseCloud()
assert.deepEqual(
  JSON.parse(lsB.getItem('pam-bank-accounts')),
  [{ id: 1, bank: 'A银行', balance: 1000 }],
  '用云端解决后 B 本地应回到云端数据'
)
assert.equal(devB.getLocalVersion(), 3)
console.log('✓ 冲突解决「用云端」→ B 本地被云端覆盖')

// ═══════════════ P1：F1 断网补推 + 前台拉取不写存储 ═══════════════
await sleep(2600)
cloud = JSON.parse(cloudKV.get(EMAIL_KEY))
assert.equal(cloud.version, 4, '旧用例残留推送落定后云端应为 v4')

let online = true
let hangGet = false
const realFetch = globalThis.fetch
globalThis.fetch = async (url, opts) => {
  if (opts?.signal?.aborted) {
    const err = new Error('The operation was aborted')
    err.name = 'AbortError'
    throw err
  }
  if (!online) throw new TypeError('Failed to fetch (offline simulated)')
  if (hangGet && (opts?.method || 'GET').toUpperCase() === 'GET') {
    await new Promise((_, reject) => {
      const t = setTimeout(() => {
        const err = new Error('hang')
        err.name = 'HangError'
        reject(err)
      }, 60000)
      opts.signal?.addEventListener('abort', () => {
        clearTimeout(t)
        const err = new Error('The operation was aborted')
        err.name = 'AbortError'
        reject(err)
      })
    })
  }
  return realFetch(url, opts)
}

// ── F1：断网记账 → settle（online）补推 ──
const lsC = createLocalStorage()
globalThis.localStorage = lsC
const devC = await import('../src/utils/cloudSync.js?browser=C')
devC.initSync({})
await devC.settleLedger()
assert.equal(devC.getLocalVersion(), 4, 'C 启动应拉到云端 v4')

online = false
lsC.setItem('pam-bank-movements', JSON.stringify([{ id: 99, desc: 'C 离线记的一笔' }]))
await sleep(2600)
assert.ok(lsC.getItem('pam-sync-dirty') != null, '断网记账后应置 dirty 标记')

online = true
const cOutcome = await devC.settleLedger() // C1：online → re-settle，不直接 push
assert.equal(cOutcome, 'in-sync', `C settle 应为 in-sync，实得 ${cOutcome}`)
assert.equal(devC.isPushArmed(), true, 'in-sync 应放开闸门')
await sleep(2600)
cloud = JSON.parse(cloudKV.get(EMAIL_KEY))
assert.ok(
  cloud.data['pam-bank-movements']?.some((m) => m.id === 99),
  '联网 settle 后 C 的离线流水应补推上云'
)
assert.equal(lsC.getItem('pam-sync-dirty'), null, '补推成功后 dirty 应清除')
console.log('✓ F1 断网记账 → settle 补推上云，dirty 清除')

// ── 前台拉取：命中新数据 → 不写存储、只回调 onRemoteAhead ──
const lsD = createLocalStorage()
globalThis.localStorage = lsD
let remoteAhead = null
let dHydrated = 0
const devD = await import('../src/utils/cloudSync.js?browser=D')
devD.initSync({
  onRemoteAhead: (v, ua) => { remoteAhead = { v, ua } },
  onHydrated: () => { dHydrated++ }
})
await devD.settleLedger()
assert.equal(devD.getLocalVersion(), 5, 'D 启动应拉到云端 v5')

await devA.settleLedger()
await sleep(100)
lsA.setItem('pam-bank-accounts', JSON.stringify([{ id: 1, bank: 'A银行', balance: 3000 }]))
await sleep(2600)
cloud = JSON.parse(cloudKV.get(EMAIL_KEY))
assert.equal(cloud.version, 6, 'A 推云后应为 v6')

const before = lsD.getItem('pam-bank-accounts')
await devD.settleLedger({ foreground: true })
await sleep(100)

assert.equal(devD.getLocalVersion(), 5, '前台拉取不应更新本地版本')
assert.equal(lsD.getItem('pam-bank-accounts'), before, '前台拉取不应改写 localStorage')
assert.ok(remoteAhead, '前台拉取应回调 onRemoteAhead')
assert.equal(dHydrated, 1, '前台拉取不应触发 hydrate（仅启动那次）')
console.log('✓ 前台拉取：只提示不写存储，版本不动')

// ═══════════════ S1'：hydrate 失败禁推（P0-4 / B5） ═══════════════
const lsE = createLocalStorage()
globalThis.localStorage = lsE
let hydrateFailed = false
const putsBeforeHydrateFail = putCount
// 先写入本机缓存（patch 未装，不置 dirty），再 initSync
lsE.setItem('pam-bank-accounts', JSON.stringify([{ id: 1, bank: '旧缓存', balance: 1 }]))
lsE.setItem('pam-sync-meta', JSON.stringify({ version: 1, updatedAt: '2020-01-01' }))
const devE = await import('../src/utils/cloudSync.js?browser=E')
devE.initSync({ onHydrateFailed: () => { hydrateFailed = true } })
// 云端更高版本 + 非法 data → 应走 hydrate 而非 conflict
cloudKV.set(EMAIL_KEY, JSON.stringify({
  version: 99,
  updatedAt: new Date().toISOString(),
  data: null
}))
const eOutcome = await devE.settleLedger()
assert.equal(eOutcome, 'hydrate-failed', '非法 payload 应为 hydrate-failed')
assert.equal(hydrateFailed, true, '应回调 onHydrateFailed')
assert.equal(devE.isPushArmed(), false, 'hydrate 失败后闸门关闭')
assert.equal(devE.isNeedRepull(), true, '应置 needRepull')
assert.equal(devE.getLocalVersion(), 1, '失败不得推进本地 version')
lsE.setItem('pam-bank-movements', JSON.stringify([{ id: 7, desc: '失败后仍记账' }]))
await sleep(2600)
assert.equal(putCount, putsBeforeHydrateFail, 'hydrate 失败期间禁止 PUT')
console.log('✓ S1\' hydrate 失败不写 version、禁推')

// ═══════════════ S1'：fetch 超时 → offline（P0-5） ═══════════════
const lsF = createLocalStorage()
globalThis.localStorage = lsF
hangGet = true
online = true
const devF = await import('../src/utils/cloudSync.js?browser=F')
devF.initSync({})
const t0 = Date.now()
const fOutcome = await devF.settleLedger()
const elapsed = Date.now() - t0
hangGet = false
assert.equal(fOutcome, 'offline', '超时应走 offline')
assert.ok(elapsed < 15000, `超时应在约 9s 内返回，实际 ${elapsed}ms`)
assert.equal(devF.isPushArmed(), false, '超时后闸门保持关闭')
console.log('✓ S1\' fetch 超时 → offline，闸门关闭（', elapsed, 'ms）')

// ── resetSyncState 关闸门且不清 pam-cloud-bound（C2 钩子）──
lsF.setItem('pam-cloud-bound', JSON.stringify({ lastVersion: 1 }))
devF.resetSyncState()
assert.equal(devF.isPushArmed(), false)
assert.ok(lsF.getItem('pam-cloud-bound') != null, 'resetSyncState 不得清除 pam-cloud-bound')
console.log('✓ resetSyncState 关闸门且保留 pam-cloud-bound')

devC.resetSyncState()
devGate.resetSyncState()
devE.resetSyncState()
devF.resetSyncState()

console.log('\nOK cloud-sync smoke: 全部通过（含 S1\' 闸门 / hydrate 失败禁推 / fetch 超时）')
