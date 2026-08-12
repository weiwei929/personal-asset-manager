/**
 * S4' / M8'：本机账本缓存清除（无 Pinia 依赖，可供 smoke 直接引用）
 *
 * 普通退出与安全退出都清账本缓存；对 pam-cloud-bound 必须分路，
 * 不得做成「同一函数同清同留」。
 *
 * 读写走 cloudSync 当前 ls()（initSync / installLocalStoragePatch 绑定的 storage，
 * 否则 globalThis.localStorage），与 resetSyncState / clearCloudBoundMark 一致。
 */
import {
  ALL_CLEARABLE_KEYS,
  STORAGE_KEYS,
  PRESERVED_ON_RESET_KEYS
} from '../constants/storageKeys.js'
import { resetSyncState, clearCloudBoundMark } from './cloudSync.js'

/** 与 dataReset 默认分类一致：退出/重置后写回，避免空分类键 */
const DEFAULT_CATEGORIES = [
  { id: '1', name: '工资收入', type: 'income', color: '#67C23A' },
  { id: '2', name: '投资收益', type: 'income', color: '#E6A23C' },
  { id: '3', name: '其他收入', type: 'income', color: '#909399' },
  { id: '4', name: '餐饮', type: 'expense', color: '#F56C6C' },
  { id: '5', name: '交通', type: 'expense', color: '#409EFF' },
  { id: '6', name: '购物', type: 'expense', color: '#C71585' },
  { id: '7', name: '娱乐', type: 'expense', color: '#FF7F50' },
  { id: '8', name: '其他支出', type: 'expense', color: '#909399' }
]

function storage() {
  return globalThis.localStorage
}

/**
 * 清除业务账本键 + resetSyncState；保留 AUTH / THEME / pam-cloud-bound。
 */
export function clearLedgerBusinessKeys() {
  const ls = storage()
  for (const key of ALL_CLEARABLE_KEYS) {
    ls.removeItem(key)
  }
  ls.setItem(STORAGE_KEYS.FINANCE_CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES))
  // C2：resetSyncState 不清 pam-cloud-bound
  resetSyncState()
  return {
    success: true,
    message: '业务数据已清除',
    preserved: [...PRESERVED_ON_RESET_KEYS]
  }
}

/** S4' 普通退出：清账本，保留 pam-cloud-bound */
export function wipeLedgerKeepCloudBound() {
  return clearLedgerBusinessKeys()
}

/** S4' 安全退出：清账本，并清除 pam-cloud-bound */
export function wipeLedgerClearCloudBound() {
  const result = clearLedgerBusinessKeys()
  if (!result.success) return result
  clearCloudBoundMark()
  return {
    success: true,
    message: '本机账本与云端绑定标记已清除'
  }
}
