/**
 * 本机诊断日志（环形缓冲）
 *
 * - 默认：开发环境开启；生产关闭
 * - CF 测试版构建：VUE_APP_DIAGNOSTICS=1
 * - 运行时也可：localStorage.setItem('pam-diagnostics','1') 后刷新
 * - 只记动作/结果/软上下文，不记密码；金额默认只记有无变化摘要
 */

const STORAGE_KEY = 'pam-diag-log'
const FLAG_KEY = 'pam-diagnostics'
const MAX_ENTRIES = 80

/**
 * @returns {boolean}
 */
export function isDiagnosticsEnabled() {
  try {
    const flag = localStorage.getItem(FLAG_KEY)
    if (flag === '1' || flag === 'true') return true
    if (flag === '0' || flag === 'false') return false
  } catch {
    /* ignore */
  }
  const env = process.env.VUE_APP_DIAGNOSTICS
  if (env === '1' || env === 'true') return true
  if (env === '0' || env === 'false') return false
  return process.env.NODE_ENV === 'development'
}

/**
 * 运行时开关（写入 localStorage，立即生效）
 * @param {boolean} on
 */
export function setDiagnosticsEnabled(on) {
  try {
    if (on) localStorage.setItem(FLAG_KEY, '1')
    else localStorage.setItem(FLAG_KEY, '0')
  } catch {
    /* ignore */
  }
}

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function writeAll(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)))
  } catch {
    /* ignore quota */
  }
}

/**
 * @param {string} action 短动作名
 * @param {object} [detail] 可序列化软字段
 * @param {'info'|'warn'|'error'} [level]
 */
export function diagLog(action, detail = {}, level = 'info') {
  if (!isDiagnosticsEnabled()) return
  const entry = {
    t: new Date().toISOString(),
    level,
    action: String(action || 'unknown'),
    detail: sanitizeDetail(detail)
  }
  const next = [...readAll(), entry]
  writeAll(next)
  if (process.env.NODE_ENV === 'development' || level === 'error') {
    // eslint-disable-next-line no-console
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info
    fn(`[pam] ${action}`, detail)
  }
}

function sanitizeDetail(detail) {
  if (detail == null || typeof detail !== 'object') return {}
  const out = {}
  for (const [k, v] of Object.entries(detail)) {
    const key = String(k).toLowerCase()
    if (key.includes('password') || key.includes('hash') || key.includes('salt')) continue
    if (typeof v === 'string' && v.length > 200) {
      out[k] = v.slice(0, 200) + '…'
    } else if (typeof v === 'number' || typeof v === 'boolean' || v == null) {
      out[k] = v
    } else if (typeof v === 'string') {
      out[k] = v
    } else {
      try {
        out[k] = JSON.parse(JSON.stringify(v))
      } catch {
        out[k] = String(v)
      }
    }
  }
  return out
}

/** @returns {Array<object>} */
export function getDiagLogs() {
  return readAll()
}

export function clearDiagLogs() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** 纯文本，便于复制粘贴 */
export function formatDiagLogsText() {
  const logs = readAll()
  if (!logs.length) return '（暂无诊断记录）'
  const ver = process.env.VUE_APP_VERSION || 'dev'
  const lines = [
    `PAM diagnostics · ${new Date().toISOString()} · ver=${ver}`,
    `entries=${logs.length}`,
    '---'
  ]
  for (const e of logs) {
    const d = e.detail && Object.keys(e.detail).length
      ? ' ' + JSON.stringify(e.detail)
      : ''
    lines.push(`${e.t} [${e.level}] ${e.action}${d}`)
  }
  return lines.join('\n')
}

/**
 * @returns {Promise<boolean>}
 */
export async function copyDiagLogs() {
  const text = formatDiagLogsText()
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fallthrough */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
