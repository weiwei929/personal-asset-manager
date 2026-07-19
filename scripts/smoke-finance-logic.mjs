/**
 * 无浏览器环境的资金池逻辑冒烟测试（Node）
 * 运行: node scripts/smoke-finance-logic.mjs
 */

function calcCashPool(monthlyFinances) {
  const totalNet = monthlyFinances.reduce((sum, mf) => {
    const net = typeof mf.netIncome === 'number'
      ? mf.netIncome
      : (Number(mf.income) || 0) - (Number(mf.expense) || 0)
    return sum + net
  }, 0)
  const allocated = monthlyFinances.reduce((sum, mf) => {
    const a = mf.allocated_amounts || {}
    return sum + Object.values(a).reduce((x, y) => x + (Number(y) || 0), 0)
  }, 0)
  return Math.max(0, totalNet - allocated)
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

// 场景：收入 10000，分配 3000 到存款
const months = [
  { month: '2026-07', income: 10000, expense: 0, netIncome: 10000, allocated_amounts: {} }
]
assert(calcCashPool(months) === 10000, '初始资金池应为 10000')

months[0].allocated_amounts.bank_deposit = 3000
assert(calcCashPool(months) === 7000, '分配 3000 后资金池应为 7000')

// 致命回归：若 netIncome 未随 income 更新会错
const bad = [{ income: 5000, expense: 0, netIncome: 0, allocated_amounts: {} }]
// 加载校正逻辑
bad.forEach(mf => {
  mf.netIncome = (Number(mf.income) || 0) - (Number(mf.expense) || 0)
})
assert(calcCashPool(bad) === 5000, '校正 netIncome 后资金池应为 5000')

// 回收
months[0].allocated_amounts.bank_deposit = 0
delete months[0].allocated_amounts.bank_deposit
assert(calcCashPool(months) === 10000, '回收后资金池应回到 10000')

console.log('OK smoke-finance-logic: all assertions passed')
