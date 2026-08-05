/**
 * 月度账单纯函数（结转报表层，不切割当前账）
 *
 * 当前账：月中保存即入账活期/总资产
 * 月度账单：进入新自然月后，为「上一月」冻结一份只读账单
 */

import { roundMoney } from './money.js'
import { deriveMonthTotals } from './monthlyLedger.js'

/**
 * @typedef {{
 *   totalDemand: number,
 *   totalTimeDeposit: number,
 *   totalInvestedPrincipal: number,
 *   totalLent: number,
 *   totalMarketValue?: number,
 *   totalAssets: number
 * }} AssetBreakdownLite
 */

/**
 * @param {Partial<AssetBreakdownLite>|null|undefined} b
 * @returns {AssetBreakdownLite}
 */
export function normalizeBreakdown(b) {
  const totalDemand = roundMoney(Number(b?.totalDemand) || 0)
  const totalTimeDeposit = roundMoney(Number(b?.totalTimeDeposit) || 0)
  const totalInvestedPrincipal = roundMoney(Number(b?.totalInvestedPrincipal) || 0)
  const totalLent = roundMoney(Number(b?.totalLent) || 0)
  const totalMarketValue = roundMoney(Number(b?.totalMarketValue) || 0)
  const totalAssets = roundMoney(
    b?.totalAssets != null
      ? Number(b.totalAssets) || 0
      : totalDemand + totalTimeDeposit + totalInvestedPrincipal + totalLent
  )
  return {
    totalDemand,
    totalTimeDeposit,
    totalInvestedPrincipal,
    totalLent,
    totalMarketValue,
    totalAssets
  }
}

/**
 * 仅用外部净流入近似推下一步结构（补历史月结存；内部划转无法还原）
 * @param {AssetBreakdownLite} opening
 * @param {number} externalNet
 * @returns {AssetBreakdownLite}
 */
export function reconstructClosingFromNet(opening, externalNet) {
  const o = normalizeBreakdown(opening)
  const net = roundMoney(Number(externalNet) || 0)
  return normalizeBreakdown({
    totalDemand: o.totalDemand + net,
    totalTimeDeposit: o.totalTimeDeposit,
    totalInvestedPrincipal: o.totalInvestedPrincipal,
    totalLent: o.totalLent,
    totalMarketValue: o.totalMarketValue,
    totalAssets: o.totalAssets + net
  })
}

/**
 * 从月度财务行取流量摘要
 * @param {object|null} financeRow
 */
export function financeFlowSummary(financeRow) {
  if (!financeRow) {
    return {
      income: 0,
      expense: 0,
      netIncome: 0,
      incomes: [],
      channels: {},
      postedEffects: {},
      flowOnly: false
    }
  }
  const incomes = Array.isArray(financeRow.incomes) ? financeRow.incomes : []
  const channels = financeRow.channels || {}
  const hasDetail =
    incomes.length > 0 ||
    Object.values(channels).some(c => (Number(c?.amount) || 0) > 0)

  let income
  let expense
  let netIncome
  if (hasDetail) {
    const t = deriveMonthTotals(incomes, channels)
    income = t.income
    expense = t.expense
    netIncome = t.netIncome
  } else {
    income = Number(financeRow.income) || 0
    expense = Number(financeRow.expense) || 0
    netIncome =
      typeof financeRow.netIncome === 'number'
        ? financeRow.netIncome
        : income - expense
  }

  return {
    income: roundMoney(income),
    expense: roundMoney(expense),
    netIncome: roundMoney(netIncome),
    incomes: incomes.map(r => ({ ...r })),
    channels: JSON.parse(JSON.stringify(channels || {})),
    postedEffects: { ...(financeRow.postedEffects || {}) },
    flowOnly: Boolean(financeRow.flowOnly)
  }
}

/**
 * 组装一份月度账单
 * @param {{
 *   month: string,
 *   financeRow?: object|null,
 *   opening: AssetBreakdownLite|null,
 *   closing: AssetBreakdownLite,
 *   assetMode?: 'snapshot'|'reconstructed',
 *   closedAt?: string,
 *   note?: string
 * }} p
 */
export function buildMonthlyStatement(p) {
  const month = p.month
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    throw new Error('月份格式应为 YYYY-MM')
  }
  const flow = financeFlowSummary(p.financeRow)
  const opening = p.opening ? normalizeBreakdown(p.opening) : null
  const closing = normalizeBreakdown(p.closing)
  const assetMode = p.assetMode === 'reconstructed' ? 'reconstructed' : 'snapshot'

  return {
    month,
    closedAt: p.closedAt || new Date().toISOString(),
    income: flow.income,
    expense: flow.expense,
    netIncome: flow.netIncome,
    incomes: flow.incomes,
    channels: flow.channels,
    postedEffects: flow.postedEffects,
    flowOnly: flow.flowOnly,
    opening,
    closing,
    assetMode,
    note: p.note || '',
    /**
     * 期初总资产 + 外部净流入 ≟ 期末总资产（仅参考；内部划转不破坏总资产，
     * 但若期初缺失或资产为推算则可能对不齐）
     */
    check:
      opening != null
        ? {
            expectedClosingTotal: roundMoney(opening.totalAssets + flow.netIncome),
            actualClosingTotal: closing.totalAssets,
            aligned: Math.abs(
              opening.totalAssets + flow.netIncome - closing.totalAssets
            ) < 0.02
          }
        : null
  }
}
