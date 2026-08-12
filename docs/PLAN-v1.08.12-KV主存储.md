# PAM · v1.08.12 方案：Cloudflare KV 作为主存储（审计修订版）

> **版本**：v1.08.12（规划号；实施时 `package.json` → `1.8.12`）  
> **性质**：方案文档 · **未改动任何业务代码**  
> **状态**：第三轮确认（2026-08-12）→ **可按 S1' 开干**；C2 已写入 B2；C1 为 S1' 验收表（见本文件）  
> **前置**：二期云同步已落地（D5 API + D6/P1 `cloudSync`）；本文讨论权威关系翻转及退出清缓存  
> **相关**：`docs/REVIEW-2026-08-07-云同步评估.md`、`docs/P1-2026-08-07-批次记录.md`、`docs/CLOUDFLARE.md`  
> **审计**：第三方评估结论「批准方向，不批准按初版直接开干」；本文件为吸收 P0/P1 与切片重排后的修订稿

---

## 0. 一句话目标

把同步模型从 **「localStorage 主副本 + KV 镜像」** 改为 **「settle 时刻以 KV 为准 + localStorage/内存为运行期缓冲」**，复用整本账本协议与冲突 UI，不上 D1，不重写 Pinia 业务写路径。

**权威限定（审计要求写入）**：权威仅在 settle 时刻生效；两次 settle 之间真源仍是本机内存与 localStorage；冲突交由整本二选一。这不是「运行期每次读写都打云」。

---

## 1. 背景与动机

### 1.1 现状（代码事实）

- 记账写路径：Pinia → `localStorage`；`initSync` patch `setItem`/`removeItem` → dirty → 防抖 PUT。
- 云端：`GET/PUT /api/ledger`，键 `ledger:{email}`，Access JWT。
- 当前文件头仍写：**localStorage 主副本不变**。
- 已具备：version 乐观锁、409、dirty、离线重试、冲突前备份、空账本不推云。

### 1.2 为何仍选 KV

一人一整本 JSON，与 KV 同构；体量远低于实用上限；D1 收益收不回迁移成本；I5（无 CAS）自用可继续接受。

---

## 2. 目标语义（已评估）

| 议题 | 结论 |
|------|------|
| 权威源 | 联网且鉴权有效时，**settle 以 KV 为准**（见 §0 限定） |
| localStorage | 缓存 + 离线写缓冲；成功 PUT 后与云对齐 |
| 离线 | 允许继续记账；标「离线/待同步」；恢复后补推 |
| 无 dirty 且云端有数据 | settle 时以云为准 hydrate + **重灌 Pinia** |
| 有 dirty 且云端更新 | **必须弹冲突**，禁止静默覆盖 |
| 冲突按钮 | **先做两边摘要**；有摘要前两按钮同权重；不默认「丢弃本机」 |
| 退出 | **普通退出与安全退出都清本机账本缓存**；云端 **不删**；口令哈希/主题可留 |
| 鉴权过期 | 可展示提示；不硬挡到无法操作（细则见门闸） |
| 本机口令 | Access 可为正门；**本版不拆 LoginGate**；移除另开（见 §6.3 限定） |

### 2.1 已拍板摘要

- 普通退出清账本缓存（2026-08-12）
- 首屏短时同步可接受；弱网须有简单超时（见 P0-5）
- 少整页 reload：须配套 `reloadAllStores()`（见 P0-3）
- 双端同时写：接受极低概率后写覆盖 + 覆盖前备份
- 反爬 / 打开时防窃听：暂缓；加密：另评，臃肿不做

---

## 3. 非目标（本版不做）

1. 不上 D1 / Durable Objects；不根治 I5。
2. 不把各 Pinia store 改成直接 `await fetch`。
3. 不做字段级合并 / CRDT。
4. 不做默默云端 DELETE（M7 不做）。
5. 不改算账公式 / `assetTotals`。
6. 不大改 UI（仅门闸、同步状态、冲突摘要、退出相关）。
7. **不拆 LoginGate**（本版）。
8. M2 **不做**「版本相同仅因 payload 指纹不同就静默跟云」（见 P1-1）。

---

## 4. 审计硬阻塞（P0）— 开干前方案必须写死

### P0-1 · 同步入口时机与位置

**代码事实**：`initSync` 在 `App.vue` `setup`/`onMounted`，`LoginGate` 未过也会跑；`main.js` 在 `mount` 前已 `loadFromLocalStorage` + `ensureCatchUp()`，且早于 patch → 跨月写可能不置 dirty。

**本版必须**：

1. **`initSync` 的 settle 触发**移到「通过 LoginGate 之后」（`watch(isAuthenticated)` 或登录成功回调）；门闸 UI 也在该边界内。
2. **patch 与 settle 解耦（二选一，写死）**：
   - **A**：`main.js` 最早安装 localStorage patch（早于任何 store load / `ensureCatchUp`），settle 仍等鉴权后；或
   - **B**：`ensureCatchUp()` 整体后移到 settle 完成之后。
3. **默认采纳 A + settle 后置**（推荐）：尽早 patch 防漏 dirty；settle 仅在已登录后执行，避免口令页前 hydrate。

### P0-2 · M8 三个坑（退出清缓存 = 本版最高风险片）

**(a) 只清 LS 不清 Pinia** → 不刷新再登录会用内存旧账本写回并可能推云。
→ **普通退出清缓存后必须强制 `reload`（或等价拆掉内存态）**，对齐今日 `secureLogout` 的「离开当前页」语义。

**(b) idle 自动登出**（`useIdleLogout` → `auth.logout()`）若挂上清账本 → 吃饭回来账本没了。
→ **写死：idle logout 只清会话，不清账本。** 清理只挂在用户显式点击「退出」的路径。

**(c) 清缓存 + `resetSyncState` + 离线** → 失忆 → 建账引导 → 联网选「用本机」真丢账。
→ **退出清缓存时保留非账本轻量标记** `pam-cloud-bound`（如 `{ lastVersion, lastSyncedAt }`，可选 email 哈希）；门闸在「离线 + 无本机数据 + 曾绑定」时显示「账本在云端，当前离线，请联网后进入」，**禁止**建账引导。

### P0-3 · 少 reload ⇒ 必须 `reloadAllStores()`

`hydrateLocal` 只写 LS；Pinia 不会自更新。现状靠 `onHydrated` → `location.reload()`。

**本版必须**交付：`reloadAllStores()` = 各业务 store `loadFromLocalStorage()` + 再跑 `ensureCatchUp()`（顺序与 P0-1 一致），且与 `suppressing` 不打架。整页 reload 降级为兜底。

### P0-4 · hydrate 原子性

中途失败可导致半清空、无 dirty、version 已写 → 静默损坏。
→ hydrate 包失败处理：**失败不写 version**，置「需重拉」标记并提示；禁止当离线静默吞掉。

### P0-5 · 门闸超时

不上复杂超时框架，但 **`fetchRemote` 必须 AbortController + 约 8–10s**；超时走 offline/重试分支，禁止弱网白屏挂死。

---


### B1 · 早 patch 必须配套推送闸门（第二轮复核硬阻塞 · 2026-08-12）

P0-1 方案 A（早 patch + 登录后 settle）成立，但现有 `schedulePush()` = 置 dirty + 排 2s PUT **一体**。patch 装上后、`ensureCatchUp()` / `online` 等写发生时，**settle 尚未完成**也可能 PUT：version 落后则 409 撞上未就位的冲突 UI；version 不落后则陈旧缓存覆盖云端权威。

**本版必须写死**：

1. 增加推送闸门（如 `pushArmed` / `settleReady`）：**settle 成功前** `schedulePush()` **只置 dirty、不发 PUT**；settle 成功后统一放闸，若仍 dirty 再补推一次。
2. `online` 触发的补推同样受闸门约束。
3. 与 P0-4 联动：hydrate **失败 / 需重拉** 状态期间 **禁止推送**（残缺本机不得推成云端权威）；失败不写 version（已有）+ 禁止 PUT（本条补齐）。

### C1 · settle 结论 → 闸门动作（第三轮 · 写入 S1' 验收，不另开方案轮）

B1「settle 成功才放闸」方向对，但须补全 **不成功** 路径，避免 offline dirty 只能等冷启动才上云。`online` / 回前台应触发 **re-settle**，不要直接 push。

| settle 结论 | 闸门 | dirty 处理 |
|-------------|------|------------|
| in-sync | 放开 | 若仍 dirty → 补推 |
| hydrated | 放开 | hydrate 已 clearDirty，无需补推 |
| empty-cloud | 放开 | 补推（P1-3，带身份前置） |
| conflict | 保持关闭 | 等用户选择；冲突解决路径 **显式豁免** 闸门 |
| offline / 超时 | 保持关闭 | 继续累积 dirty；online/回前台 → **re-settle**，不直接 push |
| auth-expired | 保持关闭 | 继续累积 dirty；重新登录后 re-settle |
| hydrate 失败 / 需重拉 | 保持关闭 | 只置 dirty；直到成功 hydrate 或用户显式选择 |

**S1' 实现级要点**：

1. 闸门检查点落在 **`runPush()` 入口**（不只 `schedulePush()`），以免 30s `retryTimer` 绕过。
2. `resolveConflictUseLocal` / `resolveConflictUseCloud` **豁免闸门**（用户显式决定）；勿把闸门下沉到 `pushRemote` 以致冲突窗点了没反应。
3. 闸门为 **内存态**，刷新即关闭；`resetSyncState()` 建议一并关闭闸门（不清 `pam-cloud-bound`，见 C2）。

### B2 · `pam-cloud-bound` 键归属必须写死（第二轮复核硬阻塞 · 2026-08-12）

附录仅写「`storageKeys.js` 新增」不够。该键若进入 `ALL_CLEARABLE_KEYS`，`clearAllData()` 会清掉它 → P0-2(c) 白做；且会被 `collectLedgerData` 收进云端 payload，设备间互相覆盖绑定标记。

**本版必须写死**（`storageKeys.js` 旁注释 + 表结构）：

| 是否进入 | 结论 |
|----------|------|
| `ALL_CLEARABLE_KEYS`（重置/退出清账本） | **否** |
| `collectLedgerData` / 云同步 payload | **否** |
| patch 触发 dirty 的业务键白名单 | **否**（改绑定标记不应当成账本 dirty） |
| `PRESERVED_ON_RESET` 或并列「保留键」清单 | **是**（与 AUTH/THEME 同类：非账本文、退出后仍要记得「曾绑过云」；注意该表偏登记，真保护靠「不进 ALL_CLEARABLE_KEYS」） |
| `resetSyncState()` 清理范围 | **否**（**C2**）：不得 `removeItem('pam-cloud-bound')`；version 清零后仍须记得「绑过云」。与 pam-sync-meta 同类直觉，最易误清 |

值建议：`{ lastVersion, lastSyncedAt }`，可选 email 哈希（为 P2-2 / 换号铺路）；**不含账本正文**。

**谁写 `pam-cloud-bound`（并入 S4'）**：在 `setLocalVersion()` 同处更新（每次成功 settle / 成功 PUT）；否则键为空，P0-2(c) 落空。

**普通退出 vs 安全退出（并入 S4'）**：普通退出 **保留** 该键；安全退出（公共电脑场景）**清除** 该键，并结束 Access 会话。两条路径不得做成同一个函数却同清同留。

---

## 5. 随实施处理（P1）

| ID | 内容 |
|----|------|
| P1-1 | M2 去掉「版本相同仅指纹不同 → 静默跟云」；版本同但内容异常 → 冲突或保守推本地 |
| P1-2 | 冲突弹窗加两边摘要（条目数 / 更新时间 / 总资产）；「用云端」后提供从 `pam-sync-lastDiscarded` 恢复入口；**有摘要前按钮同权** |
| P1-3 | `empty-cloud`：区分「从未上云」vs「云端消失」；本机有数据且云 404 时 **补推**（仅存副本） |
| P1-4 | 改正文案：`dataReset` / `App.vue` 里「退出不删账本」等；更新 `docs/CLOUDFLARE.md` |
| P1-5 | smoke **硬门闩**（见 §8），禁止「视情况补」 |

---

## 6. 已知取舍 / 可缓做（P2）

| ID | 内容 |
|----|------|
| P2-1 | 服务端 `clientVersion > server.version` 放行与「云权威」略冲；M8 清零 version 后主因减弱；可改 409 `version-ahead`，本版可缓 |
| P2-2 | `pam-sync-meta` 绑 email（换号）；随「去口令」方向变重要；本版可先做在 `pam-cloud-bound` |
| P2-3 | 版本映射：`v1.MM.DD` → `1.M.D`（如 `1.8.12`）；同日多版预留 `1.8.121` 或 build 后缀，M6 写死 |
| P2-4 | I5 继续接受 |
| — | M5 回前台 **保持提示条**，不做自动跟云 |
| — | 本机口令：纯自用可去；若保留「共用设备 / 安全退出」场景，口令不应完全移除（最多可选）。**移除前确认 Access 覆盖 `/*` 含静态资源** |

### 6.3 本机口令（修订表述）

以 Access 为网络正门方向正确；**本版不实施移除**。准确限定：纯自用、设备不外借时 Access 可作唯一正门；一旦保留共用设备场景，口令不应被当成「已决可删」。

---

## 7. 实施清单与切片（重排后）

### 能力项（逻辑）

- **M1'**：门闸 + P0-1 时机 + **B1 推送闸门** + P0-3 重灌 + P0-5 超时 + P0-4 失败禁推
- **M2'**：拉取偏好（无指纹静默）+ P0-4 hydrate 原子性 + P1-3 empty-cloud
- **M3**：同步状态 UI（已同步 / 待推送 / 失败 / 离线 / 登录过期）— 必做
- **M4'**：冲突文案 + P1-2 摘要与恢复
- **M8'**：退出清缓存 + 强制重载 + idle 例外 + `pam-cloud-bound` + P1-4 文案
- **M5/M6**：回前台维持提示；文档与版本号

### 切片顺序（替代初版 S1–S5）

| 切片 | 内容 | 风险 |
|------|------|------|
| **S1'** | M1'（门闸 + 时机 + **B1 闸门** + 重灌 + 超时 + hydrate 失败禁推） | 高（本版主体） |
| **S2'** | M2' + M4' + hydrate 原子性 + empty-cloud | 中高 |
| **S3** | M3 同步状态 UI | 低，必做 |
| **S4'** | M8'（原 S5 提前；本版最高产品风险） | **高** |
| **S5'** | M5 回前台微调 + M6 文档/`1.8.12` | 低，收尾 |

**默认采纳 patch 策略**：P0-1 方案 **A**（早 patch + 登录后 settle）。

回滚：可关门闸偏好开关恢复「仅 version 更大才 hydrate」；LS 仍在。

---


### 第二轮复核 · 表述细化（不阻塞开干，S1' 实施时顺手落）

- **reload 路径**：强制 reload（退出清缓存）与「少 reload / reloadAllStores」（settle hydrate）边界并排写清，避免混用。
- **P1-3 补推**：补「换号 / 身份不一致」前置（结合 `pam-cloud-bound` email 哈希），避免把上一身份账本推到新身份。
- **smoke**：再补「hydrate 失败禁推」「settle 前不抢跑 PUT」两条。
- **`reloadAllStores` 内 `ensureCatchUp`**：其写入应能置 dirty，勿被 `suppressing` 误吞。

---

## 8. 手测与 smoke 门闩（硬性）

### 8.1 原有（保留）
- [ ] 冷启动有云无本地：不闪期初建账
- [ ] 冷启动有云有本地旧缓存且不 dirty：以云为准
- [ ] 离线记账后恢复网络：dirty 补推

### 8.2 审计增补

- [ ] 离线期间他端更新：回线冲突非静默覆盖
- [ ] 鉴权过期有提示；安全退出后云端仍在
- [ ] 现有自动化检测全绿
- [ ] 普通退出后刷新：口令前不从云端复活账本
- [ ] 普通退出不刷新再登录改账：不推陈旧内存账本
- [ ] 清缓存后离线：提示账本在云端，不引导建账
- [ ] 弱网启动约十秒内结束门闸
- [ ] 冲突选用云端后能恢复被覆盖本机账本
- [ ] 空闲自动登出后账本缓存仍在

### 8.3 自动化硬门闩

| 切片 | 至少一条 |
|------|----------|
| S1-prime | 门闸各状态与超时 |
| S1-prime | hydrate 失败禁推；settle 前不抢跑 PUT（C1 / B5） |
| S2-prime | 云优先灌入；dirty 时不跟云 |
| S4-prime | 退出清缓存后未登录前不复活 |

---

## 9. 评估结论栏（修订后）

| 项 | 结论 |
|----|------|
| 方向（KV settle 权威） | 批准（带第 0 节弱权威限定） |
| 初版能否直接开干 | 否；须按本修订版 |
| 本版范围 | S1至S5重排；含M8；不含M7与拆口令与加密反爬 |
| P0 | 1至5均为开干前约束；实施落在S1与S4 |
| 版本字面 | 1.8.12（见P2-3映射） |
| 评估与审计 | 初评加第三方2026-08-12；本修订吸收 |
| 下一步 | **第三轮已宣布可开干**；开工前确认即可启动 S1'（含 C1 验收）；未口头确认仍不改业务代码 |

---

## 10. 附录 · 代码锚点

- src/utils/cloudSync.js
- src/main.js（预加载与 ensureCatchUp 顺序）
- src/App.vue（LoginGate、logout、冲突 UI）
- src/composables/useIdleLogout.js
- src/utils/dataReset.js
- src/constants/storageKeys.js（新增 `pam-cloud-bound`：**不进** ALL_CLEARABLE_KEYS / 同步 payload / dirty 白名单；见 B2）
- functions/api/ledger/index.js

---

*修订结束（2026-08-12 · 第三轮收口：C1→S1'验收，C2→B2）。口头确认后自 S1-prime 起实施。*
