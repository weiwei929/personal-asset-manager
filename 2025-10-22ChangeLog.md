以下是“2025年10月22”的修改日志，按已完成与未完成分类，并说明影响与后续行动。

## 已完成

- 借款收回：统一调用 performTransfer、金额格式与对话框可访问性
  
  - 文件： `d:\Grok\personal-asset-manager\src\components\LentMoney.vue`
  - 变更：
    - 在 `processReturn` 中将 `fundTransferStore.executeTransfer(...)` 替换为 `fundTransferStore.performTransfer(...)`；
    - 顶部引入 `import { formatAmount } from '../utils/format.js'`，移除组件内本地 `formatAmount(...)`；
    - 对话框补充 `role="dialog"`、`aria-modal`、`aria-labelledby`，遮罩添加 `tabindex="-1"` 与 `@keydown.esc` 支持，关闭按钮增加 `aria-label`。
  - 影响：
    - 收回操作将正确更新资金池余额并记录统一转换历史；
    - 金额显示统一两位小数与本地化；
    - 对话框的键盘与读屏可用性提升。

- 股票卖出：统一金额格式（移除本地定义）与确认现用 performTransfer
  
  - 文件： `d:\Grok\personal-asset-manager\src\components\StockInvestment.vue`
  - 变更：
    - 移除组件内本地 `formatAmount(...)`，保留自 `src\utils\format.js` 的导入；
    - 核对 `processSell` 已使用 `fundTransferStore.performTransfer(...)`（无需改动）；
    - 卖出对话框已具备 `role="dialog"`、`aria-modal`、`aria-labelledby`、遮罩 `tabindex` 与 `@keydown.escape`、关闭按钮 `aria-label`（无需改动）。
  - 影响：统一金额格式工具使用，卖出流程保持资金池与历史一致。

- 资金转换对话框：统一金额格式并补齐可访问性
  
  - 文件： `d:\Grok\personal-asset-manager\src\components\TransferDialog.vue`
  - 变更：
    - 移除本地 `formatAmount(...)`，统一使用 `src\utils\format.js` 的导入；
    - 外层遮罩添加 `tabindex="-1"` 与 `@keydown.esc`；
    - 容器添加 `role="dialog"`、`aria-modal`、`aria-labelledby`，标题补充 `id`；
    - 关闭按钮补充 `aria-label`。
  - 影响：金额展示与可访问性统一，键盘 Esc 可关闭对话框。

- 资金转换 store 兼容别名与语法修复
  
  - 文件： `d:\Grok\personal-asset-manager\src\stores\fundTransfer.js`
  - 变更：
    - 新增 `executeTransfer(transferData)` 兼容别名，内部直接调用 `performTransfer(transferData)`；
    - 修复返回对象中误写 `const executeTransfer = ...` 的语法错误（`TS1005`：应为 `:`、`,`），将别名声明移到 `return { ... }` 之前，并在返回对象中导出 `performTransfer` 与 `executeTransfer`。
  - 影响：现有组件中保留 `executeTransfer(...)` 调用也能触发资金池余额校验与分配/回收，并记录统一的转换历史；编辑器 `TS1005` 报错消失。

## 未完成/失败

- TransferDialog 消息与表单引用清理未完成
  
  - 文件： `d:\Grok\personal-asset-manager\src\components\TransferDialog.vue`
  - 目标变更：
    - 顶部脚本直接 `import { ElMessage } from 'element-plus'`（已存在）；
    - 移除未绑定的 `formRef` 与 `formRef.value.clearValidate()`；
  - 当前状态：`resetForm` 仍引用 `formRef`（未声明），需清理以避免潜在运行时错误。

- stockInvestment store 新增返回值未完成
  
  - 文件： `d:\Grok\personal-asset-manager\src\stores\stockInvestment.js`
  - 目标变更：`actions.addStock(...)` 末尾 `return stock.id;` 并确保方法间逗号分隔。
  - 当前状态：未返回 `id`；组件中的 `relatedRecordId` 可能为 `undefined`，转换历史无法建立关联。

- jsconfig `ignoreDeprecations` 设置失败
  
  - 文件： `d:\Grok\personal-asset-manager\jsconfig.json`
  - 目标变更：删除该属性以消除当前 TypeScript 报错；如需忽略弃用提示，后续升级 VSCode 内置 TypeScript 或使用工作区 `node_modules/typescript`。

## 验证建议

- 借出资金：在 UI 执行“借款收回”，确认资金池余额变化与“资金转换历史”包含 `transferType: 'return'` 与正确的 `relatedRecordId`。
- 股票投资：执行“卖出”，确认资金池余额变化与“资金转换历史”包含 `transferType: 'sell'` 与正确的 `relatedRecordId`。
- 资金转换对话框：执行一笔转换，确认 Esc 可关闭、读屏标题可读、金额展示统一；
- TypeScript 服务：在 VSCode 命令面板运行 `TypeScript: Restart TS Server` 以清除旧错误。

## 路径提示

- 运行中的路径为工作区根 `src\components\...`，请勿修改 `personal-asset-manager\src\components\...` 子目录。