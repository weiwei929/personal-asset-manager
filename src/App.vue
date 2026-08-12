<template>
  <LoginGate v-if="!isAuthenticated" />
  <div
    v-else
    id="app"
    class="min-h-screen bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark font-display"
  >
    <div class="flex h-screen overflow-hidden">
      <!-- 侧边栏 -->
      <aside
        class="hidden md:flex w-56 shrink-0 flex-col border-r border-border-light dark:border-border-dark
               bg-card-light dark:bg-card-dark"
      >
        <div class="flex items-center justify-between gap-2 px-5 pt-6 pb-4">
          <div class="min-w-0">
            <p class="text-base font-semibold tracking-tight truncate">我的账本</p>
            <p class="text-xs text-subtext-light dark:text-subtext-dark mt-0.5">个人资产</p>
          </div>
          <ThemeToggle />
        </div>

        <nav class="flex-1 px-3 space-y-0.5">
          <button
            v-for="item in menuItems"
            :key="item.index"
            type="button"
            class="sidebar-nav-item w-full text-left"
            :class="{ active: activeMenu === item.index }"
            @click="handleMenuSelect(item.index)"
          >
            <LineIcon :name="item.icon" :size="18" class-name="mr-2.5 opacity-80" />
            <span class="text-sm">{{ item.title }}</span>
          </button>
        </nav>

        <!-- 底栏：与主导航同风格左对齐 -->
        <div class="mt-auto border-t border-border-light dark:border-border-dark px-3 py-3 space-y-0.5">
          <button
            type="button"
            class="sidebar-nav-item w-full text-left"
            :class="{ active: activeMenu === 'opening-books' }"
            @click="handleMenuSelect('opening-books')"
          >
            <LineIcon name="calendar" :size="18" class-name="mr-2.5 opacity-80" />
            <span class="text-sm">{{ hasOpenedBooks ? '重新建账' : '期初建账' }}</span>
          </button>
          <button
            type="button"
            class="sidebar-nav-item w-full text-left"
            @click="exportBackup"
          >
            <LineIcon name="layers" :size="18" class-name="mr-2.5 opacity-80" />
            <span class="text-sm">导出备份</span>
          </button>
          <button
            type="button"
            class="sidebar-nav-item w-full text-left"
            @click="openImportPicker"
          >
            <LineIcon name="transfer" :size="18" class-name="mr-2.5 opacity-80" />
            <span class="text-sm">导入备份</span>
          </button>
          <input
            ref="importFileInput"
            type="file"
            accept=".json,application/json"
            class="hidden"
            @change="onImportFileChange"
          />
          <button
            type="button"
            class="sidebar-nav-item w-full text-left"
            @click="logout"
          >
            <LineIcon name="close" :size="18" class-name="mr-2.5 opacity-80" />
            <span class="text-sm">退出登录</span>
          </button>
          <button
            type="button"
            class="sidebar-nav-item w-full text-left
                   !text-amber-700 dark:!text-amber-400/90
                   hover:!bg-amber-50 dark:hover:!bg-amber-950/30"
            @click="secureLogout"
          >
            <LineIcon name="trash" :size="18" class-name="mr-2.5 opacity-80" />
            <span class="text-sm">安全退出</span>
          </button>
          <button
            v-if="isDevelopment"
            type="button"
            class="sidebar-nav-item w-full text-left
                   !text-red-600/90 dark:!text-red-400/90
                   hover:!bg-red-50 dark:hover:!bg-red-950/30"
            @click="resetAllData"
          >
            <LineIcon name="trash" :size="18" class-name="mr-2.5 opacity-80" />
            <span class="text-sm">重置数据</span>
          </button>
          <button
            v-if="showDiagnostics"
            type="button"
            class="sidebar-nav-item w-full text-left"
            @click="openDiagnostics"
          >
            <LineIcon name="layout" :size="18" class-name="mr-2.5 opacity-80" />
            <span class="text-sm">诊断日志</span>
          </button>
        </div>
      </aside>

      <!-- 主区 -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <!-- 移动顶栏 -->
        <header
          class="md:hidden flex items-center justify-between gap-3 px-4 py-3 border-b
                 border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark"
        >
          <div class="flex items-center gap-2 min-w-0">
            <button
              type="button"
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="打开菜单"
              @click="showMobileMenu = true"
            >
              <LineIcon name="menu" :size="20" />
            </button>
            <h1 class="text-sm font-semibold truncate">{{ getCurrentPageTitle() }}</h1>
          </div>
          <ThemeToggle />
        </header>

        <!-- 移动抽屉 -->
        <div
          v-if="showMobileMenu"
          class="md:hidden fixed inset-0 z-40 bg-black/40"
          @click="showMobileMenu = false"
        />
        <aside
          class="md:hidden fixed inset-y-0 left-0 z-50 w-64 flex flex-col
                 bg-card-light dark:bg-card-dark border-r border-border-light dark:border-border-dark
                 transform transition-transform duration-200 ease-out"
          :class="showMobileMenu ? 'translate-x-0' : '-translate-x-full pointer-events-none'"
        >
          <div class="flex items-center justify-between px-5 pt-6 pb-4">
            <p class="text-base font-semibold">我的账本</p>
            <button
              type="button"
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="关闭菜单"
              @click="showMobileMenu = false"
            >
              <LineIcon name="close" :size="18" />
            </button>
          </div>
          <nav class="flex-1 px-3 space-y-0.5">
            <button
              v-for="item in menuItems"
              :key="'m-' + item.index"
              type="button"
              class="sidebar-nav-item w-full text-left"
              :class="{ active: activeMenu === item.index }"
              @click="handleMobileMenuSelect(item.index)"
            >
              <LineIcon :name="item.icon" :size="18" class-name="mr-2.5 opacity-80" />
              <span class="text-sm">{{ item.title }}</span>
            </button>
            <button
              type="button"
              class="sidebar-nav-item w-full text-left mt-2"
              :class="{ active: activeMenu === 'opening-books' }"
              @click="handleMobileMenuSelect('opening-books')"
            >
              <LineIcon name="calendar" :size="18" class-name="mr-2.5 opacity-80" />
              <span class="text-sm">{{ hasOpenedBooks ? '重新建账' : '期初建账' }}</span>
            </button>
            <button
              type="button"
              class="sidebar-nav-item w-full text-left mt-2"
              @click="exportBackup(); showMobileMenu = false"
            >
              <span class="text-sm">导出备份</span>
            </button>
            <button
              type="button"
              class="sidebar-nav-item w-full text-left mt-1"
              @click="showMobileMenu = false; openImportPicker()"
            >
              <span class="text-sm">导入备份</span>
            </button>
            <button
              type="button"
              class="sidebar-nav-item w-full text-left mt-2"
              @click="logout(); showMobileMenu = false"
            >
              <span class="text-sm">退出登录</span>
            </button>
            <button
              type="button"
              class="sidebar-nav-item w-full text-left mt-1
                     !text-amber-700 dark:!text-amber-400/90"
              @click="showMobileMenu = false; secureLogout()"
            >
              <span class="text-sm">安全退出</span>
            </button>
          </nav>
        </aside>

        <main class="flex-1 overflow-y-auto">
          <div class="max-w-4xl mx-auto px-5 sm:px-8 py-6 sm:py-8">
            <header class="hidden md:flex items-baseline justify-between gap-4 mb-6">
              <h1 class="text-lg font-semibold tracking-tight">{{ getCurrentPageTitle() }}</h1>
            </header>

            <!-- P0-2(c)：离线 + 曾绑定云端 + 无期初 → 禁止建账引导 -->
            <div
              v-if="cloudBoundOffline"
              class="mb-6 rounded-xl border border-sky-200 dark:border-sky-900/50
                     bg-sky-50 dark:bg-sky-950/30 px-4 py-3"
            >
              <p class="text-sm text-sky-900 dark:text-sky-200">
                账本在云端，当前离线，请联网后进入
              </p>
              <p class="mt-1 text-xs text-sky-800/80 dark:text-sky-300/80">
                本机无缓存账本；联网后会自动从云端同步，请勿在此新建空账本。
              </p>
            </div>

            <!-- 未建账提示（非建账页时；离线绑定门闸开启时不展示建账引导） -->
            <div
              v-else-if="!hasOpenedBooks && activeMenu !== 'opening-books'"
              class="mb-6 rounded-xl border border-amber-200 dark:border-amber-900/50
                     bg-amber-50 dark:bg-amber-950/30 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
            >
              <p class="text-sm text-amber-900 dark:text-amber-200">
                尚未期初建账 · 总资产可能为 0，请先录入存量快照
              </p>
              <button
                type="button"
                class="text-sm font-medium text-amber-800 dark:text-amber-100 underline underline-offset-2"
                @click="handleMenuSelect('opening-books')"
              >
                去建账
              </button>
            </div>

            <div
              v-if="cloudBoundOffline && activeMenu === 'opening-books'"
              class="rounded-xl border border-sky-200 dark:border-sky-900/50
                     bg-sky-50 dark:bg-sky-950/30 px-4 py-8 text-center"
            >
              <p class="text-sm text-sky-900 dark:text-sky-200">
                账本在云端，当前离线，请联网后进入
              </p>
              <p class="mt-2 text-xs text-sky-800/80 dark:text-sky-300/80">
                已禁止空账本 / 建账引导，避免离线新建覆盖云端真账本。
              </p>
            </div>
            <OpeningBooks
              v-else-if="activeMenu === 'opening-books'"
              @done="onOpeningDone"
            />
            <Dashboard v-else-if="activeMenu === 'dashboard'" @openDialog="handleOpenDialog" />
            <MonthlyFinance v-else-if="activeMenu === 'monthly-finance'" />
            <BankAccounts v-else-if="activeMenu === 'bank-deposits'" />
            <Investment v-else-if="activeMenu === 'stock-investment'" />
            <LentMoney v-else-if="activeMenu === 'lent-money'" />
          </div>
        </main>
      </div>
    </div>
  </div>
      <div
      v-if="syncConflict"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="syncConflict = null"
    >
      <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">账本冲突 · 请二选一</h3>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
          本机有未上云改动，同时云端也有更新（云端
          {{ syncConflict.serverUpdatedAt ? new Date(syncConflict.serverUpdatedAt).toLocaleString() : '—' }}）。
          只能整本保留一份；覆盖前会自动备份将被丢弃的一侧。
        </p>
        <div class="mt-4 grid grid-cols-2 gap-3 text-xs text-gray-700 dark:text-gray-200">
          <div class="rounded-lg border border-gray-200 p-3 dark:border-gray-600">
            <p class="font-medium text-gray-900 dark:text-gray-100">本机</p>
            <p class="mt-1">条目 {{ syncConflict.localSummary?.entryCount ?? '…' }}</p>
            <p>总资产 ¥{{ formatConflictAmount(syncConflict.localSummary?.totalAssets) }}</p>
            <p class="text-gray-500 dark:text-gray-400">未同步改动</p>
          </div>
          <div class="rounded-lg border border-gray-200 p-3 dark:border-gray-600">
            <p class="font-medium text-gray-900 dark:text-gray-100">云端</p>
            <p class="mt-1">条目 {{ syncConflict.cloudSummary?.entryCount ?? '…' }}</p>
            <p>总资产 ¥{{ formatConflictAmount(syncConflict.cloudSummary?.totalAssets) }}</p>
            <p class="text-gray-500 dark:text-gray-400">
              {{ syncConflict.serverUpdatedAt ? new Date(syncConflict.serverUpdatedAt).toLocaleString() : '—' }}
            </p>
          </div>
        </div>
        <p class="mt-3 text-xs text-gray-500 dark:text-gray-400">
          「用本机」会覆盖云端；「用云端」会覆盖本机（可从覆盖前备份恢复）。
        </p>
        <div class="mt-4 flex gap-3">
          <button
            type="button"
            class="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            @click="chooseLocal"
          >
            用本机（覆盖云端）
          </button>
          <button
            type="button"
            class="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            @click="chooseCloud"
          >
            用云端（覆盖本机）
          </button>
        </div>
      </div>
    </div>
    <!-- P1-2：用云端覆盖后，可从 pam-sync-lastDiscarded 恢复本机账本 -->
    <div
      v-if="discardedRestoreAvailable"
      class="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-lg bg-amber-700 px-4 py-3 text-sm font-medium text-white shadow-lg"
    >
      <span>本机账本已被云端覆盖，可恢复覆盖前备份</span>
      <button
        type="button"
        class="shrink-0 rounded border border-white/40 px-2 py-1 text-xs hover:bg-white/10"
        @click="restoreDiscardedLocal"
      >
        恢复本机
      </button>
    </div>
    <!-- P1：回前台发现云端有新数据 → 提示条（点按刷新，不自动 reload 以免打断输入） -->
    <div
      v-if="syncRemoteAhead && !discardedRestoreAvailable"
      class="fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 cursor-pointer rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-medium text-white shadow-lg"
      @click="refreshForRemoteAhead"
    >
      云端有新的账本数据，点击刷新查看
    </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'

import Dashboard from './components/Dashboard.vue'
import MonthlyFinance from './components/MonthlyFinance.vue'
import BankAccounts from './components/BankAccounts.vue'
import Investment from './components/Investment.vue'
import LentMoney from './components/LentMoney.vue'
import OpeningBooks from './components/OpeningBooks.vue'
import LoginGate from './components/LoginGate.vue'
import ThemeToggle from './components/ThemeToggle.vue'
import LineIcon from './components/LineIcon.vue'
import { useOpeningBalanceStore } from './stores/openingBalance.js'
import { useAuthStore } from './stores/auth.js'
import { useIdleLogout } from './composables/useIdleLogout.js'
import {
  isDiagnosticsEnabled,
  getDiagLogs,
  formatDiagLogsText,
  copyDiagLogs,
  diagLog
} from './utils/diagnostics.js'
import {
  initSync,
  settleLedger,
  reloadAllStores,
  closePushGate,
  resolveConflictUseLocal,
  resolveConflictUseCloud,
  getRemoteLedger,
  serializeLocal,
  shouldBlockEmptyLedgerOnboarding,
  summarizeLedgerData,
  getLastDiscardedBackup,
  restoreLastDiscardedLedger,
  LAST_DISCARDED_KEY
} from './utils/cloudSync.js'

export default {
  name: 'App',
  components: {
    Dashboard,
    MonthlyFinance,
    BankAccounts,
    Investment,
    LentMoney,
    OpeningBooks,
    LoginGate,
    ThemeToggle,
    LineIcon
  },
  setup() {
    const authStore = useAuthStore()
    authStore.load()
    const isAuthenticated = computed(() => authStore.isAuthenticated)
    // P0-2(b)：idle 只调 auth.logout() 清会话，绝不走下方 logout() 清账本路径
    useIdleLogout(isAuthenticated)

    const openingStore = useOpeningBalanceStore()    
    const syncConflict = ref(null) // { serverVersion, serverUpdatedAt, localSummary?, cloudSummary? }
    const syncRemoteAhead = ref(null) // 回前台发现云端更新 { version, updatedAt }（提示条）
    const discardedRestoreAvailable = ref(false) // P1-2：用云端后可恢复
    const cloudBoundOffline = ref(false) // P0-2(c) 离线绑定门闸
    const hasOpenedBooks = computed(() => openingStore.hasOpenedBooks)
    // 未建账时默认进向导；已建账进总览（离线绑定门闸开启后由 applySettleOutcome 改道）
    const activeMenu = ref(openingStore.hasOpenedBooks ? 'dashboard' : 'opening-books')

    const formatConflictAmount = (n) => {
      if (n == null || Number.isNaN(Number(n))) return '—'
      return Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    }

    const buildConflictState = async (serverVersion, serverUpdatedAt) => {
      const localData = serializeLocal()
      const localSummary = summarizeLedgerData(localData, null)
      let cloudSummary = null
      try {
        const remote = await getRemoteLedger()
        if (remote?.data) {
          cloudSummary = summarizeLedgerData(remote.data, remote.updatedAt || serverUpdatedAt)
        }
      } catch (e) {
        console.warn('[cloud-sync] conflict summary fetch failed:', e?.message || e)
      }
      if (!cloudSummary) {
        cloudSummary = { entryCount: null, totalAssets: null, updatedAt: serverUpdatedAt }
      }
      return { serverVersion, serverUpdatedAt, localSummary, cloudSummary }
    }

    const applySettleOutcome = (outcome) => {
      const block = shouldBlockEmptyLedgerOnboarding(outcome)
      cloudBoundOffline.value = block
      if (block && activeMenu.value === 'opening-books') {
        activeMenu.value = 'dashboard'
      }
    }

    /**
     * S4' 普通退出（用户显式点击）：清本机账本缓存 + 保留 pam-cloud-bound + 强制 reload。
     * 与 idle / auth.logout 分路；与安全退出对 bound 的处理也分路。
     */
    const logout = async () => {
      try {
        const { wipeLedgerKeepCloudBound } = await import('./utils/ledgerWipe.js')
        const result = wipeLedgerKeepCloudBound()
        if (!result.success) {
          ElMessage.error(result.message || '清除本机账本失败')
          return
        }
        authStore.logout()
        closePushGate()
        diagLog('logout_wipe_keep_bound')
        ElMessage.success('已退出并清除本机账本缓存（云端保留；绑定标记保留）')
        setTimeout(() => {
          window.location.reload()
        }, 800)
      } catch (e) {
        ElMessage.error('退出失败：' + (e?.message || e))
      }
    }

    const secureLogout = async () => {
      try {
        const { showSecureLogoutDialog } = await import('./utils/dataReset.js')
        await showSecureLogoutDialog(() => {
          diagLog('secure_logout_wipe_clear_bound')
          ElMessage.success('本机账本与绑定标记已清除，正在退出 Cloudflare 登录…')
          setTimeout(() => {
            const host = window.location.hostname
            const isLocalDev = host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === ''
            if (isLocalDev) {
              window.location.reload() // dev 环境无 Access 门禁，退回本地刷新
            } else {
              // 结束 Access 会话：不跳转则下一个人打开页面会把云端账本拉回本机
              window.location.assign('/cdn-cgi/access/logout')
            }
          }, 800)
        })
      } catch (e) {
        if (e?.message) ElMessage.error(e.message)
      }
    }

    // 导出/导入备份（G4 可恢复 · E1）
    const importFileInput = ref(null)

    const exportBackup = async () => {
      try {
        const { collectLedgerData, downloadBackup } = await import('./utils/ledgerBackup.js')
        const backup = collectLedgerData((key) => localStorage.getItem(key))
        if (Object.keys(backup.data).length === 0) {
          ElMessage.warning('当前无账本数据可导出')
          return
        }
        const filename = downloadBackup(backup)
        diagLog('export_backup', { filename, keys: Object.keys(backup.data).length })
        ElMessage.success(`已导出备份：${filename}`)
      } catch (e) {
        ElMessage.error('导出失败：' + (e?.message || e))
      }
    }

    const openImportPicker = () => {
      if (importFileInput.value) importFileInput.value.click()
    }

    const onImportFileChange = async (e) => {
      const file = e.target.files?.[0]
      if (e.target) e.target.value = '' // 允许再次选择同一文件
      if (!file) return
      try {
        const { ElMessageBox } = await import('element-plus')
        await ElMessageBox.confirm(
          `将以备份文件「${file.name}」覆盖当前账本（银行、收支、投资、借贷等全部业务数据）。\n\n` +
            '导入前建议先「导出备份」。此操作不可撤销！',
          '确认导入备份',
          {
            confirmButtonText: '确认覆盖导入',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        const { importBackupFromFile } = await import('./utils/ledgerBackup.js')
        const { written } = await importBackupFromFile(file)
        diagLog('import_backup', { filename: file.name, written: written.length })
        ElMessage.success(`导入成功（${written.length} 项），页面即将刷新`)
        setTimeout(() => window.location.reload(), 1200)
      } catch (action) {
        if (action === 'cancel' || action === 'close') {
          ElMessage.info('已取消导入')
          return
        }
        ElMessage.error('导入失败：' + (action?.message || action))
      }
    }

    // activeMenu 已提前声明（供 applySettleOutcome / 离线门闸）
    const showMobileMenu = ref(false)
    const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
    const resetting = ref(false)
    const showDiagnostics = ref(isDiagnosticsEnabled())

    const isDevelopment = process.env.NODE_ENV === 'development'

    const openDiagnostics = async () => {
      const { ElMessageBox } = await import('element-plus')
      const logs = getDiagLogs()
      const preview = formatDiagLogsText()
      const short =
        preview.length > 1200 ? preview.slice(0, 1200) + '\n…（已截断，复制可得全文）' : preview
      try {
        await ElMessageBox.confirm(
          `本机诊断记录（共 ${logs.length} 条，不出网）。\n\n` +
            '出问题可点「复制全部」发给协助排查的人。\n\n' +
            short,
          '诊断日志',
          {
            confirmButtonText: '复制全部',
            cancelButtonText: '关闭',
            distinguishCancelAndClose: true,
            type: 'info'
          }
        )
        const ok = await copyDiagLogs()
        if (ok) ElMessage.success('已复制到剪贴板')
        else ElMessage.warning('复制失败，请重试或打开控制台查看')
      } catch (action) {
        if (action === 'cancel') {
          /* close */
        }
      }
    }
    const isMobile = computed(() => windowWidth.value < 768)

    const menuItems = [
      { index: 'dashboard', title: '总览', icon: 'layout' },
      { index: 'monthly-finance', title: '月度收支', icon: 'calendar' },
      { index: 'bank-deposits', title: '银行账户', icon: 'bank' },
      { index: 'stock-investment', title: '股票/基金', icon: 'trend' },
      { index: 'lent-money', title: '个人借贷', icon: 'hand' }
    ]

    const getCurrentPageTitle = () => {
      if (activeMenu.value === 'opening-books') {
        return hasOpenedBooks.value ? '重新建账' : '期初建账'
      }
      const currentItem = menuItems.find(item => item.index === activeMenu.value)
      return currentItem ? currentItem.title : '总览'
    }

    const resetAllData = async () => {
      await handleResetData()
    }

    const handleMenuSelect = (index) => {
      if (cloudBoundOffline.value && index === 'opening-books' && !hasOpenedBooks.value) {
        ElMessage.info('账本在云端，当前离线，请联网后进入')
        return
      }
      activeMenu.value = index
    }

    const handleMobileMenuSelect = (index) => {
      if (cloudBoundOffline.value && index === 'opening-books' && !hasOpenedBooks.value) {
        ElMessage.info('账本在云端，当前离线，请联网后进入')
        showMobileMenu.value = false
        return
      }
      activeMenu.value = index
      showMobileMenu.value = false
    }

    const onOpeningDone = () => {
      activeMenu.value = 'dashboard'
    }

    const handleOpenDialog = (dialogType) => {
      switch (dialogType) {
        case 'monthlyFinance':
          activeMenu.value = 'monthly-finance'
          break
        case 'bankDeposit':
          activeMenu.value = 'bank-deposits'
          break
        case 'stockInvestment':
          activeMenu.value = 'stock-investment'
          break
        case 'lentMoney':
          activeMenu.value = 'lent-money'
          break
        case 'openingBooks':
          if (cloudBoundOffline.value && !hasOpenedBooks.value) {
            ElMessage.info('账本在云端，当前离线，请联网后进入')
            break
          }
          activeMenu.value = 'opening-books'
          break
      }
    }

    const handleResetData = async () => {
      if (!isDevelopment) {
        ElMessage.warning('此功能仅在开发环境可用')
        return
      }

      try {
        resetting.value = true
        const { showResetConfirmDialog } = await import('./utils/dataReset.js')
        await showResetConfirmDialog(() => {
          diagLog('dev_reset_data')
          ElMessage.success('数据重置成功，页面即将刷新')
          setTimeout(() => {
            window.location.reload()
          }, 1500)
        })
      } catch (error) {
        console.error('重置数据失败:', error)
        ElMessage.error('重置数据失败: ' + error.message)
      } finally {
        resetting.value = false
      }
    }

    const handleResize = () => {
      windowWidth.value = window.innerWidth
    }

    /** P0-1：仅在 LoginGate 通过后 settle；门闸 UI 亦在该边界内 */
    const runSettleAfterAuth = () => {
      settleLedger()
        .then((outcome) => {
          applySettleOutcome(outcome)
        })
        .catch((e) => {
          console.warn('[cloud-sync] settle after auth failed:', e?.message || e)
        })
    }

    onMounted(() => {
      window.addEventListener('resize', handleResize)
      if (!openingStore.hasOpenedBooks) {
        activeMenu.value = 'opening-books'
      }
      diagLog('app_ready', {
        hasOpenedBooks: openingStore.hasOpenedBooks,
        diagnostics: showDiagnostics.value
      })
      initSync({
        onConflict: (serverVersion, serverUpdatedAt) => {
          // 先同权展示弹窗（摘要异步补齐，P1-2：有摘要前按钮同权）
          syncConflict.value = {
            serverVersion,
            serverUpdatedAt,
            localSummary: summarizeLedgerData(serializeLocal(), null),
            cloudSummary: null
          }
          buildConflictState(serverVersion, serverUpdatedAt).then((state) => {
            if (syncConflict.value?.serverVersion === serverVersion) {
              syncConflict.value = state
            }
          })
        },
        onHydrated: () => {
          cloudBoundOffline.value = false
          ElMessage.success('已从云端同步最新账本')
          // P0-3：优先重灌 Pinia，整页 reload 仅作兜底
          reloadAllStores().catch((e) => {
            console.warn('[cloud-sync] reloadAllStores failed, fallback reload:', e?.message || e)
            window.location.reload()
          })
        },
        onHydrateFailed: () => {
          ElMessage.error('云端账本合入失败，请检查网络后重试（已禁止推送以防覆盖云端）')
        },
        onRemoteAhead: (version, updatedAt) => {
          if (syncRemoteAhead.value) return
          syncRemoteAhead.value = { version, updatedAt }
        },
        onAuthExpired: () => {
          closePushGate()
          ElMessage.warning('云同步已断开（登录会话过期），请刷新页面重新登录')
        },
        onIdentityBlocked: () => {
          ElMessage.warning('检测到云端身份与本机绑定不一致，已跳过空云补推，请确认账号后重试')
        },
        onSettle: (outcome) => {
          applySettleOutcome(outcome)
        }
      })
      if (isAuthenticated.value) {
        runSettleAfterAuth()
      }
      // 冷启动：若上次「用云端」留下了可恢复备份，提示入口
      discardedRestoreAvailable.value = getLastDiscardedBackup() != null
    })

    watch(isAuthenticated, (authed, wasAuthed) => {
      if (authed && !wasAuthed) {
        runSettleAfterAuth()
      } else if (!authed) {
        closePushGate()
      }
    })

    onUnmounted(() => {
      window.removeEventListener('resize', handleResize)
    })

    /** 冲突覆盖前，把「将被丢弃的那一份」落盘备份（I2；iOS 可能拦下载，另写 localStorage 兜底） */
    const stashDiscardedBackup = async (data, note) => {
      try {
        const { downloadBackup, BACKUP_FORMAT, BACKUP_FORMAT_VERSION } = await import('./utils/ledgerBackup.js')
        const backup = {
          format: BACKUP_FORMAT,
          formatVersion: BACKUP_FORMAT_VERSION,
          app: 'personal-asset-manager',
          exportedAt: new Date().toISOString(),
          note,
          data
        }
        try {
          localStorage.setItem(LAST_DISCARDED_KEY, JSON.stringify(backup))
        } catch (e) {
          console.warn('[sync] 覆盖前备份写 localStorage 失败:', e?.message || e)
        }
        downloadBackup(backup)
      } catch (e) {
        console.warn('[sync] 覆盖前备份失败:', e?.message || e)
      }
    }

    const chooseLocal = async () => {
      if (!syncConflict.value) return
      try {
        // 用最新的云端版本做基线，顺便取「将被覆盖的云端副本」用于备份
        const remote = await getRemoteLedger()
        if (remote) {
          await stashDiscardedBackup(remote.data, '用本地覆盖前·云端账本')
        }
        const result = await resolveConflictUseLocal(remote ? remote.version : syncConflict.value.serverVersion)
        if (result && result.conflict) {
          // 云端在刚才又被别处更新 → 不谎报成功，重弹窗
          const state = await buildConflictState(result.serverVersion, result.serverUpdatedAt)
          syncConflict.value = state
          ElMessage.warning('云端在刚才又有更新，请重新选择')
          return
        }
        if (result && !result.ok) {
          syncConflict.value = null
          ElMessage.warning(result.reason === 'empty-local' ? '本机已无数据，未执行覆盖' : '操作未完成')
          return
        }
        syncConflict.value = null
        syncRemoteAhead.value = null
        discardedRestoreAvailable.value = getLastDiscardedBackup() != null
        ElMessage.success('已用本地账本覆盖云端')
      } catch (e) {
        ElMessage.error('操作失败：' + (e?.message || e))
      }
    }

    const chooseCloud = async () => {
      if (!syncConflict.value) return
      try {
        const localData = serializeLocal()
        if (Object.keys(localData).length > 0) {
          await stashDiscardedBackup(localData, '用云端覆盖前·本机账本')
        }
        const result = await resolveConflictUseCloud()
        if (result && result.reason === 'no-cloud-data') {
          ElMessage.warning('云端暂无数据，已取消')
          return
        }
        if (result && result.reason === 'hydrate-failed') {
          ElMessage.error('合入云端失败，本机未覆盖')
          return
        }
        syncConflict.value = null
        syncRemoteAhead.value = null
        discardedRestoreAvailable.value = getLastDiscardedBackup() != null
        ElMessage.success('已用云端账本覆盖本机；如需恢复，可点底部「恢复本机」')
      } catch (e) {
        ElMessage.error('操作失败：' + (e?.message || e))
      }
    }

    const restoreDiscardedLocal = async () => {
      try {
        const result = restoreLastDiscardedLedger()
        if (!result.ok) {
          ElMessage.warning('没有可恢复的覆盖前备份')
          discardedRestoreAvailable.value = false
          return
        }
        await reloadAllStores().catch(() => window.location.reload())
        discardedRestoreAvailable.value = true
        ElMessage.success('已恢复覆盖前的本机账本（将按同步规则推云）')
      } catch (e) {
        ElMessage.error('恢复失败：' + (e?.message || e))
      }
    }

    const refreshForRemoteAhead = () => {
      window.location.reload()
    }

    return {
      activeMenu,
      showMobileMenu,
      isMobile,
      isDevelopment,
      showDiagnostics,
      openDiagnostics,
      resetting,
      hasOpenedBooks,
      cloudBoundOffline,
      isAuthenticated,
      menuItems,
      handleMenuSelect,
      handleMobileMenuSelect,
      handleOpenDialog,
      handleResetData,
      getCurrentPageTitle,
      resetAllData,
      onOpeningDone,
      logout,
      secureLogout,
      importFileInput,
      exportBackup,
      openImportPicker,
      onImportFileChange,
      syncConflict,
      syncRemoteAhead,
      discardedRestoreAvailable,
      formatConflictAmount,
      refreshForRemoteAhead,
      chooseLocal,
      chooseCloud,
      restoreDiscardedLocal
    }
  }
}
</script>
