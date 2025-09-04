# 个人资产管理系统

一个现代化的个人资产管理应用，专注于月度财务管理和资产追踪。

## ✨ 功能特性

### 📊 概览面板
- 月度收支统计（当月收入/支出/净收入）
- 银行存款总额统计
- 股票投资资产统计
- 借出资金状态跟踪
- **总资产**综合计算
- 智能到期提醒

### 💰 月度收支
- 月度收入/支出录入
- 净收入自动计算
- 累积净收入跟踪
- 月度历史记录查看
- 支持多月份数据管理

### 🏦 银行存款
- CSV文件批量导入
- 定期存款到期提醒
- 利息收益统计
- 存款记录管理
- 到期状态智能标识

### 📈 股票投资
- 股票持仓管理
- 当月市值更新
- 账户余额跟踪
- 投资组合统计
- 市值占比分析

### 💸 借出资金
- 借出记录管理
- 预计还款时间设置
- 到期逾期提醒
- 还款状态跟踪
- 借出人信息管理

## 🚀 快速开始

### 安装依赖
```bash
cd personal-asset-manager
yarn install
```

### 启动应用
```bash
yarn serve
```

访问 http://localhost:8080/

## 📁 项目结构

```
personal-asset-manager/
├── src/
│   ├── components/          # Vue组件
│   │   ├── Dashboard.vue    # 概览面板
│   │   ├── MonthlyFinance.vue # 月度收支
│   │   ├── BankDepositList.vue # 银行存款
│   │   ├── StockInvestment.vue # 股票投资
│   │   └── LentMoney.vue    # 借出资金
│   ├── models/              # 数据模型
│   │   ├── MonthlyFinance.js # 月度财务模型
│   │   ├── BankDeposit.js   # 银行存款模型
│   │   ├── StockInvestment.js # 股票投资模型
│   │   └── LentMoney.js     # 借出资金模型
│   ├── stores/              # Pinia状态管理
│   │   ├── finance.js       # 财务数据store
│   │   ├── bankDeposit.js   # 银行存款store
│   │   ├── stockInvestment.js # 股票投资store
│   │   └── lentMoney.js     # 借出资金store
│   ├── App.vue              # 主应用组件
│   └── main.js              # 应用入口
├── final_all.csv            # 银行存款数据文件
└── test-system.js           # 系统测试脚本
```

## 💡 使用指南

### 1. 概览面板
- 查看所有资产的综合统计
- 关注重要的到期提醒
- 了解整体财务状况

### 2. 月度收支管理
- 选择月份录入当月收支
- 系统自动计算净收入
- 查看累积净收入变化

### 3. 银行存款管理
- 点击"导入CSV"上传您的存款数据
- 查看到期提醒和利息收益
- 管理存款记录的增删改

### 4. 股票投资管理
- 添加持股信息
- 更新市值和账户余额
- 查看投资组合统计

### 5. 借出资金管理
- 记录借出资金信息
- 设置预计还款时间
- 跟踪还款状态

## 🔧 技术栈

- **前端框架**: Vue.js 3 + Composition API
- **状态管理**: Pinia
- **UI组件库**: Element Plus
- **数据存储**: 浏览器本地存储 (localStorage)
- **构建工具**: Vue CLI
- **样式**: CSS3 + Flexbox/Grid

## 📊 数据模型

### 月度财务 (MonthlyFinance)
```javascript
{
  id: "2024-01",
  month: "2024-01",
  income: 15000,      // 当月收入
  expense: 8000,      // 当月支出
  netIncome: 7000,    // 月净收入
  cumulativeNet: 25000 // 累积净收入
}
```

### 银行存款 (BankDeposit)
```javascript
{
  id: "1",
  productName: "长财40708",
  maturityDate: "2024年7月8日",
  amount: 50000,
  interestRate: 3.5,
  maturityInterest: 3675
}
```

### 股票投资 (StockInvestment)
```javascript
{
  id: "1",
  name: "平安银行",
  currentValue: 50000,    // 当月市值
  accountBalance: 10000,  // 账户余额
  shares: 1000           // 持股数量（可选）
}
```

### 借出资金 (LentMoney)
```javascript
{
  id: "1",
  borrower: "张三",
  amount: 20000,
  lendDate: "2024-01-15",
  expectedReturnDate: "2024-06-15",
  status: "pending"     // pending/returned
}
```

## 🎯 核心优势

### 📈 专注月度管理
- 简化为月度统计，减少录入负担
- 净收入累积，支持资金规划决策

### 💰 全面资产追踪
- 银行存款、股票投资、借出资金一体化管理
- 实时统计总资产状况

### ⏰ 智能提醒系统
- 存款到期提醒
- 借出资金还款提醒
- 逾期状态警告

### 📱 现代化体验
- 响应式设计，适配各种设备
- 直观的操作界面
- 流畅的用户交互

## 🔒 数据安全

- 所有数据存储在浏览器本地
- 无需注册，无服务器依赖
- 数据完全由用户控制

## 📝 更新日志

### v1.0.0 (2024-01)
- ✅ 完成系统架构设计
- ✅ 实现月度收支管理
- ✅ 完成银行存款模块
- ✅ 添加股票投资功能
- ✅ 集成借出资金管理
- ✅ 实现概览面板统计

## 🤝 贡献

欢迎提交问题和建议！

## 📄 许可证

MIT License