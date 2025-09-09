# 个人资产管理系统 (Personal Asset Manager)

一个现代化的个人财务管理应用，专注于月度收支管理和多元化资产追踪。

## 🚀 功能特性

### 📊 财务概览
- **实时资产总览** - 直观显示总资产、月度收支和净收入
- **智能百分比计算** - 自动计算各类资产占比，避免除零错误
- **响应式设计** - 完美适配桌面端和移动端

### 💰 资产管理
- **银行存款管理** - 跟踪不同银行的存款信息
- **股票投资跟踪** - 记录股票投资组合和收益
- **借贷资金管理** - 管理借出和待还款资金
- **月度收支记录** - 详细的收入支出分类统计
- **智能资金转换** - 手动转换月度净收入为其他资产类型

### 🎨 用户体验
- **统一侧边导航** - 整合式左侧导航栏，操作更便捷
- **快捷操作按钮** - 统一尺寸的快捷操作，界面更整齐
- **资金管理中心** - 新增资金管理功能，支持资产间转换
- **现代化UI设计** - 基于Element Plus的精美界面
- **流畅动画效果** - 悬停、点击等丰富的交互反馈

## 🛠 技术栈

- **前端框架**: Vue 3.5.21 (Composition API)
- **UI组件库**: Element Plus 2.11.1
- **状态管理**: Pinia 3.0.3
- **构建工具**: Vue CLI 5.0
- **样式**: CSS3 + 响应式设计
- **版本控制**: Git

## 📦 安装和运行

### 环境要求
- Node.js >= 14.0.0
- npm 或 yarn

### 安装依赖
```bash
# 使用 npm
npm install

# 或使用 yarn (推荐)
yarn install
```

### 开发环境运行
```bash
# 启动开发服务器 (热重载)
npm run serve
# 或
yarn serve

# 访问地址: http://localhost:8080
```

### 生产环境构建
```bash
# 构建生产版本
npm run build
# 或
yarn build
```

### 代码检查和修复
```bash
# ESLint 检查和自动修复
npm run lint
# 或
yarn lint
```

## 📁 项目结构

```
personal-asset-manager/
├── public/                 # 静态资源
├── src/
│   ├── components/         # Vue 组件
│   │   ├── Dashboard.vue      # 主面板 (已优化)
│   │   ├── BankDepositList.vue # 银行存款列表
│   │   ├── MonthlyFinance.vue  # 月度财务
│   │   ├── StockInvestment.vue # 股票投资
│   │   ├── LentMoney.vue      # 借贷管理
│   │   └── TransferDialog.vue # 资金转换对话框 (新增)
│   ├── models/             # 数据模型
│   │   ├── BankDeposit.js     # 银行存款模型
│   │   ├── MonthlyFinance.js  # 月度财务模型
│   │   ├── StockInvestment.js # 股票投资模型
│   │   ├── LentMoney.js       # 借贷模型
│   │   ├── Transaction.js     # 交易模型
│   │   └── FundTransfer.js    # 资金转换模型 (新增)
│   ├── stores/             # Pinia 状态管理
│   │   ├── finance.js         # 财务状态
│   │   ├── bankDeposit.js     # 银行存款状态
│   │   ├── stockInvestment.js # 股票投资状态
│   │   ├── lentMoney.js       # 借贷状态
│   │   └── fundTransfer.js    # 资金转换状态 (新增)
│   ├── App.vue             # 根组件 (已优化导航结构)
│   └── main.js             # 应用入口
├── babel.config.js         # Babel 配置
├── vue.config.js          # Vue CLI 配置
├── jsconfig.json          # JavaScript 配置
└── package.json           # 项目依赖
```

## 🎯 最新优化 (v0.2.0)

### ✨ 新增功能
- **资金管理中心**: 新增完整的资金转换功能模块
  - 支持月度净收入转换为银行存款
  - 支持月度净收入转换为股票投资
  - 支持月度净收入转换为借出资金
  - 实时余额验证和转换限制
  - 完整的转换历史记录

### 🎨 界面优化 
- **快捷操作布局优化**: 压缩按钮高度，优化5个按钮的纵向排列
- **按钮配色方案**: 统一快捷操作按钮的颜色搭配
  - 🔵 月度收支 (蓝色)
  - 🟤 资金管理 (棕色) 
  - 🟢 新增存款 (绿色)
  - ⚫ 股票投资 (灰色)
  - 🔴 借贷记录 (红色)
- **术语优化**: "资金分配" 更名为 "资金管理"，语义更清晰

### � 数据模型扩展
- **FundTransfer 模型**: 新增资金转换数据模型
- **转换历史跟踪**: 完整记录所有资金转换操作
- **金额验证机制**: 防止超额转换和无效操作

### 🔧 技术改进
- **Pinia 状态管理扩展**: 新增 fundTransfer store
- **组件化设计**: TransferDialog 独立组件，可复用
- **表单验证增强**: Element Plus 表单验证集成
- **localStorage 持久化**: 资金转换数据本地存储

## 💾 数据存储

应用使用浏览器本地存储 (localStorage) 来持久化数据：
- 月度财务数据: `monthlyFinances`
- 银行存款数据: `bankDeposits`
- 股票投资数据: `stockInvestments`
- 借贷资金数据: `lentMoneys`
- 资金转换数据: `fundTransfers` (新增)

## 🔧 配置说明

### Vue CLI 配置
查看 [Configuration Reference](https://cli.vuejs.org/config/) 了解详细配置选项。

### 浏览器兼容性
- Chrome >= 87
- Firefox >= 78
- Safari >= 14
- Edge >= 88

## 📝 使用指南

1. **首次使用**: 打开应用后，点击快捷操作按钮添加您的财务数据
2. **资产管理**: 在各个模块中添加银行存款、股票投资等信息
3. **收支记录**: 定期更新月度收入和支出数据
4. **资金转换**: 使用资金管理功能将月度净收入转换为其他资产
5. **数据查看**: 在主面板查看资产分布和财务概况

## 🤝 贡献指南

欢迎提交 Issues 和 Pull Requests 来改进这个项目！

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

---

**开发时间**: 2025年9月8日-9日  
**版本**: v0.2.0  
**最后更新**: 2025年9月9日
