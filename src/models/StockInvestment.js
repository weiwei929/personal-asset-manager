// 股票投资：投入本金进总资产；市值仅观察；撤回才实现盈亏
export default class StockInvestment {
  constructor(
    id,
    name,
    currentValue = 0,
    accountBalance = 0,
    shares = null,
    investedPrincipal = 0
  ) {
    this.id = id
    this.name = name
    this.currentValue = Number(currentValue) || 0
    this.accountBalance = Number(accountBalance) || 0 // 旧字段，不再进总资产
    this.shares = shares
    this.investedPrincipal = Number(investedPrincipal) || 0
    this.createdAt = new Date().toISOString()
    this.updatedAt = new Date().toISOString()
  }

  static create(name, currentValue, accountBalance, shares = null, investedPrincipal = 0) {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const principal =
      investedPrincipal > 0
        ? Number(investedPrincipal) || 0
        : Number(accountBalance) || 0
    return new StockInvestment(id, name, currentValue, accountBalance, shares, principal)
  }

  /** 浮盈亏（观察）= 市值 − 投入本金 */
  getUnrealizedPnl() {
    return (Number(this.currentValue) || 0) - (Number(this.investedPrincipal) || 0)
  }

  /** 旧语义保留 */
  getTotalAssets() {
    return (Number(this.currentValue) || 0) + (Number(this.accountBalance) || 0)
  }

  updateMarketValue(currentValue, shares = null) {
    this.currentValue = Number(currentValue) || 0
    if (shares !== null) this.shares = shares
    this.updatedAt = new Date().toISOString()
  }

  /** @deprecated 用 updateMarketValue / 本金动作 */
  update(currentValue, accountBalance, shares = null) {
    this.currentValue = Number(currentValue) || 0
    this.accountBalance = Number(accountBalance) || 0
    if (shares !== null) this.shares = shares
    this.updatedAt = new Date().toISOString()
  }

  addPrincipal(amount) {
    const a = Number(amount) || 0
    this.investedPrincipal = (Number(this.investedPrincipal) || 0) + a
    this.updatedAt = new Date().toISOString()
  }

  setPrincipal(amount) {
    this.investedPrincipal = Math.max(0, Number(amount) || 0)
    this.updatedAt = new Date().toISOString()
  }
}
