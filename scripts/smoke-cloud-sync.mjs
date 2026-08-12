/**
 * D6 门闩 · 双标签云同步 smoke（模拟）+ v1.08.12 S1' / S2' / S4' 门闩
 * 用两个独立模块实例模拟「设备 A / 设备 B」+ mock 云端（KV 版乐观锁）：
 *   A 记账 → 防抖推云 → B 启动拉云拿到数据 → 冲突 409 → 用本地/用云端解决
 * S1'：settle 前不抢跑 PUT；hydrate 失败禁推；online → re-settle
 * S2'：云优先 hydrate；dirty 不跟云；无指纹静默跟云；empty-cloud 补推；hydrate 回滚；冲突备份恢复
 * S4'：pam-cloud-bound 写入；普通/安全退出分路；resetSyncState 保留 bound；idle 源码门闩
 * 运行：node scripts/smoke-cloud-sync.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { ALL_CLEARABLE_KEYS, STORAGE_KEYS, PRESERVED_ON_RESET_KEYS } from '../src/constants/storageKeys.js'

const __smokeDir = dirname(fileURLToPath(import.meta.url))
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

// ═══════════════ S4' / M8'：pam-cloud-bound 写入 + 退出分路 ═══════════════

// B2：键归属
assert.ok(!ALL_CLEARABLE_KEYS.includes(STORAGE_KEYS.CLOUD_BOUND), 'CLOUD_BOUND 不得进 ALL_CLEARABLE_KEYS')
assert.ok(PRESERVED_ON_RESET_KEYS.includes(STORAGE_KEYS.CLOUD_BOUND), 'CLOUD_BOUND 应在 PRESERVED 清单')
console.log('✓ S4\' B2：pam-cloud-bound 不进 ALL_CLEARABLE_KEYS，在 PRESERVED')

// 成功 PUT / settle → setLocalVersion 同处写 bound
cloudKV.clear()
putCount = 0
const lsS4 = createLocalStorage()
globalThis.localStorage = lsS4
online = true
hangGet = false
const devS4 = await import('../src/utils/cloudSync.js?browser=S4')
devS4.initSync({})
await devS4.settleLedger() // empty-cloud
assert.equal(lsS4.getItem('pam-cloud-bound'), null, '未成功同步前不应有 bound')
lsS4.setItem('pam-bank-accounts', JSON.stringify([{ id: 1, bank: 'S4银行', balance: 42 }]))
await sleep(2600)
assert.equal(devS4.getLocalVersion(), 1)
const boundAfterPush = JSON.parse(lsS4.getItem('pam-cloud-bound') || 'null')
assert.ok(boundAfterPush, '成功 PUT 后应写入 pam-cloud-bound')
assert.equal(boundAfterPush.lastVersion, 1, 'bound.lastVersion 应对齐')
assert.ok(boundAfterPush.lastSyncedAt, 'bound 应含 lastSyncedAt')
console.log('✓ S4\' 成功推送写入 pam-cloud-bound')

// in-sync settle 也应刷新 bound
const boundBeforeSettle = lsS4.getItem('pam-cloud-bound')
await sleep(10)
const s4InSync = await devS4.settleLedger()
assert.equal(s4InSync, 'in-sync')
const boundAfterSettle = JSON.parse(lsS4.getItem('pam-cloud-bound') || 'null')
assert.ok(boundAfterSettle?.lastVersion === 1)
assert.ok(lsS4.getItem('pam-cloud-bound') != null)
console.log('✓ S4\' in-sync settle 保持/刷新 pam-cloud-bound（prev=', !!boundBeforeSettle, '）')

// 普通退出 wipe：清账本键、保留 bound
const { wipeLedgerKeepCloudBound, wipeLedgerClearCloudBound } = await import('../src/utils/ledgerWipe.js?browser=S4wipe')
lsS4.setItem('pam-opening-balance', JSON.stringify({ date: '2026-01-01', completedAt: '2026-01-01T00:00:00Z' }))
lsS4.setItem('pam-auth', JSON.stringify({ salt: 'x', hash: 'y' }))
lsS4.setItem('theme-settings', JSON.stringify({ mode: 'light' }))
const keep = wipeLedgerKeepCloudBound()
assert.equal(keep.success, true)
devS4.resetSyncState() // 单测多实例：取消 patched 实例上残留定时器（生产为单例）
assert.equal(devS4.isLedgerCacheWiped(), true, '普通退出应清账本业务键')
assert.ok(lsS4.getItem('pam-cloud-bound') != null, '普通退出必须保留 pam-cloud-bound')
assert.ok(lsS4.getItem('pam-auth') != null, '普通退出保留口令')
assert.ok(lsS4.getItem('theme-settings') != null, '普通退出保留主题')
assert.equal(lsS4.getItem('pam-sync-meta'), null, 'wipe 后 sync-meta 应清')
console.log('✓ S4\' 普通退出 wipe：清账本、保留 pam-cloud-bound')

// 离线门闸：offline + bound + 无期初 → block
assert.equal(
  devS4.shouldBlockEmptyLedgerOnboarding('offline'),
  true,
  '离线+bound+无期初应禁止建账'
)
assert.equal(devS4.shouldBlockEmptyLedgerOnboarding('in-sync'), false)
lsS4.setItem('pam-opening-balance', JSON.stringify({ date: '2026-01-01', completedAt: 'x' }))
assert.equal(devS4.shouldBlockEmptyLedgerOnboarding('offline'), false, '已有期初则不拦截')
lsS4.removeItem('pam-opening-balance')
console.log('✓ S4\' 离线绑定门闸 shouldBlockEmptyLedgerOnboarding')

// 安全退出 wipe：清 bound
// 先恢复 bound（模拟仍绑定）
devS4.writeCloudBoundMark({ lastVersion: 9, lastSyncedAt: '2026-08-12T00:00:00Z' })
lsS4.setItem('pam-bank-accounts', JSON.stringify([{ id: 2 }]))
const clear = wipeLedgerClearCloudBound()
assert.equal(clear.success, true)
devS4.resetSyncState()
assert.equal(devS4.isLedgerCacheWiped(), true)
assert.equal(lsS4.getItem('pam-cloud-bound'), null, '安全退出必须清除 pam-cloud-bound')
assert.equal(devS4.shouldBlockEmptyLedgerOnboarding('offline'), false, '无 bound 则不拦')
console.log('✓ S4\' 安全退出 wipe：清账本并清除 pam-cloud-bound')

// resetSyncState 再次确认不清 bound（在 clear 后再写回测）
lsS4.setItem('pam-cloud-bound', JSON.stringify({ lastVersion: 3 }))
devS4.resetSyncState()
assert.ok(lsS4.getItem('pam-cloud-bound') != null, 'C2：resetSyncState 仍不得清 bound')
console.log('✓ S4\' C2：resetSyncState 仍保留 pam-cloud-bound')

// idle logout：源码硬门闩 — 业务路径只调 auth.logout()
const idleSrc = readFileSync(join(__smokeDir, '../src/composables/useIdleLogout.js'), 'utf8')
const idleTick = idleSrc.slice(idleSrc.indexOf('const tick'), idleSrc.indexOf('const start'))
assert.ok(idleTick.includes('auth.logout()'), 'idle tick 应调用 auth.logout()')
assert.ok(!idleTick.includes('wipeLedger'), 'idle tick 不得 wipeLedger')
assert.ok(!idleTick.includes('clearAllData'), 'idle tick 不得 clearAllData')
assert.ok(!idleTick.includes('removeItem'), 'idle tick 不得直接 removeItem')
console.log('✓ S4\' idle logout 源码只清会话、不清账本（P0-2(b)）')

devC.resetSyncState()
devGate.resetSyncState()
devE.resetSyncState()
devF.resetSyncState()
devS4.resetSyncState()

// ═══════════════ S2' / M2'+M4'：云优先 / dirty 不跟云 / 指纹 / empty-cloud / 原子性 / 备份恢复 ═══════════════

cloudKV.clear()
putCount = 0
online = true
hangGet = false

// S2-prime：云优先灌入（无 dirty）
cloudKV.set(EMAIL_KEY, JSON.stringify({
  version: 3,
  updatedAt: '2026-08-12T10:00:00.000Z',
  data: { 'pam-bank-accounts': [{ id: 1, bank: '云端银行', demandBalance: 5000 }] }
}))
const lsS2a = createLocalStorage()
globalThis.localStorage = lsS2a
// 旧缓存、version 落后、无 dirty
lsS2a.setItem('pam-bank-accounts', JSON.stringify([{ id: 9, bank: '旧缓存', demandBalance: 1 }]))
lsS2a.setItem('pam-sync-meta', JSON.stringify({ version: 1, updatedAt: '2020-01-01' }))
const devS2a = await import('../src/utils/cloudSync.js?browser=S2a')
devS2a.initSync({})
const s2Hydrate = await devS2a.settleLedger()
assert.equal(s2Hydrate, 'hydrated', 'S2-prime：无 dirty 应云优先 hydrated')
assert.deepEqual(
  JSON.parse(lsS2a.getItem('pam-bank-accounts')),
  [{ id: 1, bank: '云端银行', demandBalance: 5000 }]
)
assert.equal(devS2a.getLocalVersion(), 3)
console.log('✓ S2\' 云优先灌入（无 dirty → hydrated）')

// S2-prime：dirty 时不跟云 → conflict
const lsS2b = createLocalStorage()
globalThis.localStorage = lsS2b
let s2Conflict = null
lsS2b.setItem('pam-bank-accounts', JSON.stringify([{ id: 2, bank: '本机脏数据', demandBalance: 99 }]))
lsS2b.setItem('pam-sync-meta', JSON.stringify({ version: 1, updatedAt: '2020-01-01' }))
lsS2b.setItem('pam-sync-dirty', '1')
const devS2b = await import('../src/utils/cloudSync.js?browser=S2b')
devS2b.initSync({ onConflict: (sv, sa) => { s2Conflict = { sv, sa } } })
const s2ConflictOutcome = await devS2b.settleLedger()
assert.equal(s2ConflictOutcome, 'conflict', 'S2-prime：dirty + 云更新 → conflict')
assert.ok(s2Conflict, '应回调 onConflict')
assert.deepEqual(
  JSON.parse(lsS2b.getItem('pam-bank-accounts')),
  [{ id: 2, bank: '本机脏数据', demandBalance: 99 }],
  'dirty 时不得静默 hydrate 跟云'
)
assert.equal(devS2b.isPushArmed(), false, 'conflict 闸门关闭')
console.log('✓ S2\' dirty 时不跟云（conflict，本机保留）')

// P1-1：版本相同仅指纹不同 → 不静默跟云（content-anomaly / 保守本机）
cloudKV.set(EMAIL_KEY, JSON.stringify({
  version: 7,
  updatedAt: '2026-08-12T11:00:00.000Z',
  data: { 'pam-bank-accounts': [{ id: 1, bank: '云端副本', demandBalance: 100 }] }
}))
const lsS2c = createLocalStorage()
globalThis.localStorage = lsS2c
lsS2c.setItem('pam-bank-accounts', JSON.stringify([{ id: 1, bank: '本机副本', demandBalance: 200 }]))
lsS2c.setItem('pam-sync-meta', JSON.stringify({ version: 7, updatedAt: '2026-08-12T10:00:00.000Z' }))
// 故意不置 dirty（模拟未标记的本地写入）
const putsBeforeFp = putCount
const devS2c = await import('../src/utils/cloudSync.js?browser=S2c')
devS2c.initSync({})
assert.notEqual(
  devS2c.fingerprintPayload(JSON.parse(lsS2c.getItem('pam-bank-accounts')) ? { 'pam-bank-accounts': JSON.parse(lsS2c.getItem('pam-bank-accounts')) } : {}),
  devS2c.fingerprintPayload({ 'pam-bank-accounts': [{ id: 1, bank: '云端副本', demandBalance: 100 }] }),
  '指纹应不同'
)
const s2Fp = await devS2c.settleLedger()
assert.equal(s2Fp, 'content-anomaly', '同版本指纹不同 → content-anomaly')
assert.deepEqual(
  JSON.parse(lsS2c.getItem('pam-bank-accounts')),
  [{ id: 1, bank: '本机副本', demandBalance: 200 }],
  '不得静默跟云覆盖本机'
)
assert.equal(devS2c.getLocalVersion(), 7, '版本保持对齐但不 hydrate')
await sleep(2600)
assert.ok(putCount > putsBeforeFp, '保守路径应补推本机')
cloud = JSON.parse(cloudKV.get(EMAIL_KEY))
assert.deepEqual(cloud.data['pam-bank-accounts'], [{ id: 1, bank: '本机副本', demandBalance: 200 }])
console.log('✓ S2\' P1-1 同版本指纹不同不静默跟云，保守补推本机')

// P1-3：云端消失（version>0、!dirty、404）→ 补推
cloudKV.clear()
putCount = 0
const lsS2d = createLocalStorage()
globalThis.localStorage = lsS2d
lsS2d.setItem('pam-bank-accounts', JSON.stringify([{ id: 3, bank: '仅存副本', demandBalance: 777 }]))
lsS2d.setItem('pam-sync-meta', JSON.stringify({ version: 4, updatedAt: '2026-08-01T00:00:00.000Z' }))
lsS2d.setItem('pam-cloud-bound', JSON.stringify({ lastVersion: 4, lastSyncedAt: '2026-08-01T00:00:00.000Z' }))
// 无 dirty
assert.equal(lsS2d.getItem('pam-sync-dirty'), null)
const devS2d = await import('../src/utils/cloudSync.js?browser=S2d')
devS2d.initSync({})
const s2Empty = await devS2d.settleLedger()
assert.equal(s2Empty, 'empty-cloud', '云 404 → empty-cloud')
assert.equal(devS2d.getLastEmptyCloudKind(), 'cloud-vanished', '应识别为云端消失')
assert.equal(devS2d.isPushArmed(), true)
await sleep(2600)
assert.ok(cloudKV.has(EMAIL_KEY), '云端消失后应补推仅存副本')
cloud = JSON.parse(cloudKV.get(EMAIL_KEY))
assert.deepEqual(cloud.data['pam-bank-accounts'], [{ id: 3, bank: '仅存副本', demandBalance: 777 }])
console.log('✓ S2\' P1-3 empty-cloud（云端消失）补推')

// P1-3：从未上云分类
cloudKV.clear()
putCount = 0
const lsS2e = createLocalStorage()
globalThis.localStorage = lsS2e
lsS2e.setItem('pam-bank-accounts', JSON.stringify([{ id: 4, bank: '首次', demandBalance: 1 }]))
const devS2e = await import('../src/utils/cloudSync.js?browser=S2e')
devS2e.initSync({})
const s2Never = await devS2e.settleLedger()
assert.equal(s2Never, 'empty-cloud')
assert.equal(devS2e.getLastEmptyCloudKind(), 'never-uploaded')
await sleep(2600)
assert.ok(cloudKV.has(EMAIL_KEY), '从未上云也应补推')
console.log('✓ S2\' P1-3 empty-cloud（从未上云）补推')

// P1-3：身份明确冲突 → 不补推
cloudKV.clear()
putCount = 0
const lsS2id = createLocalStorage()
globalThis.localStorage = lsS2id
lsS2id.setItem('pam-bank-accounts', JSON.stringify([{ id: 5, bank: '旧身份账本', demandBalance: 1 }]))
lsS2id.setItem('pam-cloud-bound', JSON.stringify({
  lastVersion: 2,
  lastSyncedAt: '2026-08-01T00:00:00.000Z',
  emailHash: 'hash-old'
}))
const devS2id = await import('../src/utils/cloudSync.js?browser=S2id')
devS2id.setIdentityHashGetter(() => 'hash-new')
devS2id.initSync({})
const s2Blocked = await devS2id.settleLedger()
assert.equal(s2Blocked, 'identity-blocked', '身份冲突应拦截')
assert.equal(devS2id.isPushArmed(), false)
await sleep(2600)
assert.equal(putCount, 0, '身份冲突不得补推')
devS2id.setIdentityHashGetter(null)
console.log('✓ S2\' P1-3 身份明确冲突时 empty-cloud 不补推')

// P0-4：hydrate 中途失败 → 回滚本机、不写 version
cloudKV.clear()
const lsS2h = createLocalStorage()
globalThis.localStorage = lsS2h
lsS2h.setItem('pam-bank-accounts', JSON.stringify([{ id: 1, bank: '应回滚', demandBalance: 42 }]))
lsS2h.setItem('pam-sync-meta', JSON.stringify({ version: 1, updatedAt: '2020-01-01' }))
const originalData = lsS2h.getItem('pam-bank-accounts')
const putsBeforeAtomic = putCount
let setCount = 0
const rawSet = lsS2h.setItem
lsS2h.setItem = (k, v) => {
  // hydrate 写入业务键时制造中途失败（跳过 sync-meta / dirty / bound）
  if (k === 'pam-bank-accounts' && setCount >= 0) {
    const cloudRaw = cloudKV.get(EMAIL_KEY)
    if (cloudRaw && JSON.parse(cloudRaw).version === 50) {
      setCount++
      if (setCount === 1) throw new Error('simulated mid-hydrate failure')
    }
  }
  return rawSet(k, v)
}
cloudKV.set(EMAIL_KEY, JSON.stringify({
  version: 50,
  updatedAt: new Date().toISOString(),
  data: {
    'pam-bank-accounts': [{ id: 99, bank: '云端新', demandBalance: 1 }],
    'pam-bank-movements': [{ id: 1, desc: '第二键' }]
  }
}))
const devS2h = await import('../src/utils/cloudSync.js?browser=S2h')
let hydrateFailCb = false
devS2h.initSync({ onHydrateFailed: () => { hydrateFailCb = true } })
const s2Atomic = await devS2h.settleLedger()
lsS2h.setItem = rawSet
assert.equal(s2Atomic, 'hydrate-failed', '中途失败 → hydrate-failed')
assert.equal(hydrateFailCb, true)
assert.equal(devS2h.getLocalVersion(), 1, '失败不得推进 version')
assert.equal(devS2h.isNeedRepull(), true)
assert.equal(devS2h.isPushArmed(), false)
assert.equal(lsS2h.getItem('pam-bank-accounts'), originalData, '失败应回滚本机账本')
lsS2h.setItem('pam-bank-movements', JSON.stringify([{ id: 8 }]))
await sleep(2600)
assert.equal(putCount, putsBeforeAtomic, 'hydrate 失败期间禁推')
console.log('✓ S2\' P0-4 hydrate 失败回滚且不写 version、禁推')

// P1-2：冲突备份 + restoreLastDiscardedLedger
cloudKV.clear()
putCount = 0
const lsS2r = createLocalStorage()
globalThis.localStorage = lsS2r
const {
  BACKUP_FORMAT: BF,
  BACKUP_FORMAT_VERSION: BFV
} = await import('../src/utils/ledgerBackup.js?browser=S2rBackup')
const discardedLocal = {
  format: BF,
  formatVersion: BFV,
  app: 'personal-asset-manager',
  exportedAt: new Date().toISOString(),
  note: '用云端覆盖前·本机账本',
  data: { 'pam-bank-accounts': [{ id: 7, bank: '被覆盖本机', demandBalance: 1234 }] }
}
lsS2r.setItem('pam-sync-lastDiscarded', JSON.stringify(discardedLocal))
lsS2r.setItem('pam-bank-accounts', JSON.stringify([{ id: 1, bank: '已用云端', demandBalance: 0 }]))
lsS2r.setItem('pam-sync-meta', JSON.stringify({ version: 2, updatedAt: '2026-08-12T12:00:00.000Z' }))
cloudKV.set(EMAIL_KEY, JSON.stringify({
  version: 2,
  updatedAt: '2026-08-12T12:00:00.000Z',
  data: { 'pam-bank-accounts': [{ id: 1, bank: '已用云端', demandBalance: 0 }] }
}))
const devS2r = await import('../src/utils/cloudSync.js?browser=S2r')
devS2r.initSync({})
await devS2r.settleLedger()
assert.ok(devS2r.getLastDiscardedBackup(), '应能读到 lastDiscarded')
const summary = devS2r.summarizeLedgerData(discardedLocal.data)
assert.equal(summary.entryCount, 1)
assert.equal(summary.totalAssets, 1234)
const restored = devS2r.restoreLastDiscardedLedger()
assert.equal(restored.ok, true)
assert.deepEqual(
  JSON.parse(lsS2r.getItem('pam-bank-accounts')),
  [{ id: 7, bank: '被覆盖本机', demandBalance: 1234 }],
  '恢复后本机应为覆盖前账本'
)
assert.ok(lsS2r.getItem('pam-sync-dirty') != null, '恢复后应置 dirty')
console.log('✓ S2\' P1-2 冲突摘要 + lastDiscarded 恢复')

devS2a.resetSyncState()
devS2b.resetSyncState()
devS2c.resetSyncState()
devS2d.resetSyncState()
devS2e.resetSyncState()
devS2id.resetSyncState()
devS2h.resetSyncState()
devS2r.resetSyncState()

console.log('\nOK cloud-sync smoke: 全部通过（含 S1\' 闸门 / S2\' 云优先·指纹·empty-cloud·原子性·恢复 / S4\' bound·退出分路）')
