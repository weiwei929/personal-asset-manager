// 股票投资数据模型
export default class StockInvestment {
  constructor(id, name, currentValue, accountBalance, shares = null) {
    this.id = id;
    this.name = name; // 股票名称
    this.currentValue = currentValue; // 当月市值
    this.accountBalance = accountBalance; // 账户余额
    this.shares = shares; // 持股数量（可选）
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  // 创建新股票投资
  static create(name, currentValue, accountBalance, shares = null) {
    const id = Date.now().toString();
    return new StockInvestment(id, name, currentValue, accountBalance, shares);
  }

  // 计算收益率（如果有持股数量的话）
  getYieldRate() {
    if (!this.shares) return null;

    // 这里可以根据历史数据计算收益率
    // 暂时返回null，表示需要更多数据
    return null;
  }

  // 获取总资产
  getTotalAssets() {
    return this.currentValue + this.accountBalance;
  }

  // 更新数据
  update(currentValue, accountBalance, shares = null) {
    this.currentValue = currentValue;
    this.accountBalance = accountBalance;
    if (shares !== null) {
      this.shares = shares;
    }
    this.updatedAt = new Date().toISOString();
  }
}