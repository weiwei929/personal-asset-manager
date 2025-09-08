// 银行存款数据模型
export default class BankDeposit {
  constructor(id, productName, maturityDate, amount, interestRate, term, maturityInterest, notes) {
    this.id = id;
    this.productName = productName; // 产品名称
    this.maturityDate = maturityDate; // 到期时间
    this.amount = amount; // 存款数量
    this.interestRate = interestRate; // 利率
    this.term = term; // 存期
    this.maturityInterest = maturityInterest; // 到期利息
    this.notes = notes; // 备注
    this.createdAt = new Date().toISOString();
  }

  // 静态方法：创建新存款
  static create(productName, maturityDate, amount, interestRate, term, maturityInterest, notes) {
    const id = Date.now().toString();
    return new BankDeposit(id, productName, maturityDate, amount, interestRate, term, maturityInterest, notes);
  }

  // 从CSV行创建存款对象
  static fromCSV(csvRow) {
    const [index, productName, maturityDate, amountStr, interestRateStr, term, maturityInterestStr, notes] = csvRow;

    // 清理金额字符串（移除¥符号、双引号和空格，然后移除逗号）
    const cleanAmountStr = amountStr.replace(/[¥,"]/g, '').replace(/,/g, '').trim();
    const cleanInterestStr = maturityInterestStr.replace(/[¥,"]/g, '').replace(/,/g, '').trim();

    const amount = parseFloat(cleanAmountStr) || 0;
    const interestRate = parseFloat(interestRateStr) || 0;
    const maturityInterest = parseFloat(cleanInterestStr) || 0;

    return new BankDeposit(
      index.toString(),
      productName,
      maturityDate,
      amount,
      interestRate,
      term,
      maturityInterest,
      notes || ''
    );
  }

  // 计算剩余天数
  getDaysUntilMaturity() {
    const today = new Date();
    const maturity = new Date(this.maturityDate);
    const diffTime = maturity - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  // 检查是否即将到期（30天内）
  isMaturingSoon() {
    const days = this.getDaysUntilMaturity();
    return days >= 0 && days <= 30;
  }

  // 检查是否已到期
  isMatured() {
    return this.getDaysUntilMaturity() < 0;
  }

  // 格式化到期状态
  getMaturityStatus() {
    const days = this.getDaysUntilMaturity();
    if (days < 0) return '已到期';
    if (days === 0) return '今日到期';
    if (days <= 7) return `${days}天后到期`;
    if (days <= 30) return `${days}天后到期`;
    return '正常';
  }

  // 获取状态颜色
  getStatusColor() {
    const days = this.getDaysUntilMaturity();
    if (days < 0) return '#F56C6C'; // 红色 - 已到期
    if (days === 0) return '#E6A23C'; // 橙色 - 今日到期
    if (days <= 7) return '#F56C6C'; // 红色 - 7天内到期
    if (days <= 30) return '#E6A23C'; // 橙色 - 30天内到期
    return '#67C23A'; // 绿色 - 正常
  }
}