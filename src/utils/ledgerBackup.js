/**
 * 账本整包备份（G4 可恢复 · E1）
 *
 * - 导出：收集 ALL_CLEARABLE_KEYS 全部业务键 → 整包 JSON → 下载文件
 * - 导入：读备份文件 → 校验格式 → 覆盖写回（先清后写）→ 刷新
 *
 * 核心为纯函数 + 注入读写（collectLedgerData / replaceLedgerData），
 * 便于 Node smoke 直接做 round-trip 对称验证（G3 精神延续）。
 * 浏览器侧函数（downloadBackup / parseBackupFile）仅做文件层封装。
 */

import { ALL_CLEARABLE_KEYS } from '../constants/storageKeys.js'

export const BACKUP_FORMAT = 'pam-ledger-backup'
export const BACKUP_FORMAT_VERSION = 1

const CLEARABLE_SET = new Set(ALL_CLEARABLE_KEYS)

/**
 * 纯函数：从 readFn(key) 收集全部业务键 → 备份对象
 * @param {(key: string) => string|null} readFn
 * @returns {{ format: string, formatVersion: number, app: string, exportedAt: string, data: Object }}
 */
export function collectLedgerData(readFn) {
  const data = {}
  for (const key of ALL_CLEARABLE_KEYS) {
    const raw = readFn(key)
    if (raw == null) continue
    try {
      data[key] = JSON.parse(raw)
    } catch {
      data[key] = raw // 非 JSON 字符串原样保留
    }
  }
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    app: 'personal-asset-manager',
    exportedAt: new Date().toISOString(),
    data
  }
}

/**
 * 校验备份对象结构是否为本应用可识别的整包
 * @param {unknown} obj
 * @returns {boolean}
 */
export function isValidBackup(obj) {
  return (
    obj != null &&
    typeof obj === 'object' &&
    obj.format === BACKUP_FORMAT &&
    obj.formatVersion === BACKUP_FORMAT_VERSION &&
    obj.data != null &&
    typeof obj.data === 'object'
  )
}

/**
 * 纯函数：覆盖语义导入 —— 先清 ALL_CLEARABLE_KEYS，再写备份 data。
 * 只接受 clearable 键（防御：备份文件混入 pam-auth 等键会被忽略）。
 * @param {unknown} backup
 * @param {(key: string) => void} clearFn
 * @param {(key: string, value: string) => void} writeFn
 * @returns {string[]} 实际写入的键列表
 */
export function replaceLedgerData(backup, clearFn, writeFn) {
  if (!isValidBackup(backup)) {
    throw new Error('备份文件格式不正确（非 pam-ledger-backup v1）')
  }
  for (const key of ALL_CLEARABLE_KEYS) {
    clearFn(key)
  }
  const written = []
  for (const [key, value] of Object.entries(backup.data)) {
    if (!CLEARABLE_SET.has(key)) continue
    const serialized = typeof value === 'string' ? value : JSON.stringify(value)
    writeFn(key, serialized)
    written.push(key)
  }
  return written
}

/**
 * 浏览器侧：将备份对象下载为 JSON 文件
 * @param {ReturnType<typeof collectLedgerData>} backup
 * @returns {string} 文件名
 */
export function downloadBackup(backup) {
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19)
  const filename = `pam-ledger-backup-${stamp}.json`
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return filename
}

/**
 * 浏览器侧：从 File 读取并解析为备份对象（不写回）
 * @param {File} file
 * @returns {Promise<ReturnType<typeof collectLedgerData>>}
 */
export function parseBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result))
        if (!isValidBackup(obj)) {
          reject(new Error('备份文件格式不正确（非 pam-ledger-backup v1）'))
          return
        }
        resolve(obj)
      } catch (e) {
        reject(new Error('备份文件解析失败：' + (e?.message || e)))
      }
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsText(file)
  })
}

/**
 * 浏览器侧：解析备份文件并覆盖写回当前账本（导入主入口）
 * @param {File} file
 * @returns {Promise<{ written: string[], filename: string }>}
 */
export async function importBackupFromFile(file) {
  const backup = await parseBackupFile(file)
  const written = replaceLedgerData(
    backup,
    (key) => localStorage.removeItem(key),
    (key, value) => localStorage.setItem(key, value)
  )
  return { written, filename: file.name }
}
