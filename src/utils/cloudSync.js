/**
 * PAM 云同步 · 前端同步层（D6/P1 + v1.08.12 S1'/M1' + S4'/M8'）
 *
 * 权威限定：settle 时刻以 KV 为准；两次 settle 之间真源仍是本机内存 / localStorage。
 *
 * S1' / M1'：
 * - P0-1：早 patch（可先于 LoginGate）与 settle 解耦；settle 仅在鉴权通过后触发
 * - B1 + C1：推送闸门（内存态）；runPush 入口检查；online/回前台 → re-settle
 * - P0-3：reloadAllStores() 重灌 Pinia，少整页 reload
 * - P0-4：hydrate 失败不写 version、闸门保持关闭
 * - P0-5：fetch AbortController ~9s，超时走 offline 分支
 *
 * S4' / M8'：
 * - setLocalVersion 同处写入 pam-cloud-bound（P0-2(c)）
 * - resetSyncState 不得清 pam-cloud-bound（C2）
 * - 退出清缓存 / idle 例外 / 离线绑定门闸见 App + dataReset
 *
 * 冲突解决路径显式豁免闸门（用户显式决定）。
 */
import { collectLedgerData, replaceLedgerData, BACKUP_FORMAT, BACKUP_FORMAT_VERSION } from './ledgerBackup.js'
import { ALL_CLEARABLE_KEYS, STORAGE_KEYS } from '../constants/storageKeys.js'

const SYNC_META_KEY = 'pam-sync-meta'
const DIRTY_KEY = 'pam-sync-dirty'
const API_BASE = '/api/ledger'
const DEBOUNCE_MS = 2000
const RETRY_MS = 30000
const FOREGROUND_THROTTLE_MS = 15000
/** P0-5：弱网门闸超时（8–10s） */
const FETCH_TIMEOUT_MS = 9000

// initSync / installPatch 时捕获本实例的 localStorage（多实例/测试可隔离）
let _ls = null
function ls() {
  return _ls || globalThis.localStorage
}

let pushTimer = null
let retryTimer = null
let lastForegroundPullAt = 0
let pushing = false
let suppressing = false
let handlers = {
  onConflict: null,
  onHydrated: null,
  onRemoteAhead: null,
  onAuthExpired: null,
  onHydrateFailed: null,
  /** S4'：settle 结论回调（含 online/回前台 re-settle），供离线绑定门闸 */
  onSettle: null
}

/** B1/C1：推送闸门（内存态；刷新即关闭） */
let pushArmed = false
/** P0-4：hydrate 失败后需重拉；期间禁止推送 */
let needRepull = false
let storagePatched = false
let lifecycleAttached = false
let settling = false

// ── 闸门 ───────────────────────────────────────────────────
export function isPushArmed() {
  return pushArmed
}

export function isNeedRepull() {
  return needRepull
}

function openPushGate() {
  pushArmed = true
}

/** 关闭闸门（不改 dirty / version / pam-cloud-bound） */
export function closePushGate() {
  pushArmed = false
}

function armGateAndCatchUpIfDirty() {
  openPushGate()
  if (isDirty()) {
    clearTimeout(pushTimer)
    pushTimer = setTimeout(runPush, DEBOUNCE_MS)
  }
}

// ── 版本元数据（本地视角的云端版本）──────────────────────────
export function getLocalVersion() {
  try {
    const meta = JSON.parse(ls().getItem(SYNC_META_KEY) || 'null')
    return meta && Number.isInteger(meta.version) ? meta.version : 0
  } catch {
    return 0
  }
}

/**
 * 成功 settle / 成功 PUT 后写本地版本，并同处更新 pam-cloud-bound（S4' / P0-2(c)）。
 * 值不含账本正文；emailHash 可选（本版无客户端身份源时省略）。
 */
function setLocalVersion(version, updatedAt) {
  const syncedAt = updatedAt || new Date().toISOString()
  ls().setItem(SYNC_META_KEY, JSON.stringify({ version, updatedAt: syncedAt }))
  writeCloudBoundMark({ lastVersion: version, lastSyncedAt: syncedAt })
}

/** @returns {{ lastVersion: number, lastSyncedAt?: string, emailHash?: string } | null} */
export function getCloudBoundMark() {
  try {
    const raw = ls().getItem(STORAGE_KEYS.CLOUD_BOUND)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

export function isCloudBound() {
  return getCloudBoundMark() != null
}

/** 写入绑定标记（不进 dirty 白名单；直接写 LS） */
export function writeCloudBoundMark({ lastVersion, lastSyncedAt, emailHash } = {}) {
  const payload = {
    lastVersion: Number.isInteger(lastVersion) ? lastVersion : 0,
    lastSyncedAt: lastSyncedAt || new Date().toISOString()
  }
  if (emailHash) payload.emailHash = emailHash
  // 保留既有 emailHash（若本次未传入）
  if (!emailHash) {
    const prev = getCloudBoundMark()
    if (prev?.emailHash) payload.emailHash = prev.emailHash
  }
  ls().setItem(STORAGE_KEYS.CLOUD_BOUND, JSON.stringify(payload))
}

/** 仅安全退出路径调用（S4'）；普通退出不得调用 */
export function clearCloudBoundMark() {
  ls().removeItem(STORAGE_KEYS.CLOUD_BOUND)
}

/**
 * S4'：本机账本业务键是否均已清空（忽略退出后写回的默认分类）。
 * 供 smoke / 退出路径断言；不把 pam-cloud-bound / AUTH / THEME 算入。
 */
export function isLedgerCacheWiped() {
  for (const key of ALL_CLEARABLE_KEYS) {
    if (key === STORAGE_KEYS.FINANCE_CATEGORIES) continue
    if (ls().getItem(key) != null) return false
  }
  return true
}

/** 是否有本机账本业务数据（serialize 非空） */
export function hasLocalLedgerData() {
  return hasLocalData()
}

/** 本机是否已完成期初建账（读 LS，不依赖 Pinia） */
export function hasOpenedBooksInStorage() {
  try {
    const raw = ls().getItem(STORAGE_KEYS.OPENING_BALANCE)
    if (!raw) return false
    const data = JSON.parse(raw)
    return Boolean(data?.completedAt)
  } catch {
    return false
  }
}

/**
 * P0-2(c)：离线 + 无期初建账 + 曾绑定云端 → 禁止建账引导。
 * （退出清缓存后仍会写回默认分类，故不能用 hasLocalData）
 * @param {string} settleOutcome
 */
export function shouldBlockEmptyLedgerOnboarding(settleOutcome) {
  return settleOutcome === 'offline' && isCloudBound() && !hasOpenedBooksInStorage()
}

// ── dirty：本地存在未上云改动（离线优先的落盘标记）────────────
function isDirty() {
  return ls().getItem(DIRTY_KEY) != null
}
function setDirty() {
  ls().setItem(DIRTY_KEY, '1')
}
function clearDirty() {
  ls().removeItem(DIRTY_KEY)
}

// ── 序列化 / 合入 ──────────────────────────────────────────
/** 把本地账本打成云 data（全部业务键，复用 E1 纯函数） */
export function serializeLocal() {
  return collectLedgerData((key) => ls().getItem(key)).data
}

/** 用云 data 覆盖写回本地（先清后写，复用 E1 纯函数） */
export function hydrateLocal(data) {
  if (data == null || typeof data !== 'object') {
    throw new Error('invalid hydrate payload')
  }
  suppressing = true
  try {
    replaceLedgerData(
      {
        format: BACKUP_FORMAT,
        formatVersion: BACKUP_FORMAT_VERSION,
        app: 'personal-asset-manager',
        data
      },
      (key) => ls().removeItem(key),
      (key, value) => ls().setItem(key, value)
    )
  } finally {
    suppressing = false
  }
}

function hasLocalData() {
  return Object.keys(serializeLocal()).length > 0
}

// ── 云 API ─────────────────────────────────────────────────
function isAuthFailure(res) {
  return res.type === 'opaqueredirect' || res.status === 401 || res.status === 403
}

async function fetchWithTimeout(url, opts = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function fetchRemote() {
  const res = await fetchWithTimeout(API_BASE, {
    headers: { Accept: 'application/json' },
    redirect: 'manual'
  })
  if (isAuthFailure(res)) {
    handlers.onAuthExpired?.()
    const err = new Error('auth expired')
    err.code = 'auth-expired'
    throw err
  }
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`云端拉取失败 HTTP ${res.status}`)
  return res.json()
}

/** 供 UI 层在冲突覆盖前拉取「将被丢弃的云端副本」（I2 备份用） */
export async function getRemoteLedger() {
  return fetchRemote()
}

async function pushRemote(data, version) {
  const res = await fetchWithTimeout(API_BASE, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version, data }),
    redirect: 'manual'
  })
  if (isAuthFailure(res)) {
    handlers.onAuthExpired?.()
    const err = new Error('auth expired')
    err.code = 'auth-expired'
    throw err
  }
  if (res.status === 409) {
    const body = await res.json()
    return { conflict: true, serverVersion: body.serverVersion, serverUpdatedAt: body.serverUpdatedAt }
  }
  if (!res.ok) throw new Error(`云端推送失败 HTTP ${res.status}`)
  return res.json()
}

// ── 推送（闸门检查在 runPush 入口，防 retryTimer 绕过）─────
export function schedulePush() {
  setDirty()
  clearTimeout(pushTimer)
  pushTimer = setTimeout(runPush, DEBOUNCE_MS)
}

async function runPush() {
  // C1：检查点必须在 runPush 入口（不只 schedulePush）
  if (!pushArmed || needRepull) return
  if (pushing) return
  pushing = true
  try {
    const data = serializeLocal()
    if (Object.keys(data).length === 0) {
      clearDirty()
      return
    }
    const result = await pushRemote(data, getLocalVersion())
    if (result.conflict) {
      closePushGate()
      handlers.onConflict?.(result.serverVersion, result.serverUpdatedAt)
      return
    }
    setLocalVersion(result.version, result.updatedAt)
    clearDirty()
    clearTimeout(retryTimer)
    retryTimer = null
  } catch (err) {
    console.warn('[cloud-sync] push failed:', err?.message || err)
    if (err?.code === 'auth-expired') {
      closePushGate()
      return
    }
    if (!retryTimer) {
      retryTimer = setTimeout(() => {
        retryTimer = null
        runPush()
      }, RETRY_MS)
    }
  } finally {
    pushing = false
  }
}

/**
 * settle：以 KV 为准对齐本地，并按 C1 表开关闸门。
 * @returns {Promise<string>} 结论：in-sync | hydrated | empty-cloud | conflict | offline | auth-expired | hydrate-failed | remote-ahead
 */
export async function settleLedger({ foreground = false } = {}) {
  if (settling) return 'busy'
  settling = true
  let outcome = 'offline'
  try {
    let remote
    try {
      remote = await fetchRemote()
    } catch (err) {
      console.warn('[cloud-sync] settle fetch failed:', err?.message || err)
      closePushGate()
      if (err?.code === 'auth-expired') {
        outcome = 'auth-expired'
        return outcome
      }
      // 超时 / 网络错误 → offline（继续累积 dirty；online/回前台再 settle）
      outcome = 'offline'
      return outcome
    }

    if (remote == null) {
      // empty-cloud：放开闸门；有本机数据则补推（P1-3 身份前置若已有则由其负责）
      needRepull = false
      openPushGate()
      if (hasLocalData() && (getLocalVersion() === 0 || isDirty())) {
        clearTimeout(pushTimer)
        pushTimer = setTimeout(runPush, DEBOUNCE_MS)
      }
      outcome = 'empty-cloud'
      return outcome
    }

    const localVersion = getLocalVersion()

    if (remote.version > localVersion) {
      if (isDirty()) {
        closePushGate()
        handlers.onConflict?.(remote.version, remote.updatedAt)
        outcome = 'conflict'
        return outcome
      }
      if (foreground) {
        // M5：回前台只提示不写存储；闸门可放开（无 dirty，不会误推）
        openPushGate()
        handlers.onRemoteAhead?.(remote.version, remote.updatedAt)
        outcome = 'remote-ahead'
        return outcome
      }
      // 冷启动 / 显式 settle：hydrate
      try {
        hydrateLocal(remote.data)
        setLocalVersion(remote.version, remote.updatedAt)
        clearDirty()
        needRepull = false
        openPushGate()
        handlers.onHydrated?.(remote.version, remote.updatedAt)
        outcome = 'hydrated'
        return outcome
      } catch (hydrateErr) {
        // P0-4：失败不写 version；禁止推送
        console.warn('[cloud-sync] hydrate failed:', hydrateErr?.message || hydrateErr)
        needRepull = true
        closePushGate()
        handlers.onHydrateFailed?.(hydrateErr)
        outcome = 'hydrate-failed'
        return outcome
      }
    }

    if (remote.version < localVersion && hasLocalData()) {
      needRepull = false
      armGateAndCatchUpIfDirty()
      // 本地领先：即使尚未 dirty 也安排一次推（与历史行为一致）
      if (!isDirty()) {
        setDirty()
        clearTimeout(pushTimer)
        pushTimer = setTimeout(runPush, DEBOUNCE_MS)
      }
      outcome = 'in-sync'
      return outcome
    }

    // 版本相同 —— 仍刷新 bound 时间戳（与 setLocalVersion 同语义：成功对齐）
    setLocalVersion(remote.version, remote.updatedAt)
    needRepull = false
    armGateAndCatchUpIfDirty()
    outcome = 'in-sync'
    return outcome
  } finally {
    settling = false
    try {
      handlers.onSettle?.(outcome)
    } catch (e) {
      console.warn('[cloud-sync] onSettle handler failed:', e?.message || e)
    }
  }
}

/** @deprecated 名称保留：内部改为 settleLedger */
export async function pullOnStart(opts = {}) {
  return settleLedger(opts)
}

// ── 冲突选择（显式豁免闸门）────────────────────────────────
/** 冲突弹窗「用本地」：以服务端版本为基线，把本地推上云；二次 409 不谎报 */
export async function resolveConflictUseLocal(serverVersion) {
  const data = serializeLocal()
  if (Object.keys(data).length === 0) return { ok: false, reason: 'empty-local' }
  const result = await pushRemote(data, serverVersion)
  if (result.conflict) {
    return {
      ok: false,
      conflict: true,
      serverVersion: result.serverVersion,
      serverUpdatedAt: result.serverUpdatedAt
    }
  }
  setLocalVersion(result.version, result.updatedAt)
  clearDirty()
  needRepull = false
  openPushGate()
  return { ok: true }
}

/** 冲突弹窗「用云端」：重新拉云端最新并合入 */
export async function resolveConflictUseCloud() {
  const remote = await fetchRemote()
  if (remote == null) return { ok: false, reason: 'no-cloud-data' }
  try {
    hydrateLocal(remote.data)
    setLocalVersion(remote.version, remote.updatedAt)
    clearDirty()
    needRepull = false
    openPushGate()
    handlers.onHydrated?.(remote.version, remote.updatedAt)
    return { ok: true }
  } catch (hydrateErr) {
    needRepull = true
    closePushGate()
    handlers.onHydrateFailed?.(hydrateErr)
    return { ok: false, reason: 'hydrate-failed' }
  }
}

// ── P0-3：重灌 Pinia（勿包 suppressing，确保 catchUp 可置 dirty）──
/** @returns {Promise<void>} */
export async function reloadAllStores() {
  const [
    { useFinanceStore },
    { useBankAccountsStore },
    { useOpeningBalanceStore },
    { useStockInvestmentStore },
    { useFundInvestmentStore },
    { useLentMoneyStore },
    { useMonthlyStatementsStore }
  ] = await Promise.all([
    import('../stores/finance.js'),
    import('../stores/bankAccounts.js'),
    import('../stores/openingBalance.js'),
    import('../stores/stockInvestment.js'),
    import('../stores/fundInvestment.js'),
    import('../stores/lentMoney.js'),
    import('../stores/monthlyStatements.js')
  ])

  useFinanceStore().loadFromLocalStorage()
  useBankAccountsStore().loadFromLocalStorage()
  useOpeningBalanceStore().loadFromLocalStorage()
  useStockInvestmentStore().loadFromLocalStorage()
  useFundInvestmentStore().loadFromLocalStorage()
  useLentMoneyStore().loadFromLocalStorage()
  const monthly = useMonthlyStatementsStore()
  monthly.loadFromLocalStorage()
  // ensureCatchUp 写入必须能置 dirty（此时不应 suppressing）
  monthly.ensureCatchUp()
}

// ── 初始化：patch localStorage + 生命周期（不自动 settle）──
function onForeground() {
  const now = Date.now()
  if (now - lastForegroundPullAt < FOREGROUND_THROTTLE_MS) return
  lastForegroundPullAt = now
  // C1：回前台 → re-settle，不直接 push
  settleLedger({ foreground: true })
}

function attachLifecycleListeners() {
  if (lifecycleAttached) return
  const target = globalThis.window ?? globalThis
  if (typeof target?.addEventListener !== 'function') return
  lifecycleAttached = true
  target.addEventListener('visibilitychange', () => {
    if (globalThis.document?.visibilityState === 'visible') onForeground()
  })
  target.addEventListener('focus', onForeground)
  // C1：online → re-settle，不直接 push
  target.addEventListener('online', () => {
    settleLedger()
  })
}

/**
 * P0-1 方案 A：尽早安装 localStorage patch（可在 LoginGate 前）。
 * 闸门默认关闭，故 ensureCatchUp 等写入只会置 dirty、不会 PUT。
 */
export function installLocalStoragePatch(storage = null) {
  const target = storage || ls()
  _ls = target
  if (storagePatched) return
  storagePatched = true
  const originalSetItem = target.setItem.bind(target)
  const originalRemoveItem = target.removeItem.bind(target)
  target.setItem = (key, value) => {
    originalSetItem(key, value)
    if (!suppressing && ALL_CLEARABLE_KEYS.includes(key)) {
      schedulePush()
    }
  }
  target.removeItem = (key) => {
    originalRemoveItem(key)
    if (!suppressing && ALL_CLEARABLE_KEYS.includes(key)) {
      schedulePush()
    }
  }
}

/**
 * 注册回调与生命周期监听。不触发 settle（须在 LoginGate 通过后调用 settleLedger）。
 */
export function initSync(options = {}) {
  handlers = {
    onConflict: null,
    onHydrated: null,
    onRemoteAhead: null,
    onAuthExpired: null,
    onHydrateFailed: null,
    onSettle: null,
    ...options
  }
  const storage = options.storage || ls()
  _ls = storage
  installLocalStoragePatch(storage)
  attachLifecycleListeners()
  // P0-1：不在此处 settle / pullOnStart
}

/**
 * 重置同步状态（重置账本时调用）：清版本、清 dirty、关闸门、取消定时器。
 * 不清 pam-cloud-bound（C2 / S4'）。
 */
export function resetSyncState() {
  clearTimeout(pushTimer)
  clearTimeout(retryTimer)
  pushTimer = null
  retryTimer = null
  closePushGate()
  needRepull = false
  ls().removeItem(SYNC_META_KEY)
  ls().removeItem(DIRTY_KEY)
  // pam-cloud-bound intentionally preserved (C2)
}
