// 基金投资数据模型（字段对齐股票，份额 units 对应持股 shares）
export default class FundProduct {
  constructor(id, name, currentValue, accountBalance, units = null) {
    this.id = id
    this.name = name
    this.currentValue = currentValue // 市值
    this.accountBalance = accountBalance // 账户余额 / 可用资金
    this.units = units // 基金份额（可选）
    this.createdAt = new Date().toISOString()
    this.updatedAt = new Date().toISOString()
  }

  static create(name, currentValue, accountBalance, units = null) {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 7)
    return new FundProduct(id, name, currentValue, accountBalance, units)
  }

  getTotalAssets() {
    return (Number(this.currentValue) || 0) + (Number(this.accountBalance) || 0)
  }

  update(currentValue, accountBalance, units = null) {
    this.currentValue = currentValue
    this.accountBalance = accountBalance
    if (units !== null) {
      this.units = units
    }
    this.updatedAt = new Date().toISOString()
  }
}
