// 交易记录数据模型
export default class Transaction {
  constructor(id, type, amount, category, description, date) {
    this.id = id;
    this.type = type; // 'income' 或 'expense'
    this.amount = amount;
    this.category = category;
    this.description = description;
    this.date = date;
  }

  // 静态方法：创建新交易
  static create(type, amount, category, description) {
    const id = Date.now().toString();
    const date = new Date().toISOString();
    return new Transaction(id, type, amount, category, description, date);
  }
}