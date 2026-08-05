/**
 * 股/基投入·撤回纯函数（定稿 T5）
 *
 * 投入/追加：活期↓ 本金↑，总资产不变
 * 市值更新：仅观察，总资产不变
 * 撤回：活期↑、冲减本金；差额 = 实现盈亏（随活期进总资产）
 */

/**
 * 默认冲减本金 = min(投入本金, 撤回金额)
 * @param {number} investedPrincipal
 * @param {number} withdrawAmount
 * @param {number|null|undefined} reducePrincipal 用户指定；缺省用默认
 */
export function resolveReducePrincipal(investedPrincipal, withdrawAmount, reducePrincipal) {
  const principal = Math.max(0, Number(investedPrincipal) || 0)
  const withdraw = Math.max(0, Number(withdrawAmount) || 0)
  if (reducePrincipal == null || reducePrincipal === '') {
    return Math.min(principal, withdraw)
  }
  const r = Number(reducePrincipal)
  if (!Number.isFinite(r) || r < 0) {
    throw new Error('冲减本金须为非负数字')
  }
  if (r > principal + 1e-9) {
    throw new Error(`冲减本金不能超过当前投入本金 ¥${principal}`)
  }
  return r
}

/**
 * @returns {{
 *   withdrawAmount: number,
 *   reducePrincipal: number,
 *   realizedPnl: number,
 *   nextPrincipal: number
 * }}
 */
export function planWithdraw(investedPrincipal, withdrawAmount, reducePrincipal) {
  const withdraw = Number(withdrawAmount) || 0
  if (withdraw <= 0) throw new Error('撤回金额须大于 0')

  const reduce = resolveReducePrincipal(investedPrincipal, withdraw, reducePrincipal)
  const principal = Math.max(0, Number(investedPrincipal) || 0)
  const nextPrincipal = Math.max(0, principal - reduce)
  const realizedPnl = withdraw - reduce

  return {
    withdrawAmount: withdraw,
    reducePrincipal: reduce,
    realizedPnl,
    nextPrincipal
  }
}

/**
 * 投入/追加后本金
 */
export function planInvest(investedPrincipal, amount) {
  const a = Number(amount) || 0
  if (a <= 0) throw new Error('投入金额须大于 0')
  const prev = Math.max(0, Number(investedPrincipal) || 0)
  return {
    amount: a,
    nextPrincipal: prev + a
  }
}
