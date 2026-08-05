# 一期数据模型与键名（T0）

- **日期**: 2026-07-20  
- **口径真源**: 营地 `projects/personal-asset-manager/notes/2026-07-20-框架定稿-确认点.md`  
- **状态**: 与代码常量同步（`src/constants/`）

---

## 1. 实体清单

| 实体 | 说明 |
|------|------|
| **BankAccount** | 四户固定：招商/长沙/建设/光大；每户 1 活期 + N 定期 |
| **TimeDeposit** | 定期产品（挂在某 BankAccount 下） |
| **BankMovement** | 银行异动简表（可选支撑） |
| **OpeningBalance** | 期初建账标记 + `openingSnapshot` |
| **MonthlyFinance** | 月度收支当前账（收入 + 三通道，保存即入账） |
| **MonthlyStatement** | 已结束自然月的只读账单（不切割当前账） |
| **Stock / Fund** | 投入本金 + 观察市值 |
| **LentMoney** | 借出未还 |

---

## 2. 四银行 id（稳定）

| id | 名称 |
|----|------|
| `cmb` | 招商银行 |
| `cscb` | 长沙银行 |
| `ccb` | 建设银行 |
| `ceb` | 光大银行 |

代码：`src/constants/banks.js`

---

## 3. localStorage 键（D2 · 单一真源）

| 键 | 内容 | 重置时 |
|----|------|--------|
| `pam-bank-accounts` | 四户 JSON 数组 | 清 |
| `pam-bank-movements` | 异动数组 | 清 |
| `pam-opening-balance` | `{ date, completedAt, openingSnapshot? }` | 清 |
| `pam-monthly-statements` | 月度账单数组（只读结转） | 清 |
| `monthlyFinances` | 月度收支当前账（过渡键名，字符串勿改） | 清 |
| `stock-investments` | 股票 | 清 |
| `fund-investments` | 基金 | 清 |
| `lent-money-records` | 借出 | 清 |
| `fundTransfers` | 旧划转历史（D3 停写） | 清 |
| `finance-categories` | 分类（重置后写回默认） | 清后默认 |
| `bank-deposits` 等 LEGACY | 旧存款/别名 | 仅清 |
| `pam-auth` | 登录凭证 | **保留** |
| `theme-settings` | 主题偏好 | **保留** |

代码：`src/constants/storageKeys.js`  
- `STORAGE_KEYS` / `LEGACY_STORAGE_KEYS`  
- `ALL_CLEARABLE_KEYS` · `PRESERVED_ON_RESET_KEYS`  
业务 store 读写必须引用常量，禁止魔法字符串。

---

## 4. BankAccount 形状

```js
{
  id: 'cmb',
  name: '招商银行',
  demandBalance: 0,       // 活期 → 计入「可用现金」
  timeDeposits: [         // 定期 → 计入「银行存款」
    {
      id: '...',
      bankId: 'cmb',
      name: '大额存单 3Y',
      principal: 100000,
      startDate: '2025-01-01' | null,
      maturityDate: '2028-01-01' | null,
      note: '',
      createdAt: 'ISO'
    }
  ]
}
```

---

## 5. 总资产伪代码（定稿）

```text
totalDemand          = Σ accounts[i].demandBalance
totalTimeDeposit     = Σ accounts[i].timeDeposits[j].principal
totalInvestedPrincipal = Σ stock.investedPrincipal + Σ fund.investedPrincipal
totalLent            = Σ lent where status === 'pending'  → amount

totalAssets = totalDemand + totalTimeDeposit + totalInvestedPrincipal + totalLent

// 观察（不进总资产）
totalMarketValue = Σ stock.currentValue + Σ fund.currentValue
```

代码：`src/utils/assetTotals.js` · Pinia：`src/stores/assets.js`

**禁止**：各组件自行加总不同口径。

---

## 6. 股/基字段（T5 对齐预备）

| 字段 | 用途 |
|------|------|
| `investedPrincipal` | 投入本金（进总资产） |
| `currentValue` | 市值（仅观察） |
| `accountBalance` | 旧字段；新口径不再进总资产 |

无 `investedPrincipal` 时按 **0** 计（不回落市值）。

---

## 7. 废弃语义

| 旧 | 新 |
|----|-----|
| `cashPool = Σ净收入−已分配` 作可用现金主定义 | 四行活期合计 |
| 自由 `BankDeposit` 列表 | 四户 + 定期多笔 |
| 投资按市值进总资产 | 按投入本金；撤回才实现盈亏 |
| `bank-deposits` 键 | `pam-bank-accounts` |
