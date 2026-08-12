# Cloudflare Pages 部署指南

本应用为 **Vue SPA + Cloudflare Pages Functions**。自 **v1.08.12** 起，联网且鉴权有效时以 **Cloudflare KV 为 settle 权威**；浏览器 localStorage / 内存为运行期缓冲与离线写缓存（不是「仅本机、无云」）。

---

## 1. 架构与数据落点（v1.08.12 · KV 主存储）

| 位置 | 内容 |
|------|------|
| Cloudflare Pages | 静态 HTML/JS/CSS（应用壳） |
| Pages Functions + KV | `/api/ledger`；键 `ledger:{email}`；Access JWT |
| 浏览器 localStorage | 运行期缓冲 + 离线写；口令哈希 / 主题 / `pam-cloud-bound` 等 |
| 浏览器 sessionStorage | 当前是否已登录（关标签页失效） |

**权威限定（与 `docs/PLAN-v1.08.12-KV主存储.md` 一致）：**

- **settle 时刻**以 KV 为准；两次 settle 之间真源仍是本机内存与 localStorage  
- 有未上云改动（dirty）且云端更新 → **冲突二选一**，禁止静默覆盖  
- **回前台**只做 re-settle + 轻提示条（remote-ahead），**不自动跟云**；pending/离线等看侧栏同步状态指示器  
- 换设备：登录 Access 后 settle 可从云端 hydrate；退出清本机缓存后联网再进亦可拉回  

---

## 2. 安全模型（部署后必知）

### 2.1 三种离开方式

| 操作 | 会话 | 本机账本缓存 | pam-cloud-bound | 登录密码 | 适用 |
|------|------|--------------|-----------------|----------|------|
| **退出登录** | 清除 | **清除** + 强制刷新 | **保留** | 保留 | 自己的电脑日常离开 |
| **安全退出** | 清除 | **清除** + Access logout | **清除** | 保留 | 公共电脑 / 借出设备 |
| **空闲自动退出** | 清除 | **保留** | 保留 | 保留 | 临时离开（吃饭等） |
| **重置数据**（开发环境） | 可保留 | 删除 | 保留 | 保留 | 开发自测 |

说明（v1.08.12 S4' / P0-2）：

- 普通退出与安全退出**都清本机账本缓存**，云端 KV **不删**；差别在绑定标记与 Access。
- 普通退出保留 `pam-cloud-bound`：离线再进时提示「账本在云端，当前离线，请联网后进入」，禁止空账本建账引导。
- 安全退出清除该标记并结束 Access 会话（「这台机器不属于我」）。
- 空闲退出**只清会话**，不清账本（P0-2(b)）。

### 2.2 空闲自动退出

- 登录后若 **30 分钟** 无键鼠/触摸操作 → **自动退出登录**（**不删账本**，见上表）  
- 时长常量：`src/constants/session.js` → `IDLE_TIMEOUT_MS`  
- 可用环境变量覆盖（构建时注入）：

```bash
# .env.production 示例
VUE_APP_IDLE_TIMEOUT_MS=1800000
```

`1800000` = 30 分钟；改为 `900000` = 15 分钟。

### 2.3 密码

- 首次访问设置登录密码（≥6 位）  
- 仅存 **加盐 SHA-256 哈希**，不落明文  
- 重置数据 / 安全退出：均要求输入**同一登录密码**  
- 忘记密码：只能清站点存储后重设（账本一并丢失）

### 2.4 不必做的

- 退出时清 HTTP 缓存（对账本安全帮助极小）  
- 日常退出时 `localStorage.clear()`（会毁掉口令哈希 / 主题 / 绑定标记）

---

## 3. 本地构建

```bash
cd personal-asset-manager
yarn install   # 或 npm install / pnpm i
yarn build     # 产物在 dist/
```

### 3.1 测试版诊断日志（推荐 CF 试运行）

构建时注入：

```bash
# Windows PowerShell 示例
$env:VUE_APP_DIAGNOSTICS="1"; npm run build
```

或复制 `.env.example` → `.env.production.local` 写入 `VUE_APP_DIAGNOSTICS=1`。

- 侧栏出现 **「诊断日志」**（本机记录，不出网）
- 出问题可「复制全部」对照
- 正式生产不设或设 `0`（默认生产关闭；开发环境默认开）
- 运行时也可：控制台 `localStorage.setItem('pam-diagnostics','1')` 后刷新

预览：

```bash
yarn preview
# 或: npx serve dist
```

可选：生产构建关闭 source map、相对路径（子路径部署时）：

```js
// vue.config.js 可按需增加
module.exports = defineConfig({
  transpileDependencies: true,
  publicPath: process.env.NODE_ENV === 'production' ? '/' : '/',
  productionSourceMap: false
})
```

若站点挂在子路径（如 `https://xxx.pages.dev/pam/`），将 `publicPath` 设为 `'/pam/'`。

---

## 4. 部署到 Cloudflare Pages

### 4.1 连接 Git（推荐）

1. 将仓库推送到 GitHub / GitLab  
2. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → Connect to Git  
3. 选择仓库与分支  

**构建设置建议：**

| 字段 | 值 |
|------|-----|
| Framework preset | 无 / Vue（可 None） |
| Root directory | 含 `package.json` 的目录（若 monorepo 则填 `personal-asset-manager`） |
| Build command | `yarn build` 或 `npm run build` |
| Build output directory | `dist` |
| Node version | 18 或 20（Environment variables → `NODE_VERSION=20`） |

环境变量（可选）：

| 名称 | 示例 | 说明 |
|------|------|------|
| `NODE_VERSION` | `20` | 构建 Node 版本 |
| `VUE_APP_IDLE_TIMEOUT_MS` | `1800000` | 空闲退出毫秒数 |

4. **Save and Deploy**，等待构建完成，获得 `*.pages.dev` 域名。

### 4.2 本地上传 dist（无 Git 时）

```bash
yarn build
# 使用 Wrangler（需先 npm i -g wrangler 并 login）
npx wrangler pages deploy dist --project-name=personal-asset-manager
```

### 4.3 自定义域名

Pages 项目 → **Custom domains** → 按提示绑定域名（自动 HTTPS）。

### 4.4 SPA 说明

当前用菜单切换视图、**无 Vue Router 深链**，一般**不需要**额外 `_redirects`。  
若以后加 history 模式路由，在 `public/_redirects` 增加：

```text
/*    /index.html   200
```

---

## 5. 上线检查清单

- [ ] `yarn build` 本地成功  
- [ ] 打开线上 URL，出现**登录/设密**页  
- [ ] 设置密码并进入应用  
- [ ] 期初建账，总资产手算一致  
- [ ] 刷新后需重新登录（sessionStorage 行为，关标签再开同样）  
- [ ] 闲置约 30 分钟（或缩短超时做快速测）会自动退出（**账本仍在**）  
- [ ] 「退出登录」清本机账本缓存并刷新，但保留 `pam-cloud-bound`；再登录联网可从云端拉回  
- [ ] 普通退出后离线进入：提示「账本在云端…」，**不出现**建账引导  
- [ ] 「安全退出」需密码，清账本 + 清绑定标记 + Access logout  
- [ ] 生产环境**无**「重置数据」按钮（仅 development）；开发机可用重置做测试  

---

## 6. 运维与备份建议

| 建议 | 说明 |
|------|------|
| 自用密码设长一点 | 挡的是本机被别人打开时的猜密码 |
| 重要节点自行备份 | 可用「导出备份」；另可用浏览器扩展备份 localStorage |
| 公共电脑用完必「安全退出」 | 不要只关标签；会清绑定标记并结束 Access |
| 自己电脑用「退出登录」即可 | 清本机缓存、保留绑定标记，联网后从云端恢复 |

---

## 7. 相关代码索引

| 能力 | 路径 |
|------|------|
| 登录 / 设密 | `src/stores/auth.js` · `src/components/LoginGate.vue` |
| 空闲退出（只清会话） | `src/composables/useIdleLogout.js` · `src/constants/session.js` |
| 普通退出清缓存（保留 bound） | `src/App.vue` → `logout` · `dataReset.wipeLedgerKeepCloudBound` |
| 安全退出（清 bound + Access） | `src/utils/dataReset.js` → `wipeLedgerClearCloudBound` / `showSecureLogoutDialog` |
| 云端绑定标记 | `src/constants/storageKeys.js` · `cloudSync.setLocalVersion` / `pam-cloud-bound` |
| 业务数据键 | `src/constants/storageKeys.js`（`ALL_CLEARABLE_KEYS` 不含 `pam-auth` / `pam-cloud-bound`） |
| 同步层 / settle | `src/utils/cloudSync.js` |
| 同步状态五态 UI | `src/components/SyncStatusIndicator.vue` · `src/utils/syncStatus.js` |

---

## 8. 修订记录

| 日期 | 说明 |
|------|------|
| 2026-07-20 | 初版：Pages 部署 + 闲置退出 + 安全退出清账本说明 |
| 2026-08-12 | S4'/M8'：普通/安全退出都清本机账本缓存；bound 分路；idle 例外；离线绑定门闸 |
| 2026-08-12 | S5'/M6：§1 改为 KV settle 权威说明；版本 `1.8.12`；回前台提示条不自动跟云 |
