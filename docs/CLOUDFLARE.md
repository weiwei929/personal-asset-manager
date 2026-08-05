# Cloudflare Pages 部署指南

本应用为 **纯前端 Vue SPA**，数据与登录凭证均在浏览器本地存储，**无需后端**。适合部署到 Cloudflare Pages。

---

## 1. 架构与数据落点

| 位置 | 内容 |
|------|------|
| Cloudflare Pages | 静态 HTML/JS/CSS（应用壳） |
| 浏览器 localStorage | 账本业务数据 + 登录密码哈希 |
| 浏览器 sessionStorage | 当前是否已登录（关标签页失效） |

**含义：**

- 打开同一 Cloudflare 网址 ≠ 自动同步账本  
- 账本只在**你用过并登录过的那台设备的浏览器**里  
- 换设备 = 空账本，需重新建账（或自行备份/迁移 localStorage，二期可做导出）

数据量极小，**现阶段不必上后端**。

---

## 2. 安全模型（部署后必知）

### 2.1 三种离开方式

| 操作 | 会话 | 本机账本 | 登录密码 | 适用 |
|------|------|----------|----------|------|
| **退出登录** | 清除 | **保留** | 保留 | 自己的电脑日常离开 |
| **安全退出清账本** | 清除 | **删除** | 保留 | 公共电脑 / 借出设备 |
| **重置数据**（开发环境） | 可保留 | 删除 | 保留 | 开发自测 |

### 2.2 空闲自动退出

- 登录后若 **30 分钟** 无键鼠/触摸操作 → **自动退出登录**（不删账本）  
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
- 重置数据 / 安全退出清账本：均要求输入**同一登录密码**  
- 忘记密码：只能清站点存储后重设（账本一并丢失）

### 2.4 不必做的

- 退出时清 HTTP 缓存（对账本安全帮助极小）  
- 日常退出时 `localStorage.clear()`（会毁掉可用体验）

---

## 3. 本地构建

```bash
cd personal-asset-manager
yarn install   # 或 npm install / pnpm i
yarn build     # 产物在 dist/
```

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
- [ ] 闲置约 30 分钟（或缩短超时做快速测）会自动退出  
- [ ] 「退出登录」后账本仍在，再登录数据还在  
- [ ] 「安全退出清账本」需密码，清后登录为空账本  
- [ ] 生产环境**无**「重置数据」按钮（仅 development）；开发机可用重置做测试  

---

## 6. 运维与备份建议

| 建议 | 说明 |
|------|------|
| 自用密码设长一点 | 挡的是本机被别人打开时的猜密码 |
| 重要节点自行备份 | 二期可做 JSON 导出；现阶段可用浏览器扩展备份 localStorage |
| 公共电脑用完必「安全退出清账本」 | 不要只关标签 |
| 自己电脑用「退出登录」即可 | 保留账本 |

---

## 7. 相关代码索引

| 能力 | 路径 |
|------|------|
| 登录 / 设密 | `src/stores/auth.js` · `src/components/LoginGate.vue` |
| 空闲退出 | `src/composables/useIdleLogout.js` · `src/constants/session.js` |
| 安全退出清账本 | `src/utils/dataReset.js` → `showSecureLogoutDialog` / `secureLogoutAndWipe` |
| 业务数据键 | `src/constants/storageKeys.js`（`ALL_CLEARABLE_KEYS` 不含 `pam-auth`） |

---

## 8. 修订记录

| 日期 | 说明 |
|------|------|
| 2026-07-20 | 初版：Pages 部署 + 闲置退出 + 安全退出清账本说明 |
