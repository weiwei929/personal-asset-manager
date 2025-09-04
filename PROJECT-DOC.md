# 个人资产管理系统 - 完整项目文档

## 📖 项目概述

**个人资产管理系统** 是一个现代化的个人财务管理平台，专注于月度财务管理和资产追踪。该系统从简单的收支记录器升级为全面的资产管理中心，涵盖现金流管理、投资组合管理、借贷关系管理等全方位财务功能。

### 🎯 项目目标

- **简化财务管理**：将复杂的财务数据转换为直观的月度统计
- **资产一体化管理**：整合银行存款、股票投资、借出资金等各类资产
- **智能提醒系统**：自动提醒重要时间节点和到期事项
- **数据安全保障**：本地存储结合云端备份的双重保障

### 🌟 核心价值

1. **财务健康监控**：月度收支统计，净收入累积跟踪
2. **资产配置优化**：多维度资产分析，投资组合管理
3. **风险控制提醒**：到期提醒，逾期预警
4. **决策支持系统**：数据驱动的财务决策

---

## 🚀 功能特性

### 📊 概览面板
- **月度收支统计**：当月收入、支出、净收入实时展示
- **资产配置图表**：银行存款、股票投资、借出资金占比分析
- **总资产计算**：净收入累积 + 银行存款 + 股票投资 - 待还款资金
- **到期提醒系统**：即将到期的存款和借出资金智能提醒

### 💰 月度收支管理
- **月度统计模式**：专注当月财务健康，避免数据过载
- **净收入累积**：自动累积可用于存款或投资的资金
- **历史数据追踪**：支持查看各月度财务状况对比
- **智能规划建议**：基于净收入累积的资金规划建议

### 🏦 银行存款管理
- **CSV批量导入**：一键导入34条银行存款记录
- **到期时间管理**：自动计算到期天数和状态
- **利息收益统计**：预期利息收益实时计算
- **到期提醒功能**：30天内到期的存款高亮提醒

### 📈 股票投资管理
- **持股信息管理**：股票名称、市值、账户余额录入
- **市值更新功能**：实时更新股票市值数据
- **投资组合分析**：各股票占比和收益统计
- **月度收益追踪**：投资收益的月度对比分析

### 💸 借出资金管理
- **借出记录管理**：借出人、金额、日期完整记录
- **还款时间跟踪**：预计还款时间设置和提醒
- **状态管理**：未还款/已还款状态智能管理
- **逾期预警**：自动识别逾期未还的借出资金

---

## 🏗️ 技术架构

### 🎨 前端技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| **Vue.js** | 3.2.13 | 渐进式JavaScript框架 |
| **Pinia** | 3.0.3 | Vue 3官方状态管理库 |
| **Element Plus** | 2.11.1 | Vue 3 UI组件库 |
| **Vue Router** | - | 单页面应用路由管理 |
| **ESLint** | 7.32.0 | 代码质量检查工具 |

### 📁 项目结构

```
personal-asset-manager/
├── 📁 public/                    # 静态资源目录
│   ├── favicon.ico              # 网站图标
│   └── index.html               # HTML入口文件
├── 📁 src/                      # 源代码目录
│   ├── 📁 components/           # Vue组件
│   │   ├── Dashboard.vue        # 概览面板组件
│   │   ├── MonthlyFinance.vue   # 月度收支组件
│   │   ├── BankDepositList.vue  # 银行存款组件
│   │   ├── StockInvestment.vue  # 股票投资组件
│   │   └── LentMoney.vue        # 借出资金组件
│   ├── 📁 models/               # 数据模型
│   │   ├── MonthlyFinance.js    # 月度财务模型
│   │   ├── BankDeposit.js       # 银行存款模型
│   │   ├── StockInvestment.js   # 股票投资模型
│   │   └── LentMoney.js         # 借出资金模型
│   ├── 📁 stores/               # 状态管理
│   │   ├── finance.js           # 财务数据store
│   │   ├── bankDeposit.js       # 银行存款store
│   │   ├── stockInvestment.js   # 股票投资store
│   │   └── lentMoney.js         # 借出资金store
│   ├── App.vue                  # 根组件
│   └── main.js                  # 应用入口
├── 📄 package.json              # 项目配置
├── 📄 README.md                 # 项目说明
├── 📄 .gitignore                # Git忽略文件
└── 📄 test-system.js            # 系统测试脚本
```

### 🗄️ 数据架构

#### 数据存储策略
- **本地存储**：使用浏览器localStorage进行数据持久化
- **数据结构**：JSON格式存储，支持复杂对象序列化
- **数据同步**：实时同步各组件状态
- **数据备份**：支持数据导出功能

#### 数据模型设计

**MonthlyFinance（月度财务）**
```javascript
{
  id: "2024-01",           // 月份标识
  month: "2024-01",        // 月份字符串
  income: 15000,           // 当月收入
  expense: 8000,           // 当月支出
  netIncome: 7000,         // 月净收入
  cumulativeNet: 25000,    // 累积净收入
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-31T23:59:59.000Z"
}
```

**BankDeposit（银行存款）**
```javascript
{
  id: "1",
  productName: "长财40708",
  maturityDate: "2024年7月8日",
  amount: 50000,
  interestRate: 3.5,
  term: "1年",
  maturityInterest: 1750,
  notes: "到期续存",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z"
}
```

**StockInvestment（股票投资）**
```javascript
{
  id: "1",
  name: "平安银行",
  currentValue: 50000,     // 当月市值
  accountBalance: 10000,   // 账户余额
  shares: 1000,           // 持股数量（可选）
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-31T23:59:59.000Z"
}
```

**LentMoney（借出资金）**
```javascript
{
  id: "1",
  borrower: "张三",
  amount: 20000,
  lendDate: "2024-01-15",
  expectedReturnDate: "2024-06-15",
  actualReturnDate: null,
  status: "pending",      // pending/returned
  notes: "购房资金",
  createdAt: "2024-01-15T00:00:00.000Z",
  updatedAt: "2024-01-15T00:00:00.000Z"
}
```

---

## 📦 安装部署

### 🔧 环境要求

| 环境 | 版本要求 | 说明 |
|------|----------|------|
| **Node.js** | >= 16.0.0 | JavaScript运行环境 |
| **npm** | >= 8.0.0 | 包管理工具 |
| **Git** | >= 2.0.0 | 版本控制工具 |
| **浏览器** | Chrome >= 90 | 支持ES6+ |

### 🚀 快速开始

#### 1. 克隆项目
```bash
git clone https://github.com/weiwei929/personal-asset-manager.git
cd personal-asset-manager
```

#### 2. 安装依赖
```bash
# 使用npm
npm install

# 或使用yarn
yarn install
```

#### 3. 启动开发服务器
```bash
# 使用npm
npm run serve

# 或使用yarn
yarn serve
```

#### 4. 访问应用
打开浏览器访问：http://localhost:8080

### 🏗️ 生产部署

#### 构建生产版本
```bash
# 使用npm
npm run build

# 或使用yarn
yarn build
```

#### 部署到服务器
```bash
# 构建完成后，将dist目录部署到Web服务器
# Apache/Nginx配置示例：
# 将dist目录作为网站根目录
```

---

## 📋 使用指南

### 🎯 首次使用

1. **访问应用**：打开 http://localhost:8080
2. **概览面板**：查看整体财务状况
3. **导入数据**：在"银行存款"页面导入您的CSV文件
4. **开始管理**：逐个模块录入您的财务数据

### 📊 功能使用详解

#### 概览面板使用
- **统计卡片**：显示各项资产的汇总数据
- **资产构成**：查看各项资产的占比情况
- **待办提醒**：显示需要注意的重要事项
- **快速导航**：一键跳转到各个管理模块

#### 月度收支管理
- **选择月份**：使用下拉菜单选择要管理的月份
- **录入数据**：填写当月收入和支出金额
- **自动计算**：系统自动计算净收入和累积净收入
- **历史查看**：查看历月财务数据对比

#### 银行存款管理
- **CSV导入**：点击"导入CSV"按钮上传您的存款数据
- **手动录入**：点击"新增存款"手动添加存款记录
- **到期提醒**：查看即将到期的存款项目
- **数据导出**：导出存款数据为CSV文件

#### 股票投资管理
- **添加股票**：录入股票名称和相关信息
- **市值更新**：定期更新股票市值数据
- **组合分析**：查看投资组合的整体情况
- **收益统计**：分析投资收益情况

#### 借出资金管理
- **记录借出**：添加新的借出资金记录
- **时间管理**：设置预计还款时间
- **状态跟踪**：标记已还款的项目
- **提醒查看**：查看即将到期的还款项目

### 💡 使用技巧

#### 数据录入最佳实践
- **及时录入**：建议每月末及时录入当月收支数据
- **数据准确**：确保录入数据的准确性
- **定期更新**：定期更新股票市值和存款信息
- **备份数据**：定期导出重要数据进行备份

#### 财务规划建议
- **净收入累积**：关注每月净收入累积情况
- **资产配置**：合理分配银行存款和股票投资比例
- **还款提醒**：及时关注借出资金的还款情况
- **风险控制**：定期检查各项资产的到期情况

---

## 🔧 开发指南

### 🛠️ 开发环境设置

#### 代码编辑器推荐
- **Visual Studio Code**：推荐使用，支持Vue.js插件
- **插件安装**：
  - Vue Language Features (Volar)
  - TypeScript Vue Plugin (Volar)
  - ESLint
  - Prettier

#### 项目配置
```javascript
// vue.config.js (如需要自定义配置)
module.exports = {
  // 开发服务器配置
  devServer: {
    port: 8080,
    open: true
  },

  // 构建配置
  configureWebpack: {
    // 自定义webpack配置
  }
}
```

### 📝 代码规范

#### 文件命名规范
- **组件文件**：PascalCase，如 `MonthlyFinance.vue`
- **工具文件**：camelCase，如 `formatDate.js`
- **常量文件**：UPPER_SNAKE_CASE，如 `CONSTANTS.js`

#### 代码风格
- 使用ES6+语法特性
- 使用Composition API编写Vue组件
- 使用async/await处理异步操作
- 添加必要的注释和文档

#### 提交规范
```bash
# 功能提交
git commit -m "feat: 添加新功能"

# 修复提交
git commit -m "fix: 修复bug"

# 文档提交
git commit -m "docs: 更新文档"

# 样式提交
git commit -m "style: 调整样式"
```

### 🧪 测试指南

#### 运行测试
```bash
# 运行系统集成测试
node test-system.js

# 运行单元测试（如果有）
npm run test:unit
```

#### 手动测试清单
- [ ] 概览面板数据正确显示
- [ ] 月度收支录入功能正常
- [ ] 银行存款CSV导入成功
- [ ] 股票投资数据管理正常
- [ ] 借出资金状态更新正确
- [ ] 数据导出功能正常
- [ ] 响应式布局适配良好

### 🚀 部署指南

#### 开发环境部署
```bash
# 启动开发服务器
npm run serve
# 访问 http://localhost:8080
```

#### 生产环境部署
```bash
# 构建生产版本
npm run build

# 部署dist目录到Web服务器
# 支持Apache、Nginx、Vercel、Netlify等
```

#### Docker部署（可选）
```dockerfile
# Dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 8080
CMD ["npm", "run", "serve"]
```

---

## 📚 API文档

### 🔄 数据流说明

#### 状态管理架构
```
Vue组件 → Pinia Store → localStorage
    ↑           ↓
    ← 响应式更新 ←
```

#### Store方法说明

**finance.js**
- `updateMonthlyFinance(month, income, expense)` - 更新月度财务
- `loadFromLocalStorage()` - 从本地存储加载数据
- `saveToLocalStorage()` - 保存数据到本地存储

**bankDeposit.js**
- `addDeposit(productName, maturityDate, amount, ...)` - 添加存款
- `importFromCSV(csvContent)` - CSV导入存款数据
- `updateDeposit(id, updates)` - 更新存款信息

**stockInvestment.js**
- `addStock(name, currentValue, accountBalance, shares)` - 添加股票
- `updateStock(id, currentValue, accountBalance, shares)` - 更新股票

**lentMoney.js**
- `addLentRecord(borrower, amount, lendDate, expectedReturnDate)` - 添加借出记录
- `markAsReturned(id, actualReturnDate)` - 标记为已还款

### 🎯 组件接口

#### Props接口
```javascript
// 各组件主要接收的props
interface ComponentProps {
  // 通用props
  loading?: boolean;
  disabled?: boolean;

  // 特定组件props
  selectedMonth?: string;  // 月度财务组件
  depositData?: object;    // 存款详情组件
  stockData?: object;      // 股票详情组件
  lentData?: object;       // 借出详情组件
}
```

#### Events接口
```javascript
// 组件发出的事件
interface ComponentEvents {
  'update:modelValue': [value: any];
  'save': [data: object];
  'delete': [id: string];
  'import': [data: any[]];
  'export': [format: string];
}
```

---

## ❓ 常见问题

### 🚨 应用无法启动

**问题现象**：
- 页面空白或显示错误
- 控制台报错

**解决方案**：
1. 检查Node.js版本：`node --version`
2. 重新安装依赖：`rm -rf node_modules && npm install`
3. 清除缓存：`npm run serve -- --force`

### 📊 数据导入失败

**问题现象**：
- CSV文件无法导入
- 数据格式错误

**解决方案**：
1. 检查CSV文件格式（逗号分隔，UTF-8编码）
2. 确认列顺序：序号,产品名称,到期时间,存款数量,利率,存期,到期利息,备注
3. 查看浏览器控制台错误信息

### 💾 数据丢失问题

**问题现象**：
- 刷新页面后数据消失
- 浏览器清理后数据丢失

**解决方案**：
1. 定期导出重要数据备份
2. 使用浏览器书签保存应用地址
3. 考虑导出数据到云端备份

### 📱 移动端显示问题

**问题现象**：
- 移动端布局错乱
- 按钮点击无响应

**解决方案**：
1. 检查浏览器兼容性
2. 清除浏览器缓存
3. 使用Chrome开发者工具的移动端模拟

### 🔄 版本更新问题

**问题现象**：
- 更新后功能异常
- 数据格式不兼容

**解决方案**：
1. 备份重要数据
2. 清除浏览器缓存
3. 重新导入数据

---

## 📈 更新日志

### v1.0.0 (2024-01-01)
- ✅ 完成系统架构设计和核心功能开发
- ✅ 实现月度收支管理模块
- ✅ 完成银行存款管理，支持CSV导入
- ✅ 添加股票投资管理功能
- ✅ 集成借出资金管理模块
- ✅ 实现概览面板综合统计
- ✅ 应用现代化UI设计
- ✅ 实现数据本地存储
- ✅ 添加智能到期提醒
- ✅ 支持响应式布局

### 未来规划
- 🔄 云端数据同步功能
- 📊 财务报表生成
- 📈 投资收益分析图表
- 🔔 邮件/短信提醒功能
- 📱 移动App版本
- 🔒 数据加密存储
- 📊 财务目标设定
- 🎯 预算规划功能

---

## 🤝 贡献指南

### 📝 贡献流程

1. **Fork项目** 到您的GitHub账户
2. **创建功能分支**：`git checkout -b feature/new-feature`
3. **提交更改**：`git commit -m "feat: 添加新功能"`
4. **推送分支**：`git push origin feature/new-feature`
5. **创建Pull Request**

### 🐛 报告问题

使用GitHub Issues报告问题时，请提供：
- 问题描述
- 复现步骤
- 预期行为
- 实际行为
- 浏览器版本
- 错误截图

### 💡 功能建议

新功能建议请包含：
- 功能描述
- 使用场景
- 预期效果
- 实现思路

### 📋 代码规范

#### JavaScript/Vue规范
- 使用ES6+语法
- 使用Composition API
- 添加必要的类型注释
- 遵循Vue风格指南

#### 提交信息规范
```
type(scope): description

type: feat, fix, docs, style, refactor, test, chore
scope: 影响的模块或组件
description: 简洁的变更描述
```

#### 分支命名规范
```
feature/功能名称      # 新功能开发
fix/问题描述         # 问题修复
docs/文档更新        # 文档更新
style/样式调整       # 样式调整
refactor/重构内容    # 代码重构
```

---

## 📞 技术支持

### 📧 联系方式
- **项目主页**: https://github.com/weiwei929/personal-asset-manager
- **Issues**: https://github.com/weiwei929/personal-asset-manager/issues
- **邮箱**: [您的邮箱地址]

### 📚 相关资源
- **Vue.js官方文档**: https://vuejs.org/
- **Pinia文档**: https://pinia.vuejs.org/
- **Element Plus文档**: https://element-plus.org/
- **ESLint配置**: https://eslint.org/

### 🔧 开发工具推荐
- **VS Code**: 主力开发环境
- **Chrome DevTools**: 调试工具
- **Git**: 版本控制
- **Postman**: API测试（如果需要）

---

## 📜 开源协议

本项目采用 **MIT License** 开源协议。

```
MIT License

Copyright (c) 2024 个人资产管理系统

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🎯 项目总结

**个人资产管理系统** 是一个功能完整、设计现代、技术先进的个人财务管理平台。通过月度统计模式、资产一体化管理、智能提醒系统等核心特性，为用户提供专业、便捷的财务管理体验。

### 🌟 项目亮点
- ✅ **功能完整**：涵盖财务管理的各个方面
- ✅ **技术先进**：使用最新的前端技术栈
- ✅ **用户友好**：直观的操作界面和流畅的交互
- ✅ **数据安全**：本地存储结合版本控制
- ✅ **扩展性强**：模块化设计，易于功能扩展

### 🚀 应用前景
随着个人理财意识的提升，这类专业的个人资产管理工具将越来越受到重视。本项目不仅解决了实际的财务管理需求，也为类似应用的开发提供了宝贵的参考和模板。

**感谢您选择和使用个人资产管理系统！** 🎉