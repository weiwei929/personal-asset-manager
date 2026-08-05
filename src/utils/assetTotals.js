/**
 * 总资产纯函数（单一计算源 · 可 Node smoke）
 *
 * 定稿：
 *   总资产 = Σ活期 + Σ定期产品 + Σ股基投入本金 + Σ借出未还
 *
 * 股/基：只用 investedPrincipal；无该字段时视为 0（不回落市值，防双计/虚高）
 * 市值仅观察，不进入本模块。
 */

import { roundMoney } from './money.js'

/**
 * @param {Array<{ demandBalance?: number }>} accounts
 */
export function calcTotalDemand(accounts = []) {
  return roundMoney(
    accounts.reduce((sum, a) => sum + (Number(a.demandBalance) || 0), 0)
  )
}

/**
 * @param {Array<{ timeDeposits?: Array<{ principal?: number }> }>} accounts
 */
export function calcTotalTimeDeposit(accounts = []) {
  return roundMoney(
    accounts.reduce((sum, a) => {
      const list = Array.isArray(a.timeDeposits) ? a.timeDeposits : []
      return sum + list.reduce((s, d) => s + (Number(d.principal) || 0), 0)
    }, 0)
  )
}

/**
 * 单条股/基投入本金
 * @param {{ investedPrincipal?: number }} item
 */
export function getInvestedPrincipal(item) {
  if (item == null) return 0
  if (item.investedPrincipal != null && item.investedPrincipal !== '') {
    return Number(item.investedPrincipal) || 0
  }
  return 0
}

/**
 * @param {Array} stocks
 * @param {Array} funds
 */
export function calcTotalInvestedPrincipal(stocks = [], funds = []) {
  const stockSum = stocks.reduce((s, x) => s + getInvestedPrincipal(x), 0)
  const fundSum = funds.reduce((s, x) => s + getInvestedPrincipal(x), 0)
  return roundMoney(stockSum + fundSum)
}

/**
 * 观察用市值合计（不进总资产）
 * @param {Array} stocks
 * @param {Array} funds
 */
export function calcTotalMarketValue(stocks = [], funds = []) {
  const stockMv = stocks.reduce((s, x) => s + (Number(x.currentValue) || 0), 0)
  const fundMv = funds.reduce((s, x) => s + (Number(x.currentValue) || 0), 0)
  return stockMv + fundMv
}

/**
 * 借出未还（pending）
 * @param {Array<{ status?: string, amount?: number }>} lentRecords
 */
export function calcTotalLent(lentRecords = []) {
  return roundMoney(
    lentRecords
      .filter(r => {
        if (r.status === 'returned') return false
        if (r.remainingAmount != null) return (Number(r.remainingAmount) || 0) > 0
        return !r.status || r.status === 'pending'
      })
      .reduce((sum, r) => {
        if (r.remainingAmount != null) return sum + (Number(r.remainingAmount) || 0)
        return sum + (Number(r.amount) || 0)
      }, 0)
  )
}

/**
 * @param {{
 *   accounts?: Array,
 *   stocks?: Array,
 *   funds?: Array,
 *   lentRecords?: Array
 * }} parts
 */
export function calcAssetBreakdown(parts = {}) {
  const accounts = parts.accounts || []
  const stocks = parts.stocks || []
  const funds = parts.funds || []
  const lentRecords = parts.lentRecords || []

  const totalDemand = calcTotalDemand(accounts)
  const totalTimeDeposit = calcTotalTimeDeposit(accounts)
  const totalInvestedPrincipal = calcTotalInvestedPrincipal(stocks, funds)
  const totalLent = calcTotalLent(lentRecords)
  const totalMarketValue = calcTotalMarketValue(stocks, funds)

  const totalAssets = roundMoney(
    totalDemand + totalTimeDeposit + totalInvestedPrincipal + totalLent
  )

  return {
    totalDemand,
    totalTimeDeposit,
    totalInvestedPrincipal,
    totalLent,
    totalMarketValue: roundMoney(totalMarketValue),
    totalAssets
  }
}

/**
 * @param {object} parts
 * @returns {number}
 */
export function calcTotalAssets(parts) {
  return calcAssetBreakdown(parts).totalAssets
}
