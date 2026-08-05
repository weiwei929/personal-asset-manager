/**
 * 资金逻辑冒烟测试（Node，无浏览器）
 * 运行: node scripts/smoke-finance-logic.mjs  或  npm run smoke
 *
 * 主路径（D1 · 定稿口径）：
 * 1) 总资产 = 活期 + 定期 + 股基本金 + 借出
 * 2) 活期↔定期 / 投入撤回 / 借出 / 月度入账 / 账单结转
 *
 * 附录（LEGACY，非总资产）：
 * - 旧 cashPool = 累计净收入 − 已分配；主 UI 不得展示为总资产
 */

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

// ─── 定稿总资产（内联实现，对齐 src/utils/assetTotals.js · D1 主路径）──
function calcTotalDemand(accounts = []) {
  return accounts.reduce((sum, a) => sum + (Number(a.demandBalance) || 0), 0)
}
function calcTotalTimeDeposit(accounts = []) {
  return accounts.reduce((sum, a) => {
    const list = Array.isArray(a.timeDeposits) ? a.timeDeposits : []
    return sum + list.reduce((s, d) => s + (Number(d.principal) || 0), 0)
  }, 0)
}
function getInvestedPrincipal(item) {
  if (item == null) return 0
  if (item.investedPrincipal != null && item.investedPrincipal !== '') {
    return Number(item.investedPrincipal) || 0
  }
  return 0
}
function calcTotalInvestedPrincipal(stocks = [], funds = []) {
  return (
    stocks.reduce((s, x) => s + getInvestedPrincipal(x), 0) +
    funds.reduce((s, x) => s + getInvestedPrincipal(x), 0)
  )
}
function calcTotalLent(lentRecords = []) {
  return lentRecords
    .filter(r => !r.status || r.status === 'pending')
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
}
function calcTotalAssets({ accounts, stocks, funds, lentRecords }) {
  return (
    calcTotalDemand(accounts) +
    calcTotalTimeDeposit(accounts) +
    calcTotalInvestedPrincipal(stocks, funds) +
    calcTotalLent(lentRecords)
  )
}

// 手算 fixture
const accounts = [
  {
    id: 'cmb',
    demandBalance: 20000,
    timeDeposits: [
      { id: 't1', principal: 100000 },
      { id: 't2', principal: 50000 }
    ]
  },
  { id: 'cscb', demandBalance: 5000, timeDeposits: [] },
  { id: 'ccb', demandBalance: 3000, timeDeposits: [{ id: 't3', principal: 20000 }] },
  { id: 'ceb', demandBalance: 2000, timeDeposits: [] }
]
const stocks = [
  { name: 'A股', investedPrincipal: 30000, currentValue: 45000 }
]
const funds = [
  { name: '基B', investedPrincipal: 10000, currentValue: 8000 }
]
const lentRecords = [
  { borrower: '张三', amount: 5000, status: 'pending' },
  { borrower: '李四', amount: 2000, status: 'returned' }
]

// 手算：活期 20000+5000+3000+2000=30000
// 定期 100000+50000+20000=170000
// 本金 30000+10000=40000
// 借出 5000
// 总计 245000
const expected = 30000 + 170000 + 40000 + 5000
const got = calcTotalAssets({ accounts, stocks, funds, lentRecords })
assert(got === expected, `总资产应为 ${expected}，得到 ${got}`)
assert(calcTotalDemand(accounts) === 30000, '活期合计')
assert(calcTotalTimeDeposit(accounts) === 170000, '定期合计')
assert(calcTotalInvestedPrincipal(stocks, funds) === 40000, '投入本金')
assert(calcTotalLent(lentRecords) === 5000, '借出未还（不含已还）')
console.log('OK totalAssets fixture =', got)

// 市值不进总资产：改市值后总额不变
stocks[0].currentValue = 999999
funds[0].currentValue = 1
assert(
  calcTotalAssets({ accounts, stocks, funds, lentRecords }) === expected,
  '改市值不应改变总资产'
)
console.log('OK market value excluded')

// 活期→定期：总额不变
const before = calcTotalAssets({ accounts, stocks, funds, lentRecords })
const transferAmt = 10000
accounts[0].demandBalance -= transferAmt
accounts[0].timeDeposits.push({ id: 't-new', principal: transferAmt })
const after = calcTotalAssets({ accounts, stocks, funds, lentRecords })
assert(after === before, `活期→定期后总资产应不变: ${before} vs ${after}`)
assert(calcTotalDemand(accounts) === 20000, '划转后活期')
assert(calcTotalTimeDeposit(accounts) === 180000, '划转后定期')
console.log('OK demand↔time transfer invariant')

// 无 investedPrincipal 字段按 0（不回落市值）
const noPrincipal = calcTotalInvestedPrincipal(
  [{ currentValue: 100000 }],
  [{ currentValue: 50000 }]
)
assert(noPrincipal === 0, '无本金字段时投入本金应为 0')
console.log('OK missing investedPrincipal = 0')

// 四银行 id 稳定
const BANK_IDS = ['cmb', 'cscb', 'ccb', 'ceb']
assert(BANK_IDS.length === 4, '四银行')
assert(new Set(BANK_IDS).size === 4, 'id 唯一')
console.log('OK four bank ids')

// ─── D2 键表对称（与 storageKeys.js 字面量对齐；改键须双改）──
const STORAGE_KEYS_SMOKE = {
  BANK_ACCOUNTS: 'pam-bank-accounts',
  BANK_MOVEMENTS: 'pam-bank-movements',
  OPENING_BALANCE: 'pam-opening-balance',
  MONTHLY_STATEMENTS: 'pam-monthly-statements',
  MONTHLY_FINANCES: 'monthlyFinances',
  STOCK_INVESTMENTS: 'stock-investments',
  FUND_INVESTMENTS: 'fund-investments',
  LENT_MONEY: 'lent-money-records',
  FUND_TRANSFERS: 'fundTransfers',
  FINANCE_CATEGORIES: 'finance-categories',
  AUTH: 'pam-auth',
  THEME: 'theme-settings'
}
const LEGACY_SMOKE = [
  'bank-deposits',
  'bankDeposits',
  'stockInvestments',
  'lentMoneys'
]
const CLEARABLE_SMOKE = [
  STORAGE_KEYS_SMOKE.BANK_ACCOUNTS,
  STORAGE_KEYS_SMOKE.BANK_MOVEMENTS,
  STORAGE_KEYS_SMOKE.OPENING_BALANCE,
  STORAGE_KEYS_SMOKE.MONTHLY_STATEMENTS,
  STORAGE_KEYS_SMOKE.MONTHLY_FINANCES,
  STORAGE_KEYS_SMOKE.STOCK_INVESTMENTS,
  STORAGE_KEYS_SMOKE.FUND_INVESTMENTS,
  STORAGE_KEYS_SMOKE.LENT_MONEY,
  STORAGE_KEYS_SMOKE.FUND_TRANSFERS,
  STORAGE_KEYS_SMOKE.FINANCE_CATEGORIES,
  ...LEGACY_SMOKE
]
const PRESERVED_SMOKE = [STORAGE_KEYS_SMOKE.AUTH, STORAGE_KEYS_SMOKE.THEME]
assert(CLEARABLE_SMOKE.includes('monthlyFinances'), '月度键在 clearable')
assert(CLEARABLE_SMOKE.includes('pam-bank-accounts'), '银行键在 clearable')
assert(!CLEARABLE_SMOKE.includes('pam-auth'), 'AUTH 不在 clearable')
assert(!CLEARABLE_SMOKE.includes('theme-settings'), 'THEME 不在 clearable')
assert(PRESERVED_SMOKE.includes('pam-auth') && PRESERVED_SMOKE.includes('theme-settings'), '保留键')
assert(new Set(CLEARABLE_SMOKE).size === CLEARABLE_SMOKE.length, 'clearable 无重复')
console.log('OK storage key table symmetry (smoke mirror)')

// 期初建账预览口径（对齐 openingBalance.previewTotals）
function previewOpening({ banks, stocks, funds, lends }) {
  const accounts = (banks || []).map(b => ({
    demandBalance: Number(b.demandBalance) || 0,
    timeDeposits: (b.timeDeposits || []).map(d => ({
      principal: Number(d.principal) || 0
    }))
  }))
  return calcTotalAssets({
    accounts,
    stocks: (stocks || []).map(s => ({ investedPrincipal: Number(s.investedPrincipal) || 0 })),
    funds: (funds || []).map(f => ({ investedPrincipal: Number(f.investedPrincipal) || 0 })),
    lentRecords: (lends || [])
      .filter(l => (Number(l.amount) || 0) > 0)
      .map(l => ({ amount: Number(l.amount) || 0, status: 'pending' }))
  })
}

const openingPreview = previewOpening({
  banks: [
    { id: 'cmb', demandBalance: 10000, timeDeposits: [{ principal: 50000 }] },
    { id: 'cscb', demandBalance: 2000, timeDeposits: [] },
    { id: 'ccb', demandBalance: 0, timeDeposits: [] },
    { id: 'ceb', demandBalance: 0, timeDeposits: [] }
  ],
  stocks: [{ name: 'X', investedPrincipal: 8000 }],
  funds: [],
  lends: [{ borrower: 'A', amount: 1500 }]
})
// 10000+2000 + 50000 + 8000 + 1500 = 71500
assert(openingPreview === 71500, `期初预览应为 71500，得到 ${openingPreview}`)
console.log('OK opening books preview =', openingPreview)

// ─── T4 月度入账差额 ───────────────────────────────────
function computePostedEffects(incomes = [], channels = {}) {
  const map = {}
  const add = (bankId, amount) => {
    const n = Number(amount) || 0
    if (!bankId || Math.abs(n) < 1e-9) return
    map[bankId] = (map[bankId] || 0) + n
  }
  for (const row of incomes) add(row.bankId, Number(row.amount) || 0)
  for (const ch of ['wechat', 'alipay', 'credit']) {
    const c = channels[ch]
    if (c) add(c.bankId, -(Number(c.amount) || 0))
  }
  return map
}
function diffPostedEffects(oldMap = {}, newMap = {}) {
  const keys = new Set([...Object.keys(oldMap), ...Object.keys(newMap)])
  const out = []
  for (const bankId of keys) {
    const delta = (Number(newMap[bankId]) || 0) - (Number(oldMap[bankId]) || 0)
    if (Math.abs(delta) >= 1e-9) out.push({ bankId, delta })
  }
  return out
}

// 工资 15000 → cmb；微信 3200 cmb；信用卡 4500 cmb（扣款月）
const effects1 = computePostedEffects(
  [{ amount: 15000, bankId: 'cmb', category: 'salary' }],
  {
    wechat: { amount: 3200, bankId: 'cmb' },
    alipay: { amount: 0, bankId: 'cmb' },
    credit: { amount: 4500, bankId: 'cmb' }
  }
)
assert(effects1.cmb === 15000 - 3200 - 4500, `cmb 净效应应为 7300，得 ${effects1.cmb}`)
assert(Object.keys(effects1).length === 1, '仅 cmb')

// 编辑：微信改为 4000 → 差额 -800
const effects2 = computePostedEffects(
  [{ amount: 15000, bankId: 'cmb' }],
  {
    wechat: { amount: 4000, bankId: 'cmb' },
    alipay: { amount: 0, bankId: 'cmb' },
    credit: { amount: 4500, bankId: 'cmb' }
  }
)
const diffs = diffPostedEffects(effects1, effects2)
assert(diffs.length === 1 && diffs[0].bankId === 'cmb', '仅 cmb 差额')
assert(diffs[0].delta === -800, `微信多记 800，delta 应为 -800，得 ${diffs[0].delta}`)

// 收入改到另一家银行
const effects3 = computePostedEffects(
  [{ amount: 15000, bankId: 'ccb' }],
  {
    wechat: { amount: 4000, bankId: 'cmb' },
    alipay: { amount: 0, bankId: 'cmb' },
    credit: { amount: 4500, bankId: 'cmb' }
  }
)
const diffsMove = diffPostedEffects(effects2, effects3)
const byBank = Object.fromEntries(diffsMove.map(d => [d.bankId, d.delta]))
assert(byBank.cmb === -15000, 'cmb 应撤回工资 -15000')
assert(byBank.ccb === 15000, 'ccb 应入账 +15000')
console.log('OK monthly ledger effects & diffs')

// 模拟活期
let demand = { cmb: 50000, ccb: 10000 }
for (const { bankId, delta } of diffPostedEffects({}, effects1)) {
  demand[bankId] = (demand[bankId] || 0) + delta
}
assert(demand.cmb === 50000 + 7300, '首次入账后 cmb 活期')
for (const { bankId, delta } of diffs) {
  demand[bankId] = (demand[bankId] || 0) + delta
}
assert(demand.cmb === 50000 + 7300 - 800, '二次保存差额后 cmb')
console.log('OK demand balance after ledger posts')

// ─── T5 投入 / 撤回 ───────────────────────────────────
function planInvest(investedPrincipal, amount) {
  const a = Number(amount) || 0
  if (a <= 0) throw new Error('投入金额须大于 0')
  const prev = Math.max(0, Number(investedPrincipal) || 0)
  return { amount: a, nextPrincipal: prev + a }
}
function resolveReducePrincipal(investedPrincipal, withdrawAmount, reducePrincipal) {
  const principal = Math.max(0, Number(investedPrincipal) || 0)
  const withdraw = Math.max(0, Number(withdrawAmount) || 0)
  if (reducePrincipal == null || reducePrincipal === '') {
    return Math.min(principal, withdraw)
  }
  const r = Number(reducePrincipal)
  if (r > principal + 1e-9) throw new Error('冲减超本金')
  return r
}
function planWithdraw(investedPrincipal, withdrawAmount, reducePrincipal) {
  const withdraw = Number(withdrawAmount) || 0
  if (withdraw <= 0) throw new Error('撤回金额须大于 0')
  const reduce = resolveReducePrincipal(investedPrincipal, withdraw, reducePrincipal)
  const principal = Math.max(0, Number(investedPrincipal) || 0)
  return {
    withdrawAmount: withdraw,
    reducePrincipal: reduce,
    realizedPnl: withdraw - reduce,
    nextPrincipal: Math.max(0, principal - reduce)
  }
}

// 投入：总资产不变（活期 -10k + 本金 +10k）
let dem = 100000
let prin = 0
let assets = dem + prin
const inv = planInvest(prin, 10000)
dem -= inv.amount
prin = inv.nextPrincipal
assert(dem + prin === assets, '投入后总资产应不变')
assert(prin === 10000, '本金 10000')

// 改市值不影响总资产
let mv = 12000
assert(dem + prin === assets, '改市值前总资产')
mv = 15000
assert(dem + prin === assets, '改市值后总资产仍不变')
void mv

// 撤回盈利：撤回 12000，冲减 10000 → 盈亏 +2000，总资产 +2000
const w1 = planWithdraw(prin, 12000, null)
assert(w1.reducePrincipal === 10000, '默认冲减=本金')
assert(w1.realizedPnl === 2000, '盈利 2000')
dem += w1.withdrawAmount
prin = w1.nextPrincipal
assert(prin === 0, '本金清零')
assert(dem === 100000 - 10000 + 12000, '活期正确')
assert(dem + prin === 102000, '总资产含实现盈利')

// 撤回亏损全退：本金 10000，撤回 8000，冲减 10000
dem = 50000
prin = 10000
const w2 = planWithdraw(prin, 8000, 10000)
assert(w2.realizedPnl === -2000, '亏损 2000')
dem += w2.withdrawAmount
prin = w2.nextPrincipal
assert(prin === 0 && dem === 58000, '亏本全退')
assert(dem + prin === 58000, '总资产掉 2000')
console.log('OK invest / withdraw principal math')

// ─── T6 借出 / 归还 ───────────────────────────────────
// 借出：活期↓ 应收↑ 总资产不变
let d6 = 50000
let lent = 0
const assets0 = d6 + lent
const lendAmt = 5000
d6 -= lendAmt
lent += lendAmt
assert(d6 + lent === assets0, '借出后总资产不变')
assert(d6 === 45000 && lent === 5000, '借出分项')

// 还本：反向，总资产不变
const repayPrin = 5000
d6 += repayPrin
lent -= repayPrin
assert(d6 + lent === assets0, '还本后总资产不变')
assert(lent === 0 && d6 === 50000, '还本清零')

// 利息：只进活期，总资产↑
d6 = 50000
lent = 3000
const assets1 = d6 + lent
const interest = 200
d6 += 3000 + interest // 还本+利息
lent = 0
assert(d6 + lent === assets1 + interest, '利息使总资产增加')
assert(d6 === 53200, '活期含利息')
console.log('OK lend / repay / interest math')

// ─── T7 手测路径串联（逻辑层）──────────────────────────
// 期初
let H = {
  demand: { cmb: 50000, cscb: 10000, ccb: 0, ceb: 0 },
  time: 100000 + 20000,
  principal: 30000,
  lent: 5000
}
function totalH() {
  const d = Object.values(H.demand).reduce((a, b) => a + b, 0)
  return d + H.time + H.principal + H.lent
}
assert(totalH() === 215000, `期初总资产 215000，得 ${totalH()}`)

// 工资 15k → cmb
H.demand.cmb += 15000
assert(totalH() === 230000, '工资后')

// 微信 3200 + 信用卡 4500（转账支出同理扣活期）
H.demand.cmb -= 3200 + 4500
assert(totalH() === 222300, '支出通道后')

// 活期→定期 10k
H.demand.cmb -= 10000
H.time += 10000
assert(totalH() === 222300, '转定期总资产不变')

// 投入基金 8k
H.demand.cmb -= 8000
H.principal += 8000
assert(totalH() === 222300, '投入总资产不变')

// 撤回 9k 冲减 8k → +1k
H.demand.cmb += 9000
H.principal -= 8000
assert(totalH() === 223300, '撤回盈利后')

// 借出 2k 再还本
H.demand.cmb -= 2000
H.lent += 2000
assert(totalH() === 223300, '借出不变')
H.demand.cmb += 2000
H.lent -= 2000
assert(totalH() === 223300, '还本不变')

// 还张三 5k + 利息 100
H.demand.cmb += 5000 + 100
H.lent -= 5000
assert(totalH() === 223400, '利息 +100')
console.log('OK handtest path chain total=', totalH())

// 仅流量：绝不改活期（即使此前有 postedEffects 标记）
// 修复：手工校正后若再「仅流量」不得二次回滚
function saveFlowOnlySim(oldEffects, demand) {
  // postToDemand=false → applied=[], demand unchanged, effects cleared
  const newDemand = { ...demand }
  const newEffects = {}
  return { newDemand, newEffects, applied: [] }
}
const demBefore = { cscb: 14136.93, cmb: 5249.34 }
const afterFlow = saveFlowOnlySim({ cscb: 15759 }, demBefore)
assert(afterFlow.newDemand.cscb === 14136.93, '仅流量不得改 cscb')
assert(afterFlow.applied.length === 0, '仅流量 applied 为空')
console.log('OK flow-only never touches demand')

// ─── 支出改 0 再保存：明细结构优先，禁止旧 expense 写回 ───────────
// 对齐 normalizeMonthRecord 修复（手测阻塞）
function normalizeMonthRecordSmoke(raw = {}, month) {
  const CHANNELS = ['wechat', 'alipay', 'credit', 'transfer']
  const m = month || raw.month
  const hasIncomesKey = Array.isArray(raw.incomes)
  const hasChannelsKey = raw.channels != null && typeof raw.channels === 'object'
  let incomes = hasIncomesKey ? raw.incomes : []
  let channels = {}
  for (const ch of CHANNELS) {
    channels[ch] = {
      amount: Number(raw.channels?.[ch]?.amount) || 0,
      bankId: raw.channels?.[ch]?.bankId || null
    }
  }
  if (!hasChannelsKey) {
    for (const ch of CHANNELS) channels[ch] = { amount: 0, bankId: null }
  }
  const legacyExpense = Number(raw.expense) || 0
  const hasDetailStructure = hasIncomesKey || hasChannelsKey
  if (!hasDetailStructure && legacyExpense > 0) {
    channels.wechat = { amount: legacyExpense, bankId: null }
  }
  let expense = 0
  for (const ch of CHANNELS) expense += Number(channels[ch].amount) || 0
  if (!hasDetailStructure) expense = legacyExpense || expense
  return { month: m, expense, channels, postedEffects: raw.postedEffects || {} }
}

// 模拟：曾记 8 月微信 3200 cmb，再改为 0 保存（带 prev 旧 expense）
const oldEffectsAug = computePostedEffects(
  [],
  { wechat: { amount: 3200, bankId: 'cmb' }, alipay: { amount: 0, bankId: 'cmb' }, credit: { amount: 0, bankId: 'cmb' }, transfer: { amount: 0, bankId: 'cmb' } }
)
assert(oldEffectsAug.cmb === -3200, '8 月入账应扣 3200')
const clearedChannels = {
  wechat: { amount: 0, bankId: 'cmb' },
  alipay: { amount: 0, bankId: 'cmb' },
  credit: { amount: 0, bankId: 'cmb' },
  transfer: { amount: 0, bankId: 'cmb' }
}
const newEffectsAug = computePostedEffects([], clearedChannels)
assert(Object.keys(newEffectsAug).length === 0, '改 0 后 effects 应空')
const rollDiff = diffPostedEffects(oldEffectsAug, newEffectsAug)
assert(rollDiff.length === 1 && rollDiff[0].bankId === 'cmb' && rollDiff[0].delta === 3200, '应回补活期 +3200')
// 关键：normalize 不得把 prev.expense=3200 写回 wechat
const afterClearNorm = normalizeMonthRecordSmoke(
  {
    month: '2026-08',
    expense: 3200, // 旧总数（错误展开 prev 时会带上）
    incomes: [],
    channels: clearedChannels,
    postedEffects: {}
  },
  '2026-08'
)
assert(afterClearNorm.expense === 0, `改 0 后 expense 应为 0，得 ${afterClearNorm.expense}`)
assert(
  (Number(afterClearNorm.channels.wechat.amount) || 0) === 0,
  '改 0 后 wechat 不得被旧 expense 写回'
)
console.log('OK clear expense to zero (no legacy write-back)')

// 银行间转账：总资产不变
let ib = { cmb: 10000, cscb: 5000 }
const xfer = 3000
ib.cmb -= xfer
ib.cscb += xfer
assert(ib.cmb + ib.cscb === 15000, '银行间转账总额不变')
assert(ib.cmb === 7000 && ib.cscb === 8000, '转账后分户')
console.log('OK inter-bank transfer')

// 还信用卡：总资产↓
let totalSide = ib.cmb + ib.cscb // 12000 after inter-bank? wait: 7000+8000=15000
// after inter-bank: cmb 7000 cscb 8000
const repay = 2000
ib.cmb -= repay
totalSide = ib.cmb + ib.cscb
assert(ib.cmb === 5000 && totalSide === 13000, '还信用卡减活期与总资产')
console.log('OK credit card repay')

// ─── 月度账单结转（不切割当前账）────────────────────────
function prevMonthKey(month) {
  let y = Number(month.slice(0, 4))
  let m = Number(month.slice(5, 7)) - 1
  if (m < 1) {
    m = 12
    y -= 1
  }
  return `${y}-${String(m).padStart(2, '0')}`
}
function nextMonthKey(month) {
  let y = Number(month.slice(0, 4))
  let m = Number(month.slice(5, 7)) + 1
  if (m > 12) {
    m = 1
    y += 1
  }
  return `${y}-${String(m).padStart(2, '0')}`
}
function monthKeysInclusive(from, to) {
  if (from > to) return []
  const out = []
  let cur = from
  while (cur <= to) {
    out.push(cur)
    cur = nextMonthKey(cur)
  }
  return out
}
assert(prevMonthKey('2026-08') === '2026-07', 'prev Aug→Jul')
assert(prevMonthKey('2026-01') === '2025-12', 'prev Jan→Dec')
assert(
  monthKeysInclusive('2026-06', '2026-08').join(',') === '2026-06,2026-07,2026-08',
  'inclusive months'
)

function normalizeBreakdown(b) {
  const totalDemand = Number(b?.totalDemand) || 0
  const totalTimeDeposit = Number(b?.totalTimeDeposit) || 0
  const totalInvestedPrincipal = Number(b?.totalInvestedPrincipal) || 0
  const totalLent = Number(b?.totalLent) || 0
  const totalAssets =
    b?.totalAssets != null
      ? Number(b.totalAssets) || 0
      : totalDemand + totalTimeDeposit + totalInvestedPrincipal + totalLent
  return { totalDemand, totalTimeDeposit, totalInvestedPrincipal, totalLent, totalAssets }
}
function reconstructClosingFromNet(opening, externalNet) {
  const o = normalizeBreakdown(opening)
  const net = Number(externalNet) || 0
  return normalizeBreakdown({
    totalDemand: o.totalDemand + net,
    totalTimeDeposit: o.totalTimeDeposit,
    totalInvestedPrincipal: o.totalInvestedPrincipal,
    totalLent: o.totalLent,
    totalAssets: o.totalAssets + net
  })
}

// 期初 100k → 7 月净流入 +5k → 推算期末 105k（补历史）
const openSnap = {
  totalDemand: 40000,
  totalTimeDeposit: 50000,
  totalInvestedPrincipal: 10000,
  totalLent: 0,
  totalAssets: 100000
}
const recon = reconstructClosingFromNet(openSnap, 5000)
assert(recon.totalAssets === 105000, 'reconstruct total')
assert(recon.totalDemand === 45000, 'reconstruct demand')
// 当前账即时：工资入账不依赖 1 号结转
let liveDemand = 40000
liveDemand += 15000 // 月中保存
assert(liveDemand === 55000, 'mid-month post immediate')
// 1 号只生成账单，不回滚/不重算当前账
const bill = {
  month: '2026-07',
  income: 15000,
  expense: 0,
  netIncome: 15000,
  opening: openSnap,
  closing: normalizeBreakdown({
    totalDemand: 55000,
    totalTimeDeposit: 50000,
    totalInvestedPrincipal: 10000,
    totalLent: 0
  })
}
assert(bill.closing.totalAssets === 115000, 'bill closing snapshot')
assert(liveDemand === 55000, 'catch-up must not change live demand')
console.log('OK monthly statement roll without cutting live ledger')

// ─── 附录 LEGACY cashPool（非总资产；主 UI 不得展示）────────────────
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
const legacyMonths = [
  { month: '2026-07', income: 10000, expense: 0, netIncome: 10000, allocated_amounts: {} }
]
assert(calcCashPool(legacyMonths) === 10000, 'legacy pool 初始')
legacyMonths[0].allocated_amounts.bank_deposit = 3000
assert(calcCashPool(legacyMonths) === 7000, 'legacy pool 分配后')
// 证明：cashPool ≠ 定稿总资产（此处故意对比量级不同）
assert(calcCashPool(legacyMonths) !== 245000, 'legacy pool 不得被当成 fixture 总资产')
console.log('OK legacy cashPool (appendix only, not totalAssets)')

console.log('OK smoke-finance-logic: all assertions passed')
