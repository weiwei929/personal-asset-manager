# 基线索引

| 基线 | 说明 | 是否当前 |
|------|------|----------|
| **[docs/BASELINE-2026-08-05.md](./docs/BASELINE-2026-08-05.md)** | 一期主路径 + 健壮化 D1–D4 + 手测 §1–§7 通过 | **✅ 当前** |
| 下文 2026-07-19 | 迁入后资金池致命检修（历史） | ❌ 口径已废弃 |

产品口径与手测以 **2026-08-05** 为准。  
营地镜像：`projects/personal-asset-manager/notes/2026-08-05-手测验收-一期主路径.md`

---

# 历史归档 · Baseline 2026-07-19

迁移至 `D:\workspace\grok-dev\personal-asset-manager` 后的**致命级检修基线**（旧资金池模型）。

## 本基线已修（历史）

| 级别 | 问题 | 处理 |
|------|------|------|
| 致命 | 资金池 getter 通过 `state.其它getter` 取值 → 恒为 NaN/错误 | 改为 `this` 组合 getter |
| 致命 | `allocateFunds` / `deallocateFunds` 只打日志、不改已分配 | 写入 `allocated_amounts` |
| 致命 | 更新月度收支不刷新 `netIncome` | `update` + 加载时校正 |
| 致命 | 数据重置 localStorage 键名与 store 不一致 | 对齐真实键 + 兼容旧键 |
| 严重 | `formatAmount` 重复声明导致无法构建 | 已去重（迁入时） |
| 严重 | 转换历史反序列化重写 id | 保留 id/createdAt |
| 中 | 转账先改账本再写历史可能半成功 | 先校验 + 失败回滚账本 |
| 中 | 启动未统一加载各 store | `main.js` 全量 load |

**注意：** 总资产口径已改为定稿「活期+定期+本金+借出」；勿再按「资金池 + 分项」理解产品。
