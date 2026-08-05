/**
 * 自然月键 YYYY-MM 工具
 */

/**
 * @param {Date} [d]
 * @returns {string} YYYY-MM
 */
export function currentMonthKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/**
 * 上一自然月
 * @param {string|Date} monthOrDate YYYY-MM 或 Date
 * @returns {string} YYYY-MM
 */
export function prevMonthKey(monthOrDate) {
  let y
  let m
  if (typeof monthOrDate === 'string' && /^\d{4}-\d{2}$/.test(monthOrDate)) {
    y = Number(monthOrDate.slice(0, 4))
    m = Number(monthOrDate.slice(5, 7))
  } else {
    const d = monthOrDate instanceof Date ? monthOrDate : new Date()
    y = d.getFullYear()
    m = d.getMonth() + 1
  }
  m -= 1
  if (m < 1) {
    m = 12
    y -= 1
  }
  return `${y}-${String(m).padStart(2, '0')}`
}

/**
 * 下一自然月
 * @param {string} month YYYY-MM
 * @returns {string}
 */
export function nextMonthKey(month) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    throw new Error('月份格式应为 YYYY-MM')
  }
  let y = Number(month.slice(0, 4))
  let m = Number(month.slice(5, 7)) + 1
  if (m > 12) {
    m = 1
    y += 1
  }
  return `${y}-${String(m).padStart(2, '0')}`
}

/**
 * 闭区间 [fromMonth, toMonth] 的月份列表（含端点）
 * @param {string} fromMonth
 * @param {string} toMonth
 * @returns {string[]}
 */
export function monthKeysInclusive(fromMonth, toMonth) {
  if (!fromMonth || !toMonth || fromMonth > toMonth) return []
  const out = []
  let cur = fromMonth
  while (cur <= toMonth) {
    out.push(cur)
    cur = nextMonthKey(cur)
  }
  return out
}

/**
 * 展示用：2026-07 → 2026年07月
 * @param {string} month
 */
export function formatMonthLabel(month) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return month || '—'
  const [y, m] = month.split('-')
  return `${y}年${m}月`
}
