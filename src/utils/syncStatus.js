/**
 * S3 / M3 · 同步状态 UI 映射（纯函数，可供 Node smoke）
 *
 * 五态：已同步 / 待推送 / 失败 / 离线 / 登录过期
 * 优先级：登录过期 > 失败 >（dirty → 待推送）> 离线 > 已同步
 * dirty+离线按计划归「待推送」（offline or waiting catch-up），不抢冲突弹窗 / LoginGate CTA。
 */

export const SYNC_UI_STATUS = Object.freeze({
  SYNCED: 'synced',
  PENDING: 'pending',
  FAILED: 'failed',
  OFFLINE: 'offline',
  AUTH_EXPIRED: 'auth-expired'
})

/**
 * @typedef {object} SyncStatusFlags
 * @property {boolean} [online]
 * @property {boolean} [dirty]
 * @property {boolean} [authExpired]
 * @property {boolean} [failed]
 * @property {string|null} [lastOutcome]
 * @property {boolean} [pushArmed]
 */

/**
 * @param {SyncStatusFlags} flags
 * @returns {string} SYNC_UI_STATUS.*
 */
export function mapSyncUiStatus(flags = {}) {
  const online = flags.online !== false
  const dirty = !!flags.dirty
  const authExpired =
    !!flags.authExpired || flags.lastOutcome === 'auth-expired'
  const failed =
    !!flags.failed ||
    flags.lastOutcome === 'hydrate-failed' ||
    flags.lastOutcome === 'identity-blocked'
  const settleOffline = flags.lastOutcome === 'offline'
  const navigatorOffline = !online

  if (authExpired) return SYNC_UI_STATUS.AUTH_EXPIRED
  if (failed) return SYNC_UI_STATUS.FAILED
  // dirty（含离线待补推）优先于纯「离线」展示
  if (dirty) return SYNC_UI_STATUS.PENDING
  if (navigatorOffline || settleOffline) return SYNC_UI_STATUS.OFFLINE
  return SYNC_UI_STATUS.SYNCED
}

/**
 * @param {string} statusId
 * @returns {{ id: string, label: string, detail: string, tone: string, blocksLocalView: boolean }}
 */
export function describeSyncUiStatus(statusId) {
  switch (statusId) {
    case SYNC_UI_STATUS.SYNCED:
      return {
        id: statusId,
        label: '已同步',
        detail: '本机与云端已对齐',
        tone: 'ok',
        blocksLocalView: false
      }
    case SYNC_UI_STATUS.PENDING:
      return {
        id: statusId,
        label: '待推送',
        detail: '有未上云改动，联网后将自动补推',
        tone: 'warn',
        blocksLocalView: false
      }
    case SYNC_UI_STATUS.FAILED:
      return {
        id: statusId,
        label: '失败',
        detail: '同步失败，请检查网络后重试（推送已暂停以防覆盖）',
        tone: 'error',
        blocksLocalView: false
      }
    case SYNC_UI_STATUS.OFFLINE:
      return {
        id: statusId,
        label: '离线',
        detail: '当前无法连接云端，可继续本机记账',
        tone: 'muted',
        blocksLocalView: false
      }
    case SYNC_UI_STATUS.AUTH_EXPIRED:
      return {
        id: statusId,
        label: '登录过期',
        detail: '云同步会话已过期，请刷新页面重新登录（本机账本仍可查看）',
        tone: 'warn',
        blocksLocalView: false
      }
    default:
      return {
        id: statusId || 'unknown',
        label: '同步',
        detail: '同步状态未知',
        tone: 'muted',
        blocksLocalView: false
      }
  }
}

/**
 * 组合映射 + 文案，供 UI / 订阅回调一次性取用。
 * @param {SyncStatusFlags} flags
 */
export function resolveSyncUiStatus(flags) {
  const id = mapSyncUiStatus(flags)
  return describeSyncUiStatus(id)
}

/**
 * S5' / M5 · 回前台「云端有更新」提示条是否展示。
 *
 * 设计：只对 **remote-ahead**（可点刷新）出一条轻提示；
 * pending / settling / dirty / offline 等状态交给 SyncStatusIndicator，
 * 避免再叠五条大声横幅。冲突弹窗与「恢复本机」条优先。
 * 不做自动跟云（settle foreground 路径也不写存储）。
 *
 * @param {{ remoteAhead?: unknown, hasConflict?: boolean, hasDiscardRestore?: boolean }} opts
 * @returns {boolean}
 */
export function shouldShowForegroundRemoteTip(opts = {}) {
  if (!opts.remoteAhead) return false
  if (opts.hasConflict) return false
  if (opts.hasDiscardRestore) return false
  return true
}
