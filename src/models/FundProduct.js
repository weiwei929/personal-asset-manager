// 基金：字段对齐股票
export default class FundProduct {
  constructor(
    id,
    name,
    currentValue = 0,
    accountBalance = 0,
    units = null,
    investedPrincipal = 0
  ) {
    this.id = id
    this.name = name
    this.currentValue = Number(currentValue) || 0
    this.accountBalance = Number(accountBalance) || 0
    this.units = units
    this.investedPrincipal = Number(investedPrincipal) || 0
    this.createdAt = new Date().toISOString()
    this.updatedAt = new Date().toISOString()
  }

  static create(name, currentValue, accountBalance, units = null, investedPrincipal = 0) {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const principal =
      investedPrincipal > 0
        ? Number(investedPrincipal) || 0
        : Number(accountBalance) || 0
    return new FundProduct(id, name, currentValue, accountBalance, units, principal)
  }

  getUnrealizedPnl() {
    return (Number(this.currentValue) || 0) - (Number(this.investedPrincipal) || 0)
  }

  getTotalAssets() {
    return (Number(this.currentValue) || 0) + (Number(this.accountBalance) || 0)
  }

  updateMarketValue(currentValue, units = null) {
    this.currentValue = Number(currentValue) || 0
    if (units !== null) this.units = units
    this.updatedAt = new Date().toISOString()
  }

  update(currentValue, accountBalance, units = null) {
    this.currentValue = Number(currentValue) || 0
    this.accountBalance = Number(accountBalance) || 0
    if (units !== null) this.units = units
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
