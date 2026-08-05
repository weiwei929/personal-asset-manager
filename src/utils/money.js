/**
 * 金额工具：统一两位小数，避免 0.1+0.2 与反复入账漂移
 */

export function roundMoney(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return 0
  return Math.round((x + Number.EPSILON) * 100) / 100
}

export function addMoney(a, b) {
  return roundMoney((Number(a) || 0) + (Number(b) || 0))
}

export function subMoney(a, b) {
  return roundMoney((Number(a) || 0) - (Number(b) || 0))
}
