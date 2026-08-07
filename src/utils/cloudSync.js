/**
 * PAM 二期云同步 · 前端同步层（D6 + P1 修复）
 *
 * - localStorage 主副本不变：记账照常写本地
 * - patch localStorage.setItem / removeItem 检测业务键变化 → 置 dirty → 防抖 2s 推云（PUT）
 * - 启动拉云（GET）：云端更新则合入本地并重载；本地领先则推上云
 * - 推送遇 409（云端已被别处更新）→ 交回调弹窗，用户选「用本地 / 用云端」
 * - 离线优先：推云失败不阻塞记账，dirty 持久化（pam-sync-dirty）；联网 / 下次启动 / 回前台补推
 * - 回前台拉取：命中新数据只提示（onRemoteAhead），不写存储——避免「存储新、内存旧」的静默覆盖
 * - 鉴权失效（Access 会话过期）与网络错误分开：前者 onAuthExpired 明确提示，后者静默重试
 *
 * P1 修复：F1 dirty 持久化+退避重试+online / I3 patch removeItem
 *          / I4 redirect manual+onAuthExpired / I1 冲突解决不谎报
 *          / 前台拉取门控 hydrate 本身（不门控通知）
 */
import { collectLedgerData, replaceLedgerData, BACKUP_FORMAT, BACKUP_FORMAT_VERSION } from './ledgerBackup.js'
import { ALL_CLEARABLE_KEYS } from '../constants/storageKeys.js'

const SYNC_META_KEY = 'pam-sync-meta'
const DIRTY_KEY = 'pam-sync-dirty'
const API_BASE = '/api/ledger'
const DEBOUNCE_MS = 2000
const RETRY_MS = 30000 // 推云失败后的一次退避重试间隔
const FOREGROUND_THROTTLE_MS = 15000 // iOS visibilitychange 触发频繁，回前台拉取节流

// initSync 时捕获本实例的 localStorage（多实例/测试可隔离，避免全局串扰）
let _ls = null
function ls() {
  return _ls || globalThis.localStorage
}

let pushTimer = null
let retryTimer = null
let lastForegroundPullAt = 0
let pushing = false
let suppressing = false // hydrate/合入期间抑制 dirty 触发，避免同步回环
let handlers = { onConflict: null, onHydrated: null, onRemoteAhead: null, onAuthExpired: null }

// ── 版本元数据（本地视角的云端版本）──────────────────────────
export function getLocalVersion() {
  try {
    const meta = JSON.parse(ls().getItem(SYNC_META_KEY) || 'null')
    return meta && Number.isInteger(meta.version) ? meta.version : 0
  } catch {
    return 0
  }
}

function setLocalVersion(version, updatedAt) {
  ls().setItem(SYNC_META_KEY, JSON.stringify({ version, updatedAt }))
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
  // redirect:'manual' 下 302 → opaqueredirect（Access 会话过期跳登录页）
  return res.type === 'opaqueredirect' || res.status === 401 || res.status === 403
}

async function fetchRemote() {
  const res = await fetch(API_BASE, { headers: { Accept: 'application/json' }, redirect: 'manual' })
  if (isAuthFailure(res)) {
    handlers.onAuthExpired?.()
    throw new Error('auth expired')
  }
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`云端拉取失败 HTTP ${res.status}`)
  return res.json() // { version, updatedAt, data }
}

/** 供 UI 层在冲突覆盖前拉取「将被丢弃的云端副本」（I2 备份用） */
export async function getRemoteLedger() {
  return fetchRemote()
}

async function pushRemote(data, version) {
  const res = await fetch(API_BASE, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version, data }),
    redirect: 'manual'
  })
  if (isAuthFailure(res)) {
    handlers.onAuthExpired?.()
    throw new Error('auth expired')
  }
  if (res.status === 409) {
    const body = await res.json()
    return { conflict: true, serverVersion: body.serverVersion, serverUpdatedAt: body.serverUpdatedAt }
  }
  if (!res.ok) throw new Error(`云端推送失败 HTTP ${res.status}`)
  return res.json() // { version, updatedAt }
}

// ── 推送 ───────────────────────────────────────────────────
export function schedulePush() {
  setDirty() // 任何计划中的推送都意味着本地有未上云改动
  clearTimeout(pushTimer)
  pushTimer = setTimeout(runPush, DEBOUNCE_MS)
}

async function runPush() {
  if (pushing) return
  pushing = true
  try {
    const data = serializeLocal()
    if (Object.keys(data).length === 0) {
      // 空账本不推：与「不做 DELETE / 重置不传播云端」语义一致，删除类改动视为已消化
      clearDirty()
      return
    }
    const result = await pushRemote(data, getLocalVersion())
    if (result.conflict) {
      handlers.onConflict?.(result.serverVersion, result.serverUpdatedAt)
      return
    }
    setLocalVersion(result.version, result.updatedAt)
    clearDirty()
    clearTimeout(retryTimer) // 已成功，取消待退避重试
  } catch (err) {
    console.warn('[cloud-sync] push failed:', err?.message || err)
    if (!retryTimer) {
      // 退避重试一次（30s）；其余交给 online 事件 / 下次写入 / 下次启动
      retryTimer = setTimeout(() => {
        retryTimer = null
        runPush()
      }, RETRY_MS)
    }
  } finally {
    pushing = false
  }
}

// ── 启动 / 回前台拉云 ──────────────────────────────────────
export async function pullOnStart({ foreground = false } = {}) {
  try {
    const remote = await fetchRemote()
    if (remote == null) {
      // 云端无记录：本地有账本且（未上过云 或 有未上云改动）→ 首上云 / 补推
      if (hasLocalData() && (getLocalVersion() === 0 || isDirty())) schedulePush()
      return
    }
    const localVersion = getLocalVersion()
    if (remote.version > localVersion) {
      if (isDirty()) {
        // 本地有未上云改动且云端更新 → 真冲突，交用户（不写存储，防静默覆盖）
        handlers.onConflict?.(remote.version, remote.updatedAt)
        return
      }
      if (foreground) {
        // 回前台命中新数据：只提示不写存储（避免「存储新、内存旧」的静默覆盖）
        handlers.onRemoteAhead?.(remote.version, remote.updatedAt)
        return
      }
      hydrateLocal(remote.data)
      setLocalVersion(remote.version, remote.updatedAt)
      clearDirty()
      handlers.onHydrated?.(remote.version, remote.updatedAt)
      return
    }
    if (remote.version < localVersion && hasLocalData()) {
      schedulePush() // 本地领先（如云端被重置），推上去
      return
    }
    if (isDirty()) {
      schedulePush() // 版本相同但本地有未上云改动 → 补推
    }
  } catch (err) {
    console.warn('[cloud-sync] pull failed:', err?.message || err) // 离线静默（鉴权失效另经 onAuthExpired 提示）
  }
}

// ── 冲突选择 ───────────────────────────────────────────────
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
  return { ok: true }
}

/** 冲突弹窗「用云端」：重新拉云端最新并合入 */
export async function resolveConflictUseCloud() {
  const remote = await fetchRemote()
  if (remote == null) return { ok: false, reason: 'no-cloud-data' }
  hydrateLocal(remote.data)
  setLocalVersion(remote.version, remote.updatedAt)
  clearDirty()
  handlers.onHydrated?.(remote.version, remote.updatedAt)
  return { ok: true }
}

// ── 初始化：patch localStorage + 生命周期监听 + 启动拉云 ──
function onForeground() {
  const now = Date.now()
  if (now - lastForegroundPullAt < FOREGROUND_THROTTLE_MS) return
  lastForegroundPullAt = now
  pullOnStart({ foreground: true })
}

function attachLifecycleListeners() {
  const target = globalThis.window ?? globalThis
  if (typeof target?.addEventListener !== 'function') return
  target.addEventListener('visibilitychange', () => {
    if (globalThis.document?.visibilityState === 'visible') onForeground()
  })
  target.addEventListener('focus', onForeground)
  target.addEventListener('online', () => schedulePush())
}

export function initSync(options = {}) {
  handlers = { onConflict: null, onHydrated: null, onRemoteAhead: null, onAuthExpired: null, ...options }
  const storage = ls()
  _ls = storage
  const originalSetItem = storage.setItem.bind(storage)
  const originalRemoveItem = storage.removeItem.bind(storage)
  storage.setItem = (key, value) => {
    originalSetItem(key, value)
    if (!suppressing && ALL_CLEARABLE_KEYS.includes(key)) {
      schedulePush()
    }
  }
  storage.removeItem = (key) => {
    originalRemoveItem(key)
    if (!suppressing && ALL_CLEARABLE_KEYS.includes(key)) {
      schedulePush()
    }
  }
  attachLifecycleListeners()
  pullOnStart()
}

/** 重置同步状态（重置账本时调用）：清版本、清 dirty、取消待推/待重试 */
export function resetSyncState() {
  clearTimeout(pushTimer)
  clearTimeout(retryTimer)
  pushTimer = null
  retryTimer = null
  ls().removeItem(SYNC_META_KEY)
  ls().removeItem(DIRTY_KEY)
}
