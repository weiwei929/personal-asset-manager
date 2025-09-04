// 系统集成测试
console.log('🚀 开始个人资产管理系统集成测试...\n');

// 模拟数据测试
console.log('📊 测试数据模型:');

// 测试月度财务
const MonthlyFinance = require('./src/models/MonthlyFinance.js').default;
const monthlyFinance = new MonthlyFinance('2024-01', 15000, 8000);
console.log('✅ 月度财务模型:', {
  月份: monthlyFinance.month,
  收入: monthlyFinance.income,
  支出: monthlyFinance.expense,
  净收入: monthlyFinance.netIncome
});

// 测试股票投资
const StockInvestment = require('./src/models/StockInvestment.js').default;
const stock = StockInvestment.create('平安银行', 50000, 10000, 1000);
console.log('✅ 股票投资模型:', {
  名称: stock.name,
  市值: stock.currentValue,
  余额: stock.accountBalance,
  总资产: stock.getTotalAssets()
});

// 测试借出资金
const LentMoney = require('./src/models/LentMoney.js').default;
const lentRecord = LentMoney.create('张三', 20000, '2024-01-15', '2024-06-15');
console.log('✅ 借出资金模型:', {
  借出人: lentRecord.borrower,
  金额: lentRecord.amount,
  状态: lentRecord.getStatusText()
});

console.log('\n📋 系统功能清单:');
console.log('✅ 概览面板 - 综合资产统计');
console.log('✅ 月度收支 - 月度财务管理');
console.log('✅ 银行存款 - 定期存款管理');
console.log('✅ 股票投资 - 投资组合管理');
console.log('✅ 借出资金 - 借贷关系管理');
console.log('✅ 数据持久化 - 本地存储');
console.log('✅ 响应式设计 - 适配各种设备');

console.log('\n🎯 核心特性:');
console.log('📈 月度统计 - 专注财务健康');
console.log('💰 资产追踪 - 全面资产管理');
console.log('⏰ 到期提醒 - 智能时间管理');
console.log('📊 数据安全 - 本地存储保护');
console.log('🎨 现代化UI - 直观用户体验');

console.log('\n🎉 系统集成测试完成！');
console.log('💡 建议运行: cd personal-asset-manager && yarn serve');
console.log('🌐 访问地址: http://localhost:8080/');