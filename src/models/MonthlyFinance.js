// 月度收支数据模型（T4：收入明细 + 三通道 + 入账差额）
import {
  deriveMonthTotals,
  normalizeMonthRecord
} from '../utils/monthlyLedger.js'
import { emptyChannels } from '../constants/channels.js'

export default class MonthlyFinance {
  constructor(month, income = 0, expense = 0, cumulativeNet = 0) {
    this.id = month
    this.month = month
    this.incomes = []
    this.channels = emptyChannels(null)
    // 兼容：总数可由明细推导
    this.income = income
    this.expense = expense
    this.netIncome = income - expense
    this.cumulativeNet = cumulativeNet
    this.postedEffects = {}
    this.allocated_amounts = {}
    this.transfers = []
    this.isArchived = false
    this.createdAt = new Date().toISOString()
    this.updatedAt = new Date().toISOString()
  }

  static getCurrentMonth() {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  static getPreviousMonth(month) {
    const [year, mon] = month.split('-').map(Number)
    const date = new Date(year, mon - 1, 1)
    date.setMonth(date.getMonth() - 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }

  static getNextMonth(month) {
    const [year, mon] = month.split('-').map(Number)
    const date = new Date(year, mon - 1, 1)
    date.setMonth(date.getMonth() + 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }

  static formatMonth(month) {
    const [year, mon] = month.split('-')
    return `${year}年${mon}月`
  }

  static fromJSON(raw) {
    const n = normalizeMonthRecord(raw, raw?.month || raw?.id)
    const mf = new MonthlyFinance(n.month, n.income, n.expense)
    Object.assign(mf, n)
    return mf
  }

  /** 从明细重算 income / expense / netIncome */
  recomputeTotals() {
    const t = deriveMonthTotals(this.incomes, this.channels)
    this.income = t.income
    this.expense = t.expense
    this.netIncome = t.netIncome
    this.updatedAt = new Date().toISOString()
    return t
  }

  /**
   * 旧 API：仅总数（不改明细时使用）
   */
  update(income, expense) {
    this.income = Number(income) || 0
    this.expense = Number(expense) || 0
    this.netIncome = this.income - this.expense
    this.updatedAt = new Date().toISOString()
  }

  /**
   * 写入明细并重算
   */
  setDetail({ incomes, channels } = {}) {
    if (Array.isArray(incomes)) this.incomes = incomes
    if (channels) this.channels = { ...this.channels, ...channels }
    this.recomputeTotals()
  }

  calculateCumulative(previousCumulative = 0) {
    this.cumulativeNet = previousCumulative + this.netIncome
    return this.cumulativeNet
  }

  getAllocatedAmount() {
    if (!this.allocated_amounts) {
      this.allocated_amounts = {}
      return 0
    }
    return Object.values(this.allocated_amounts).reduce(
      (sum, amount) => sum + (Number(amount) || 0),
      0
    )
  }

  getAvailableAmount() {
    return Math.max(0, this.netIncome - this.getAllocatedAmount())
  }

  getTransferSummary() {
    if (!this.allocated_amounts) this.allocated_amounts = {}
    return { ...this.allocated_amounts }
  }

  canTransfer(amount) {
    const available = this.getAvailableAmount()
    return amount > 0 && amount <= available
  }

  archive() {
    this.isArchived = true
    this.updatedAt = new Date().toISOString()
  }
}
