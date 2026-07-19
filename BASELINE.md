# Baseline 2026-07-19

迁移至 `D:\workspace\grok-dev\personal-asset-manager` 后的**致命级检修基线**。

## 本基线已修

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

## 验证

```bash
node scripts/smoke-finance-logic.mjs
npx vue-cli-service build --skip-plugins @vue/cli-plugin-eslint
```

## 已知非阻塞

- 无后端 / 无跨设备同步
- yarn.lock 与 package-lock 并存
- 资产间直接互转（非经资金池）账本策略较简
- 总资产为「资金池 + 分项资产」展示口径，依赖正确分配记账

## 手测建议

1. 录入当月收入 → 资金池增加  
2. 从资金池新增存款 → 池减、存款增、有流水  
3. 卖出/归还回池 → 池增、流水 type 正确  
4. 开发环境重置 → 上述键全部清空  
