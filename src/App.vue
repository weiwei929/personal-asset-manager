<template>
  <div id="app" class="min-h-screen bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark font-display">
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

        <div v-if="isDevelopment" class="px-3 pb-5 pt-2 border-t border-border-light dark:border-border-dark">
          <button
            type="button"
            class="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs
                   text-subtext-light dark:text-subtext-dark
                   hover:text-red-600 dark:hover:text-red-400
                   hover:bg-red-50 dark:hover:bg-red-950/30
                   rounded-lg transition-colors"
            @click="resetAllData"
          >
            <LineIcon name="trash" :size="14" />
            重置数据
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
          </nav>
        </aside>

        <main class="flex-1 overflow-y-auto">
          <div class="max-w-4xl mx-auto px-5 sm:px-8 py-6 sm:py-8">
            <header class="hidden md:flex items-baseline justify-between gap-4 mb-6">
              <h1 class="text-lg font-semibold tracking-tight">{{ getCurrentPageTitle() }}</h1>
            </header>
            <Dashboard v-if="activeMenu === 'dashboard'" @openDialog="handleOpenDialog" />
            <MonthlyFinance v-else-if="activeMenu === 'monthly-finance'" />
            <BankDepositList v-else-if="activeMenu === 'bank-deposits'" />
            <StockInvestment v-else-if="activeMenu === 'stock-investment'" />
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
import BankDepositList from './components/BankDepositList.vue'
import StockInvestment from './components/StockInvestment.vue'
import LentMoney from './components/LentMoney.vue'
import ThemeToggle from './components/ThemeToggle.vue'
import LineIcon from './components/LineIcon.vue'

export default {
  name: 'App',
  components: {
    Dashboard,
    MonthlyFinance,
    BankDepositList,
    StockInvestment,
    LentMoney,
    ThemeToggle,
    LineIcon
  },
  setup() {
    const activeMenu = ref('dashboard')
    const showMobileMenu = ref(false)
    const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
    const resetting = ref(false)

    const isDevelopment = process.env.NODE_ENV === 'development'
    const isMobile = computed(() => windowWidth.value < 768)

    const menuItems = [
      { index: 'dashboard', title: '总览', icon: 'layout' },
      { index: 'monthly-finance', title: '收支', icon: 'calendar' },
      { index: 'bank-deposits', title: '存款', icon: 'bank' },
      { index: 'stock-investment', title: '投资', icon: 'trend' },
      { index: 'lent-money', title: '借出', icon: 'hand' }
    ]

    const getCurrentPageTitle = () => {
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
    })

    onUnmounted(() => {
      window.removeEventListener('resize', handleResize)
    })

    return {
      activeMenu,
      showMobileMenu,
      isMobile,
      isDevelopment,
      resetting,
      menuItems,
      handleMenuSelect,
      handleMobileMenuSelect,
      handleOpenDialog,
      handleResetData,
      getCurrentPageTitle,
      resetAllData
    }
  }
}
</script>
