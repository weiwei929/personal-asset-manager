// 月度收支数据模型
export default class MonthlyFinance {
  constructor(month, income = 0, expense = 0, cumulativeNet = 0) {
    this.id = month; // 格式: "2024-01"
    this.month = month;
    this.income = income; // 当月收入
    this.expense = expense; // 当月支出
    this.netIncome = income - expense; // 月净收入
    this.cumulativeNet = cumulativeNet; // 累积净收入
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  // 获取当前月份
  static getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  // 获取上一个月
  static getPreviousMonth(month) {
    const [year, mon] = month.split('-').map(Number);
    const date = new Date(year, mon - 1, 1);
    date.setMonth(date.getMonth() - 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  // 获取下一个月
  static getNextMonth(month) {
    const [year, mon] = month.split('-').map(Number);
    const date = new Date(year, mon - 1, 1);
    date.setMonth(date.getMonth() + 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  // 格式化月份显示
  static formatMonth(month) {
    const [year, mon] = month.split('-');
    return `${year}年${mon}月`;
  }

  // 更新数据
  update(income, expense) {
    this.income = income;
    this.expense = expense;
    this.netIncome = income - expense;
    this.updatedAt = new Date().toISOString();
  }

  // 计算累积净收入
  calculateCumulative(previousCumulative = 0) {
    this.cumulativeNet = previousCumulative + this.netIncome;
    return this.cumulativeNet;
  }
}