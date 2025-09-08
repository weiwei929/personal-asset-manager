<template>
  <div id="app">
    <el-container style="height: 100vh">
      <!-- 手机端顶部导航栏 -->
      <el-header class="mobile-header" v-if="isMobile">
        <div class="mobile-header-content">
          <h1 class="mobile-title">资产管理</h1>
          <el-button type="primary" text @click="showMobileMenu = !showMobileMenu">
            <el-icon><Menu /></el-icon>
          </el-button>
        </div>
      </el-header>
      
      <!-- 桌面端顶部 -->
      <el-header class="desktop-header" v-else style="height: 60px; background: #409EFF; color: white; display: none;">
        <h1 class="desktop-title">个人资产管理系统</h1>
      </el-header>

      <el-container>
        <!-- 桌面端侧边栏 -->
        <el-aside v-if="!isMobile" width="200px" class="desktop-aside">
          <div class="sidebar-header">
            <h2>个人资产管理系统</h2>
          </div>
          <el-menu :default-active="activeMenu" @select="handleMenuSelect" class="desktop-menu">
            <el-menu-item index="dashboard">
              <el-icon><DataAnalysis /></el-icon>
              <span>概览面板</span>
            </el-menu-item>
            <el-menu-item index="monthly-finance">
              <el-icon><Money /></el-icon>
              <span>月度收支</span>
            </el-menu-item>
            <el-menu-item index="bank-deposits">
              <el-icon><Coin /></el-icon>
              <span>银行存款</span>
            </el-menu-item>
            <el-menu-item index="stock-investment">
              <el-icon><TrendCharts /></el-icon>
              <span>股票投资</span>
            </el-menu-item>
            <el-menu-item index="lent-money">
              <el-icon><DocumentAdd /></el-icon>
              <span>借出资金</span>
            </el-menu-item>
          </el-menu>
        </el-aside>

        <!-- 手机端抽屉菜单 -->
        <el-drawer v-model="showMobileMenu" direction="ltr" size="280px" v-if="isMobile">
          <template #header>
            <h3>菜单</h3>
          </template>
          <el-menu :default-active="activeMenu" @select="handleMobileMenuSelect" class="mobile-menu">
            <el-menu-item index="dashboard">
              <el-icon><DataAnalysis /></el-icon>
              <span>概览面板</span>
            </el-menu-item>
            <el-menu-item index="monthly-finance">
              <el-icon><Money /></el-icon>
              <span>月度收支</span>
            </el-menu-item>
            <el-menu-item index="bank-deposits">
              <el-icon><Coin /></el-icon>
              <span>银行存款</span>
            </el-menu-item>
            <el-menu-item index="stock-investment">
              <el-icon><TrendCharts /></el-icon>
              <span>股票投资</span>
            </el-menu-item>
            <el-menu-item index="lent-money">
              <el-icon><DocumentAdd /></el-icon>
              <span>借出资金</span>
            </el-menu-item>
          </el-menu>
        </el-drawer>

        <el-main class="main-content">
          <Dashboard v-if="activeMenu === 'dashboard'" @openDialog="handleOpenDialog" />
          <MonthlyFinance v-else-if="activeMenu === 'monthly-finance'" />
          <BankDepositList v-else-if="activeMenu === 'bank-deposits'" />
          <StockInvestment v-else-if="activeMenu === 'stock-investment'" />
          <LentMoney v-else-if="activeMenu === 'lent-money'" />
        </el-main>
      </el-container>

      <!-- 手机端底部导航 -->
      <div v-if="isMobile" class="mobile-bottom-nav">
        <div 
          v-for="item in menuItems" 
          :key="item.index"
          class="nav-item"
          :class="{ active: activeMenu === item.index }"
          @click="handleMenuSelect(item.index)"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span class="nav-label">{{ item.label }}</span>
        </div>
      </div>
    </el-container>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { DataAnalysis, Money, Coin, TrendCharts, DocumentAdd, Menu } from '@element-plus/icons-vue'

// 导入组件
import Dashboard from './components/Dashboard.vue'
import MonthlyFinance from './components/MonthlyFinance.vue'
import BankDepositList from './components/BankDepositList.vue'
import StockInvestment from './components/StockInvestment.vue'
import LentMoney from './components/LentMoney.vue'

export default {
  name: 'App',
  components: {
    Dashboard,
    MonthlyFinance,
    BankDepositList,
    StockInvestment,
    LentMoney,
    DataAnalysis,
    Money,
    Coin,
    TrendCharts,
    DocumentAdd,
    Menu
  },
  setup() {
    const activeMenu = ref('dashboard')
    const showMobileMenu = ref(false)
    const windowWidth = ref(window.innerWidth)

    // 判断是否为移动端
    const isMobile = computed(() => windowWidth.value < 768)

    // 菜单项配置
    const menuItems = [
      { index: 'dashboard', label: '概览', icon: 'DataAnalysis' },
      { index: 'monthly-finance', label: '收支', icon: 'Money' },
      { index: 'bank-deposits', label: '存款', icon: 'Coin' },
      { index: 'stock-investment', label: '股票', icon: 'TrendCharts' },
      { index: 'lent-money', label: '借贷', icon: 'DocumentAdd' }
    ]

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
      menuItems,
      handleMenuSelect,
      handleMobileMenuSelect,
      handleOpenDialog
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

.mobile-title {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

/* 桌面端侧边栏 */
.desktop-aside {
  background-color: #f5f7fa;
  padding: 0;
}

.sidebar-header {
  background-color: #409EFF;
  color: white;
  padding: 15px 20px;
  margin-bottom: 0;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
}

.desktop-menu {
  border: none;
  background-color: transparent;
  padding: 20px;
}

/* 手机端抽屉菜单 */
.mobile-menu {
  border: none;
  background-color: transparent;
}

/* 主内容区域 */
.main-content {
  padding: 16px;
  background-color: #fafafa;
  overflow-y: auto;
}

/* 手机端底部导航 */
.mobile-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background-color: white;
  border-top: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 1000;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
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
  margin-bottom: 4px;
  border-radius: 6px;
}

.el-menu-item:hover {
  background-color: #ecf5ff;
  color: #409EFF;
}

.el-menu-item.is-active {
  background-color: #409EFF;
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
</style>