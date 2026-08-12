# PAM · v1.08.12「KV 主存储」修订稿复核（第二轮 · 2026-08-12）

对象：`docs/PLAN-v1.08.12-KV主存储.md`（审计修订版，11,016 字节）
基准：`docs/REVIEW-2026-08-12-KV主存储方案评估.md`（第一轮，P0-1…P0-5 / P1-1…P1-5 / P2-1…P2-4 + 切片重排）
性质：**只读复核，未改动任何代码。**

---

## 0. 结论

**吸收情况：P0 五条、P1 五条、P2 四条、§0 弱权威限定、切片重排 S1'→S5' —— 全部落到文字，且大多写成了可验收的祈使句（「必须」「写死」「禁止」），不是复述。这一版比初版可执行得多。**

**但修订过程中，P0-1 选定的「方案 A（早 patch + 登录后 settle）」引入了一个初版没有的新窗口，方案没写。** 这条不补，S1' 会把「漏置 dirty」换成一个更坏的问题：**settle 之前抢跑推送**。

**判定：补上 B1、B2 两条（都是方案层面各加一段，不需要先写代码），即可按 S1' 开干。** B3–B6 是表述细化，可在 S1' 实施过程中顺手落，不阻塞动工。

---

## 一、须再补（硬）

### B1 · 「早 patch」必须配套一道推送闸门，否则 settle 前会抢跑 PUT

§4 P0-1 第 3 点默认采纳方案 A：`main.js` 最早安装 patch，settle 等鉴权后。理由（尽早 patch 防漏 dirty）成立，选择本身也对。**但 patch 装上之后，被它捕获的写不只是"置 dirty"——现有 `schedulePush()` 是「置 dirty + 排 2s 防抖 PUT」一体的**（`cloudSync.js:135-139`）。

于是在方案 A 下会出现这条链：

```
main.js 装 patch
  → ensureCatchUp() 跨月写 pam-monthly-statements
  → patch 捕获 → schedulePush() → setDirty() + 2s 后 runPush()
  → runPush() 用本机 getLocalVersion() 直接 PUT
  → 而此时 settle（拉云）还没跑，用户可能还停在口令页
```

两种结果都不可接受：

- 本机 version 落后云端 → 409 → `onConflict` 在**门闸和冲突 UI 都还没就位**时触发（`initSync` 的 handlers 若尚未注册，回调直接丢失，dirty 留在那里）；
- 本机 version ≥ 服务端（云端被清过、或 P2-1 那条 `clientVersion > server.version` 放行规则）→ **服务端放行，本机的陈旧缓存直接覆盖云端权威**。这恰好是本版要消灭的那类静默覆盖，只是换了个触发点。

`attachLifecycleListeners()` 里的 `online` 事件同样调 `schedulePush()`，也在这个窗口内。

**须写进 P0-1 的第 4 点**：

> **推送闸门**：settle 成功完成之前，`schedulePush()` **只置 dirty、不发起 PUT**（防抖计时器不排、`online` 事件不触发推送）。settle 完成后统一放闸，若此时 dirty 仍在则补推一次。

顺带把 `initSync` 的职责拆清楚，写进方案更省事：`installStoragePatch()`（main.js 最早调用）/ `attachLifecycleListeners()` / `settleFromCloud()`（登录后调用，内含放闸）三段。

**同一道闸门顺手解决 P0-4 的杀伤面。** P0-4 现在只写了「失败不写 version、置需重拉标记并提示」，没写这个状态下**禁止推送**。hydrate 半失败留下的是**残缺账本**，用户若在这个状态下继续记账 → dirty → PUT → **把残缺账本推成云端权威**，比原来的"静默损坏"更严重（从只坏本机变成坏云端）。建议 P0-4 补一句：

> 「需重拉」状态下推送闸门保持关闭，直到一次成功 hydrate 或用户显式选择；期间只置 dirty。

即：闸门有两个关闭条件（settle 未完成 / 需重拉），一个统一实现。

### B2 · `pam-cloud-bound` 的键归属必须写死，否则 P0-2(c) 直接失效

§10 附录只写了「`src/constants/storageKeys.js`（新增 `pam-cloud-bound`）」，没有任何限定。这个键放错位置有两种失效方式，都是一行之差：

1. **若被加进 `ALL_CLEARABLE_KEYS`** → `clearAllData()` 会连它一起 `removeItem`（`dataReset.js:76`）→ 退出清缓存后本机照样失忆 → **P0-2(c) 整条白做**，离线诱导建账的丢账路径原样回来。
2. **若被 `collectLedgerData` 收进云端 payload**（凡在 `ALL_CLEARABLE_KEYS` 里的键都会被收）→ 本机状态跟着账本上云，再被 `replaceLedgerData` 灌到另一台设备 → **A 机的 `lastSyncedAt`/`lastVersion` 覆盖 B 机的**，两台设备互相污染彼此的绑定标记。

`ALL_CLEARABLE_KEYS` 在这个项目里同时承担三个角色（清除清单 / 备份范围 / 云同步 payload 范围 / patch 监听白名单），任何新键都必须明确它进不进这张表。**须写进 P0-2(c)**：

> `pam-cloud-bound` 属于本机同步元数据，与 `pam-sync-meta` / `pam-sync-dirty` 同类：**不进 `ALL_CLEARABLE_KEYS`、不进云端 payload、不随退出/重置清除、不被 patch 监听**。`resetSyncState()` 也不得清它（它的作用正是在 version 被清零之后仍然记得"这台机器绑过云端账本"）。

P0-4 的「需重拉」标记同此，一并写明。

---

## 二、须再补（表述，不阻塞开干）

### B3 · reload 的边界要一句话切开

§2.1 写「少整页 reload：须配套 `reloadAllStores()`」，P0-2(a) 写「必须强制 `reload`」。两者管的是不同路径，但文档里没并排说明，实施时容易被读成互相打架。建议写死：

> **settle / hydrate 路径不整页 reload**（走 `reloadAllStores()`，reload 仅作内存与存储不一致时的兜底）；**退出 / 清缓存路径必须整页 reload**（目的正是拆掉 Pinia 内存态，与今日 `secureLogout` 语义对齐）。

### B4 · P1-3 的「云 404 就补推」缺一个身份前置

P1-3 把云端 404 分成「从未上云」和「云端消失」两种，都走补推。漏了第三种：**换了 Access 身份**（KV 键是 `ledger:{email}`，新身份下自然 404）。此时补推 = 把上一个身份的账本推进新身份的 KV。

P2-2 已经识别到这点，但标为「可缓做 / 本版可先做在 `pam-cloud-bound`」。既然 `pam-cloud-bound` 无论如何都要新建，**把 email（或其哈希）一并写进去、并作为 P1-3 补推的前置校验**，增量成本接近零：身份不一致 → 不补推，改为清本机缓存后重新 settle。建议把 P2-2 从"缓做"提到 P1-3 里一起做掉。

（前端要拿到当前身份，需 GET `/api/ledger` 顺带回 `email`，或加一个极薄的 `/api/whoami`。这是本版唯一需要动 `functions/` 的地方，约 3 行。）

### B5 · 自动化门闩少两条，且缺了本轮新增的两个最难手测的路径

§8.3 只列了 S1'/S2'/S4' 三格。P0-4（hydrate 失败不写 version）和 B1（settle 前不抢跑推送）恰恰是**最难手测、最适合 mock 的两条**——前者 mock 一个 `setItem` 抛 `QuotaExceeded`，后者断言 settle 完成前 `fetch` 没有收到任何 PUT。建议：

| 切片 | 至少一条 → 建议 |
|------|------|
| S1' | 门闸各状态与超时 **+ settle 完成前无 PUT 发出** |
| S2' | 云优先灌入 / dirty 时不跟云 **+ hydrate 中途失败 → 不写 version 且闸门关闭** |
| S4' | 退出清缓存后未登录前不复活 |

§8.2 手测同步补一条：**跨自然月首次启动（会触发 `ensureCatchUp` 写入）且云端已被他端更新** → 断言登录/settle 完成前没有发出 PUT，且不出现冲突弹窗错位。

### B6 · `reloadAllStores()` 内那次 `ensureCatchUp` 的写，是**应该**置 dirty 的

P0-3 写「`reloadAllStores()` = 各 store `loadFromLocalStorage()` + 再跑 `ensureCatchUp()`……且与 `suppressing` 不打架」。这句容易被实施成"整个 `reloadAllStores` 包在 `suppressing` 里"，那样 `ensureCatchUp` 补出的新账单就**不会置 dirty、永远不上云**。

正确语义是分开的：`loadFromLocalStorage()`（只读，无所谓）与 `ensureCatchUp()`（**会写，且这次写是本机新产生的真实数据，应当正常置 dirty 并在闸门放开后推云**）。建议在 P0-3 里点明这一句，避免被"防回环"的直觉带偏。

---

## 三、逐条核对表（第一轮 → 修订稿）

| 第一轮条目 | 修订稿位置 | 判定 |
|---|---|---|
| P0-1 settle 挪到登录后 | §4 P0-1(1) | ✅ 写死 |
| P0-1 patch/settle 解耦、默认 A | §4 P0-1(2)(3)、§7 结尾 | ✅ 写死，**但缺推送闸门 → B1** |
| P0-2(a) M8 强制重载 | §4 P0-2(a) | ✅（边界待明确 → B3） |
| P0-2(b) idle 只清会话 | §4 P0-2(b) | ✅ 写死，表述准确 |
| P0-2(c) `pam-cloud-bound` + 离线文案 + 禁建账引导 | §4 P0-2(c) | ✅ 语义到位，**但键归属未定 → B2** |
| P0-3 `reloadAllStores()` | §4 P0-3 | ✅（suppressing 语义待点明 → B6） |
| P0-4 hydrate 失败不写 version | §4 P0-4 | ✅，**但缺"此状态禁止推送" → B1 后半** |
| P0-5 fetch 8–10s 超时 | §4 P0-5 | ✅ 写死 |
| P1-1 去掉指纹静默跟云 | §3 非目标第 8 条 + §5 P1-1 | ✅ 提到非目标，力度够 |
| P1-2 冲突摘要 + 恢复入口 + 按钮同权 | §2 语义表 + §5 P1-2 | ✅ 写死 |
| P1-3 empty-cloud 补推 | §5 P1-3 | ✅（缺身份前置 → B4） |
| P1-4 文案 | §5 P1-4 | ✅ |
| P1-5 smoke 硬门闩 | §5 P1-5 + §8.3 | ✅（覆盖面待补 → B5） |
| P2-1…P2-4 记为取舍 | §6 表 | ✅ |
| 口令移除的两个限定 | §6.3 + §6 表末行 | ✅ 表述准确（Access 覆盖 `/*` 前置 + 共用设备场景保留） |
| §0 弱权威 / settle 时刻限定 | §0 | ✅ 写得比我建议的更清楚 |
| 切片重排 S1'→S5'、M8 提前标高风险 | §7 | ✅ 完全采纳 |
| 手测增补 6 条 | §8.2 | ✅ 六条都在 |

**无遗漏项。** 初版第 6 节的六个开放问题（首屏等待 / 离线建账 / 口令 / 闪屏 / 双端同写 / 版本号）也都各自归入了 P0-5、§2、§6.3、P0-3、§2.1、P2-3，没有掉队。

---

## 四、开干判定

**可以开干 S1'，前置是把 B1 与 B2 各补一段进方案。**

这两条都是方案层面的文字（一段推送闸门定义 + 一段键归属声明），不需要先写代码；而它们的实施面本来就落在 S1'（闸门）和 S4'（键归属），补进去之后 S1' 的边界是清楚的、可验收的。

B3–B6 建议在 S1' 开工时一并落进方案，但不构成动工阻塞。

一句提醒：修订稿 §9 结论栏里几行被压成了无空格串（「S1至S5重排；含M8；不含M7与拆口令与加密反爬」「1至5均为开干前约束；实施落在S1与S4」）。不影响开干，但这份文档接下来要被反复引用，顺手恢复成正常断句更好读。

审计人 · 2026-08-12（第二轮）
