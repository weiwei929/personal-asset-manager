// 资产分类数据模型
export default class Category {
  constructor(id, name, type, color = '#409EFF') {
    this.id = id;
    this.name = name;
    this.type = type; // 'income' 或 'expense'
    this.color = color;
  }

  // 静态方法：创建新分类
  static create(name, type, color = '#409EFF') {
    const id = Date.now().toString();
    return new Category(id, name, type, color);
  }

  // 获取默认分类
  static getDefaultCategories() {
    return [
      new Category('1', '工资收入', 'income', '#67C23A'),
      new Category('2', '投资收益', 'income', '#E6A23C'),
      new Category('3', '其他收入', 'income', '#909399'),
      new Category('4', '餐饮', 'expense', '#F56C6C'),
      new Category('5', '交通', 'expense', '#409EFF'),
      new Category('6', '购物', 'expense', '#C71585'),
      new Category('7', '娱乐', 'expense', '#FF7F50'),
      new Category('8', '其他支出', 'expense', '#909399')
    ];
  }
}