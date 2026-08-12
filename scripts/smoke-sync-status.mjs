/**
 * S3 / M3 · 同步状态映射门闩
 * 用 mock 同步标志覆盖五态：已同步 / 待推送 / 失败 / 离线 / 登录过期
 * 另：轻量校验 cloudSync 状态 API 与映射对齐（不改 settle 语义）
 * 运行：node scripts/smoke-sync-status.mjs
 */
import assert from 'node:assert/strict'
import {
  SYNC_UI_STATUS,
  mapSyncUiStatus,
  describeSyncUiStatus,
  shouldShowForegroundRemoteTip
} from '../src/utils/syncStatus.js'

function assertState(flags, expectedId, msg) {
  const mapped = mapSyncUiStatus(flags)
  assert.equal(mapped, expectedId, msg || `期望 ${expectedId}，得 ${mapped}`)
  const desc = describeSyncUiStatus(mapped)
  assert.ok(desc.label && desc.label.length > 0, '须有可读文字标签（非仅靠颜色）')
  assert.ok(desc.detail && desc.detail.length > 0, '须有说明文案')
}

// ── 五态覆盖 ──
assertState(
  { online: true, dirty: false, authExpired: false, failed: false, lastOutcome: 'in-sync', pushArmed: true },
  SYNC_UI_STATUS.SYNCED,
  '已同步：settled + 非 dirty + 闸门开'
)

assertState(
  { online: true, dirty: true, authExpired: false, failed: false, lastOutcome: 'in-sync', pushArmed: true },
  SYNC_UI_STATUS.PENDING,
  '待推送：dirty 等待补推'
)

assertState(
  { online: false, dirty: true, authExpired: false, failed: false, lastOutcome: 'offline', pushArmed: false },
  SYNC_UI_STATUS.PENDING,
  '待推送：离线 dirty 仍标待推送（计划：offline or waiting catch-up）'
)

assertState(
  { online: true, dirty: false, authExpired: false, failed: true, lastOutcome: 'hydrate-failed', pushArmed: false },
  SYNC_UI_STATUS.FAILED,
  '失败：hydrate / needRepull / push 失败'
)

assertState(
  { online: false, dirty: false, authExpired: false, failed: false, lastOutcome: 'offline', pushArmed: false },
  SYNC_UI_STATUS.OFFLINE,
  '离线：navigator offline / settle offline 且无 dirty'
)

assertState(
  { online: true, dirty: true, authExpired: true, failed: false, lastOutcome: 'auth-expired', pushArmed: false },
  SYNC_UI_STATUS.AUTH_EXPIRED,
  '登录过期优先于 dirty'
)

// ── 优先级：auth-expired > failed > offline(无 dirty) / pending(dirty) > synced ──
assertState(
  { online: false, dirty: false, authExpired: true, failed: true, lastOutcome: 'auth-expired', pushArmed: false },
  SYNC_UI_STATUS.AUTH_EXPIRED,
  '登录过期优先于失败与离线'
)

assertState(
  { online: true, dirty: true, authExpired: false, failed: true, lastOutcome: 'hydrate-failed', pushArmed: false },
  SYNC_UI_STATUS.FAILED,
  '失败优先于待推送'
)

assertState(
  {
    online: true,
    dirty: false,
    authExpired: false,
    failed: false,
    lastOutcome: 'offline',
    pushArmed: false
  },
  SYNC_UI_STATUS.OFFLINE,
  '最近 settle 为 offline 时即使 navigator 暂 online 也标离线（直至成功 settle）'
)

const authDesc = describeSyncUiStatus(SYNC_UI_STATUS.AUTH_EXPIRED)
assert.match(authDesc.detail, /登录|重新登录|会话/, '登录过期须有可操作文案（重新登录）')
assert.equal(authDesc.blocksLocalView, false, '登录过期不得硬挡本机查看')

// ── S5'/M5：回前台 tip 与冲突/恢复条互斥；pending 不另开 tip ──
assert.equal(
  shouldShowForegroundRemoteTip({ remoteAhead: { version: 2 }, hasConflict: false, hasDiscardRestore: false }),
  true,
  'remote-ahead 且无冲突/恢复条 → 显示轻提示'
)
assert.equal(
  shouldShowForegroundRemoteTip({ remoteAhead: { version: 2 }, hasConflict: true, hasDiscardRestore: false }),
  false,
  '有冲突弹窗时不叠 tip'
)
assert.equal(
  shouldShowForegroundRemoteTip({ remoteAhead: { version: 2 }, hasConflict: false, hasDiscardRestore: true }),
  false,
  '有恢复本机条时不叠 tip'
)
assert.equal(
  shouldShowForegroundRemoteTip({ remoteAhead: null, hasConflict: false, hasDiscardRestore: false }),
  false,
  '无 remote-ahead（仅 pending/dirty 由指示器承担）→ 不显示 tip'
)

// ── cloudSync 状态 API 与映射接线（独立 mock LS 实例）──
function createLocalStorage() {
  const store = new Map()
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => {
      store.set(k, String(v))
    },
    removeItem: (k) => {
      store.delete(k)
    }
  }
}

const lsStatus = createLocalStorage()
globalThis.localStorage = lsStatus
globalThis.fetch = async () => ({
  status: 401,
  ok: false,
  type: 'opaqueredirect',
  json: async () => ({})
})

const sync = await import('../src/utils/cloudSync.js?smoke=sync-status')
sync.initSync({ storage: lsStatus })
assert.equal(typeof sync.getSyncStatusFlags, 'function')
assert.equal(typeof sync.getSyncUiStatus, 'function')
assert.equal(typeof sync.subscribeSyncStatus, 'function')
assert.equal(typeof sync.isDirty, 'function')

let heard = null
const unsub = sync.subscribeSyncStatus((s) => {
  heard = s
})
assert.ok(heard && heard.label, 'subscribe 应立即推送当前状态')

const outcome = await sync.settleLedger()
assert.equal(outcome, 'auth-expired')
assert.equal(sync.getLastSettleOutcome(), 'auth-expired')
assert.equal(sync.getSyncUiStatus().id, SYNC_UI_STATUS.AUTH_EXPIRED)
assert.equal(heard.id, SYNC_UI_STATUS.AUTH_EXPIRED, 'auth-expired 应经订阅推送')
unsub()

lsStatus.setItem('pam-sync-dirty', '1')
assert.equal(sync.isDirty(), true)
assert.equal(
  mapSyncUiStatus(sync.getSyncStatusFlags()),
  SYNC_UI_STATUS.AUTH_EXPIRED,
  'auth latch 仍优先于 dirty'
)

sync.resetSyncState()
assert.equal(sync.isDirty(), false)
assert.equal(sync.getLastSettleOutcome(), null)
assert.equal(
  mapSyncUiStatus({ ...sync.getSyncStatusFlags(), online: false }),
  SYNC_UI_STATUS.OFFLINE,
  'reset 后无 latch、offline flags → 离线'
)
assert.equal(
  mapSyncUiStatus({ ...sync.getSyncStatusFlags(), online: true, dirty: true }),
  SYNC_UI_STATUS.PENDING,
  'reset 后 dirty flags → 待推送'
)

console.log('OK smoke-sync-status: 五态映射 + 优先级 + a11y + M5 tip + cloudSync API 全部通过')
