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
            <span class="text-sm">安全退出清账本</span>
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
              <span class="text-sm">安全退出清账本</span>
            </button>
          </nav>
        </aside>

        <main class="flex-1 overflow-y-auto">
          <div class="max-w-4xl mx-auto px-5 sm:px-8 py-6 sm:py-8">
            <header class="hidden md:flex items-baseline justify-between gap-4 mb-6">
              <h1 class="text-lg font-semibold tracking-tight">{{ getCurrentPageTitle() }}</h1>
            </header>

            <!-- 未建账提示（非建账页时） -->
            <div
              v-if="!hasOpenedBooks && activeMenu !== 'opening-books'"
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

            <OpeningBooks
              v-if="activeMenu === 'opening-books'"
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
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
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
    useIdleLogout(isAuthenticated)

    const openingStore = useOpeningBalanceStore()
    const hasOpenedBooks = computed(() => openingStore.hasOpenedBooks)

    const logout = () => {
      authStore.logout()
      diagLog('logout')
      ElMessage.success('已退出登录（账本仍保留在本机）')
    }

    const secureLogout = async () => {
      try {
        const { showSecureLogoutDialog } = await import('./utils/dataReset.js')
        await showSecureLogoutDialog(() => {
          diagLog('secure_logout_wipe')
          ElMessage.success('本机账本已清除，即将回到登录页')
          setTimeout(() => window.location.reload(), 800)
        })
      } catch (e) {
        if (e?.message) ElMessage.error(e.message)
      }
    }

    // 未建账时默认进向导；已建账进总览
    const activeMenu = ref(openingStore.hasOpenedBooks ? 'dashboard' : 'opening-books')
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
      activeMenu.value = index
    }

    const handleMobileMenuSelect = (index) => {
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

    onMounted(() => {
      window.addEventListener('resize', handleResize)
      if (!openingStore.hasOpenedBooks) {
        activeMenu.value = 'opening-books'
      }
      diagLog('app_ready', {
        hasOpenedBooks: openingStore.hasOpenedBooks,
        diagnostics: showDiagnostics.value
      })
    })

    onUnmounted(() => {
      window.removeEventListener('resize', handleResize)
    })

    return {
      activeMenu,
      showMobileMenu,
      isMobile,
      isDevelopment,
      showDiagnostics,
      openDiagnostics,
      resetting,
      hasOpenedBooks,
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
      secureLogout
    }
  }
}
</script>
