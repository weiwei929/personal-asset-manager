/**
 * PAM 二期云同步 · 前端同步层（D6）
 *
 * - localStorage 主副本不变：记账照常写本地
 * - patch localStorage.setItem 检测业务键变化 → 标记 dirty → 防抖 2s 推云（PUT）
 * - 启动拉云（GET）：云端更新则合入本地并重载；本地领先则推上云
 * - 推送遇 409（云端已被别处更新）→ 交回调弹窗，用户选「用本地 / 用云端」
 * - 离线优先：推云失败不阻塞记账，保留 dirty，下次触发或下次启动重试
 *
 * 不碰核心算账逻辑：只动存取层（与二期方案 3.4 一致）。
 */
import { collectLedgerData, replaceLedgerData, BACKUP_FORMAT, BACKUP_FORMAT_VERSION } from './ledgerBackup.js'
import { ALL_CLEARABLE_KEYS } from '../constants/storageKeys.js'

const SYNC_META_KEY = 'pam-sync-meta'
const DEBOUNCE_MS = 2000
const API_BASE = '/api/ledger'

// initSync 时捕获本实例的 localStorage（多实例/测试可隔离，避免全局串扰）
let _ls = null
function ls() {
  return _ls || globalThis.localStorage
}


let pushTimer = null
let suppressing = false // hydrate/合入期间抑制 dirty 触发，避免同步回环
let handlers = { onConflict: null, onHydrated: null }

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
async function fetchRemote() {
  const res = await fetch(API_BASE, { headers: { Accept: 'application/json' } })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`云端拉取失败 HTTP ${res.status}`)
  return res.json() // { version, updatedAt, data }
}

async function pushRemote(data, version) {
  const res = await fetch(API_BASE, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version, data })
  })
  if (res.status === 409) {
    const body = await res.json()
    return { conflict: true, serverVersion: body.serverVersion, serverUpdatedAt: body.serverUpdatedAt }
  }
  if (!res.ok) throw new Error(`云端推送失败 HTTP ${res.status}`)
  return res.json() // { version, updatedAt }
}

// ── 推送 ───────────────────────────────────────────────────
export function schedulePush() {
  clearTimeout(pushTimer)
  pushTimer = setTimeout(runPush, DEBOUNCE_MS)
}

async function runPush() {
  try {
    const data = serializeLocal()
    if (Object.keys(data).length === 0) return
    const result = await pushRemote(data, getLocalVersion())
    if (result.conflict) {
      handlers.onConflict?.(result.serverVersion, result.serverUpdatedAt)
      return
    }
    setLocalVersion(result.version, result.updatedAt)
  } catch (err) {
    console.warn('[cloud-sync] push failed:', err?.message || err)
  }
}

// ── 启动拉云 ───────────────────────────────────────────────
export async function pullOnStart() {
  try {
    const remote = await fetchRemote()
    if (remote == null) {
      // 云端无记录：本地有账本且未上过云 → 首次上云
      if (hasLocalData() && getLocalVersion() === 0) schedulePush()
      return
    }
    if (remote.version > getLocalVersion()) {
      hydrateLocal(remote.data)
      setLocalVersion(remote.version, remote.updatedAt)
      handlers.onHydrated?.()
      return
    }
    if (remote.version < getLocalVersion() && hasLocalData()) {
      schedulePush() // 本地领先，推上去
    }
  } catch (err) {
    console.warn('[cloud-sync] pull failed:', err?.message || err) // 离线静默
  }
}

// ── 冲突选择 ───────────────────────────────────────────────
/** 冲突弹窗「用本地」：以服务端版本为基线，把本地推上云 */
export async function resolveConflictUseLocal(serverVersion) {
  const data = serializeLocal()
  if (Object.keys(data).length === 0) return
  const result = await pushRemote(data, serverVersion)
  if (!result.conflict) setLocalVersion(result.version, result.updatedAt)
}

/** 冲突弹窗「用云端」：重新拉云端最新并合入 */
export async function resolveConflictUseCloud() {
  const remote = await fetchRemote()
  if (remote == null) return
  hydrateLocal(remote.data)
  setLocalVersion(remote.version, remote.updatedAt)
  handlers.onHydrated?.()
}

// ── 初始化：patch localStorage 检测业务键变化 + 启动拉云 ──
export function initSync(options = {}) {
  handlers = { onConflict: null, onHydrated: null, ...options }
  const storage = ls()                                  // ← 新增 1
  _ls = storage                                         // ← 新增 2
  const originalSetItem = storage.setItem.bind(storage) // ← 原 localStorage → storage
  storage.setItem = (key, value) => {                   // ← 原 localStorage → storage
    originalSetItem(key, value)
    if (!suppressing && ALL_CLEARABLE_KEYS.includes(key)) {
      schedulePush()
    }
  }
  pullOnStart()
}