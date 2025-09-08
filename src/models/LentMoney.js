// 借出资金数据模型
export default class LentMoney {
  constructor(id, borrower, amount, lendDate, expectedReturnDate, actualReturnDate = null, notes = '') {
    this.id = id;
    this.borrower = borrower; // 借出人
    this.amount = amount; // 资金数量
    this.lendDate = lendDate; // 借出日期
    this.expectedReturnDate = expectedReturnDate; // 预计还款时间
    this.actualReturnDate = actualReturnDate; // 实际还款时间
    this.notes = notes; // 备注
    this.status = actualReturnDate ? 'returned' : 'pending'; // 状态
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  // 创建新的借出资金记录
  static create(borrower, amount, lendDate, expectedReturnDate, notes = '') {
    const id = Date.now().toString();
    return new LentMoney(id, borrower, amount, lendDate, expectedReturnDate, null, notes);
  }

  // 获取剩余天数
  getDaysUntilExpectedReturn() {
    const today = new Date();
    const expected = new Date(this.expectedReturnDate);
    const diffTime = expected - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  // 检查是否即将到期（30天内）
  isMaturingSoon() {
    if (this.status === 'returned') return false;
    const days = this.getDaysUntilExpectedReturn();
    return days >= 0 && days <= 30;
  }

  // 检查是否已到期
  isOverdue() {
    if (this.status === 'returned') return false;
    return this.getDaysUntilExpectedReturn() < 0;
  }

  // 格式化到期状态
  getStatusText() {
    if (this.status === 'returned') return '已还款';

    const days = this.getDaysUntilExpectedReturn();
    if (days < 0) return `逾期 ${Math.abs(days)} 天`;
    if (days === 0) return '今日到期';
    if (days <= 7) return `${days} 天后到期`;
    if (days <= 30) return `${days} 天后到期`;
    return '正常';
  }

  // 获取状态颜色
  getStatusColor() {
    if (this.status === 'returned') return '#67C23A'; // 绿色 - 已还款

    const days = this.getDaysUntilExpectedReturn();
    if (days < 0) return '#F56C6C'; // 红色 - 逾期
    if (days === 0) return '#E6A23C'; // 橙色 - 今日到期
    if (days <= 7) return '#F56C6C'; // 红色 - 7天内到期
    if (days <= 30) return '#E6A23C'; // 橙色 - 30天内到期
    return '#909399'; // 灰色 - 正常
  }

  // 标记为已还款
  markAsReturned(actualReturnDate = null) {
    this.actualReturnDate = actualReturnDate || new Date().toISOString().split('T')[0];
    this.status = 'returned';
    this.updatedAt = new Date().toISOString();
  }

  // 更新信息
  update(borrower, amount, lendDate, expectedReturnDate, notes) {
    this.borrower = borrower;
    this.amount = amount;
    this.lendDate = lendDate;
    this.expectedReturnDate = expectedReturnDate;
    this.notes = notes;
    this.updatedAt = new Date().toISOString();
  }
}