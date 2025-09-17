<template>
  <div id="app" class="bg-background-light dark:bg-background-dark font-display">
    <div class="flex h-screen">
      <!-- 侧边栏 -->
      <aside class="w-64 bg-card-light dark:bg-card-dark flex flex-col p-6 shadow-lg">
        <div class="flex items-center mb-10">
          <h1 class="text-xl font-bold text-text-light dark:text-text-dark">个人资产管理系统</h1>
          <div class="ml-auto">
            <ThemeToggle />
          </div>
        </div>
        
        <nav class="flex-1 space-y-4">
          <a 
            v-for="item in menuItems" 
            :key="item.index"
            @click="handleMenuSelect(item.index)"
            :class="[
              'sidebar-nav-item cursor-pointer',
              { 'active': activeMenu === item.index }
            ]"
          >
            <span class="material-icons-outlined mr-3">{{ item.icon }}</span>
            <span>{{ item.title }}</span>
          </a>
        </nav>
        
        <div class="mt-auto">
          <button 
            @click="resetAllData"
            class="w-full flex items-center justify-center px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            <span class="material-icons-outlined mr-3">delete</span>
            <span>重置数据</span>
          </button>
        </div>
      </aside>

      <!-- 主内容区域 -->
      <main class="flex-1 overflow-y-auto">
        <!-- 移动端菜单遮罩 -->
        <div v-if="isMobile && showMobileMenu" class="fixed inset-0 bg-black bg-opacity-50 z-40" @click="showMobileMenu = false"></div>
        
        <!-- 移动端侧边栏 -->
        <div v-if="isMobile" :class="['fixed inset-y-0 left-0 z-50 w-64 bg-card-light dark:bg-card-dark transform transition-transform duration-300 ease-in-out', showMobileMenu ? 'translate-x-0' : '-translate-x-full']">
          <div class="flex flex-col h-full p-6">
            <div class="flex items-center justify-between mb-10">
              <h1 class="text-xl font-bold text-text-light dark:text-text-dark">资产管理</h1>
              <button @click="showMobileMenu = false" class="p-2 rounded-full bg-gray-200 dark:bg-gray-700">
                <span class="material-icons-outlined text-text-light dark:text-text-dark">close</span>
              </button>
            </div>
            
            <nav class="flex-1 space-y-4">
              <a 
                v-for="item in menuItems" 
                :key="item.index"
                @click="handleMenuSelect(item.index); showMobileMenu = false"
                :class="[
                  'sidebar-nav-item cursor-pointer',
                  { 'active': activeMenu === item.index }
                ]"
              >
                <span class="material-icons-outlined mr-3">{{ item.icon }}</span>
                <span>{{ item.title }}</span>
              </a>
            </nav>
            
            <div class="mt-auto">
              <button 
                @click="resetAllData"
                class="w-full flex items-center justify-center px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                <span class="material-icons-outlined mr-3">delete</span>
                <span>重置数据</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 移动端顶部栏 -->
        <div v-if="isMobile" class="flex items-center justify-between mb-6 p-4 bg-card-light dark:bg-card-dark rounded-lg shadow">
          <h1 class="text-lg font-semibold text-text-light dark:text-text-dark">{{ getCurrentPageTitle() }}</h1>
          <div class="flex items-center space-x-2">
            <ThemeToggle />
            <button @click="showMobileMenu = true" class="p-2 rounded-full bg-gray-200 dark:bg-gray-700">
              <span class="material-icons-outlined text-text-light dark:text-text-dark">menu</span>
            </button>
          </div>
        </div>

        <!-- 组件渲染区域 -->
        <Dashboard v-if="activeMenu === 'dashboard'" @openDialog="handleOpenDialog" />
        <MonthlyFinance v-else-if="activeMenu === 'monthly-finance'" />
        <BankDepositList v-else-if="activeMenu === 'bank-deposits'" />
        <StockInvestment v-else-if="activeMenu === 'stock-investment'" />
        <LentMoney v-else-if="activeMenu === 'lent-money'" />
      </main>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'

// 导入组件
import Dashboard from './components/Dashboard.vue'
import MonthlyFinance from './components/MonthlyFinance.vue'
import BankDepositList from './components/BankDepositList.vue'
import StockInvestment from './components/StockInvestment.vue'
import LentMoney from './components/LentMoney.vue'
import ThemeToggle from './components/ThemeToggle.vue'

export default {
  name: 'App',
  components: {
    Dashboard,
    MonthlyFinance,
    BankDepositList,
    StockInvestment,
    LentMoney,
    ThemeToggle
  },
  setup() {
    const activeMenu = ref('dashboard')
    const showMobileMenu = ref(false)
    const windowWidth = ref(window.innerWidth)
    const resetting = ref(false)

    // 判断是否为开发环境
    const isDevelopment = process.env.NODE_ENV === 'development'

    // 判断是否为移动端
    const isMobile = computed(() => windowWidth.value < 768)

    // 菜单项配置
    const menuItems = [
      { index: 'dashboard', title: '总览面板', label: '概览', icon: 'dashboard' },
      { index: 'monthly-finance', title: '月度收支', label: '收支', icon: 'calendar_today' },
      { index: 'bank-deposits', title: '银行存款', label: '存款', icon: 'account_balance' },
      { index: 'stock-investment', title: '股票投资', label: '股票', icon: 'trending_up' },
      { index: 'lent-money', title: '借出资金', label: '借贷', icon: 'real_estate_agent' }
    ]

    // 获取当前页面标题
    const getCurrentPageTitle = () => {
      const currentItem = menuItems.find(item => item.index === activeMenu.value)
      return currentItem ? currentItem.title : '总览面板'
    }

    // 重置所有数据
    const resetAllData = async () => {
      await handleResetData()
    }

    const handleMenuSelect = (index) => {
      activeMenu.value = index
    }

    const handleMobileMenuSelect = (index) => {
      activeMenu.value = index
      showMobileMenu.value = false // 关闭抽屉
    }

    const handleOpenDialog = (dialogType) => {
      // 根据对话框类型跳转到对应页面
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

    // 重置数据处理
    const handleResetData = async () => {
      if (!isDevelopment) {
        ElMessage.warning('此功能仅在开发环境可用')
        return
      }

      try {
        resetting.value = true
        
        // 动态导入重置工具
        const { showResetConfirmDialog } = await import('./utils/dataReset.js')
        
        // 显示确认对话框
        const confirmed = await showResetConfirmDialog(() => {
          // 重置成功后的回调
          ElMessage.success('数据重置成功，页面即将刷新')
          setTimeout(() => {
            window.location.reload()
          }, 1500)
        })

        if (confirmed) {
          // 如果用户确认，回调已经在showResetConfirmDialog中处理
          console.log('用户确认重置数据')
        } else {
          console.log('用户取消重置数据')
        }
        
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

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100vh;
  margin: 0;
}

/* 桌面端头部 */
.desktop-header {
  background-color: #409EFF;
  color: white;
  padding: 0 20px;
  display: flex;
  align-items: center;
  height: 60px;
}

.desktop-title {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
}

/* 手机端头部 */
.mobile-header {
  background-color: #409EFF;
  color: white;
  padding: 0 16px;
  height: 50px;
  display: flex;
  align-items: center;
}

.mobile-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.mobile-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mobile-title {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

/* 桌面端侧边栏 */
.desktop-aside {
  background-color: var(--theme-sidebar-bg, #f5f7fa);
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  position: relative;
  transition: var(--theme-transition, all 0.3s ease);
}

.sidebar-header {
  background-color: var(--theme-sidebar-header-bg, #409EFF);
  color: white;
  padding: 15px 20px;
  margin-bottom: 0;
  flex-shrink: 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  flex: 1;
  text-align: left;
}

.menu-container {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding-bottom: 220px; /* 增加预留空间以适应72px高度的按钮和120px的底部距离 */
}

.desktop-menu {
  border: none;
  background-color: transparent;
  padding: 20px;
  flex: 1;
}

/* 重置数据区域 */
.reset-section {
  position: absolute;
  bottom: 120px;
  left: 16px;
  right: 16px;
  padding: 0;
  z-index: 10;
}

.reset-button {
  width: 100%;
  height: 72px;
  margin: 0;
  font-size: 16px;
  border-radius: 6px;
}

.reset-button .el-icon {
  margin-right: 8px;
  font-size: 18px;
}

.reset-button span {
  font-size: 16px;
  font-weight: 500;
}

/* 手机端抽屉菜单 */
.mobile-menu {
  border: none;
  background-color: transparent;
}

/* 主内容区域 */
.main-content {
  padding: 16px;
  background-color: var(--theme-bg-tertiary, #fafafa);
  overflow-y: auto;
  transition: var(--theme-transition, all 0.3s ease);
}

/* 手机端底部导航 */
.mobile-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background-color: var(--theme-card-bg, white);
  border-top: 1px solid var(--theme-border-base, #e4e7ed);
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 1000;
  box-shadow: var(--theme-card-shadow, 0 -2px 8px rgba(0, 0, 0, 0.1));
  transition: var(--theme-transition, all 0.3s ease);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 0.3s;
  color: #909399;
  min-width: 60px;
  padding: 4px;
}

.nav-item.active {
  color: #409EFF;
}

.nav-item .el-icon {
  font-size: 20px;
  margin-bottom: 2px;
}

.nav-label {
  font-size: 12px;
  line-height: 1;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .main-content {
    padding: 12px;
    padding-bottom: 80px; /* 为底部导航留出空间 */
  }
  
  .el-container {
    height: calc(100vh - 50px);
  }
}

@media (min-width: 769px) {
  .mobile-header,
  .mobile-bottom-nav {
    display: none;
  }
  
  .el-container {
    height: calc(100vh - 60px);
  }
}

/* Element Plus 组件样式调整 */
.el-menu-item {
  margin-bottom: 12px;
  border-radius: 8px;
  height: 48px;
  line-height: 48px;
  font-size: 15px;
  padding: 0 20px;
  font-weight: 500;
}

.el-menu-item .el-icon {
  font-size: 18px;
  margin-right: 12px;
}

.el-menu-item:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.el-menu-item.is-active {
  background-color: #6b7280;
  color: white;
}

/* 重置数据按钮保持红色警告 */
.el-menu-item.reset-data {
  color: #f56c6c !important;
}

.el-menu-item.reset-data:hover {
  background-color: rgba(245, 108, 108, 0.1) !important;
  color: #f56c6c !important;
}

.el-menu-item.reset-data.is-active {
  background-color: #f56c6c !important;
  color: white !important;
}

.el-menu-item.is-active .el-icon {
  color: white;
}

.el-drawer__header {
  margin-bottom: 0;
  padding-bottom: 16px;
  border-bottom: 1px solid #e4e7ed;
}

/* 全局滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 手机端重置按钮样式 */
.mobile-reset {
  position: static;
  margin-top: 20px;
  padding: 0 16px;
}
</style>
