<template>
  <div id="app">
    <el-container style="height: 100vh">
      <el-header style="background-color: #409EFF; color: white; padding: 0 20px;">
        <h1 style="margin: 0; line-height: 60px;">个人资产管理系统</h1>
      </el-header>

      <el-container>
        <el-aside width="220px" style="background-color: #f5f7fa; padding: 20px;">
          <el-menu :default-active="activeMenu" @select="handleMenuSelect">
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

        <el-main style="padding: 20px;">
          <Dashboard v-if="activeMenu === 'dashboard'" />
          <MonthlyFinance v-else-if="activeMenu === 'monthly-finance'" />
          <BankDepositList v-else-if="activeMenu === 'bank-deposits'" />
          <StockInvestment v-else-if="activeMenu === 'stock-investment'" />
          <LentMoney v-else-if="activeMenu === 'lent-money'" />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script>
import { ref } from 'vue'
import { DataAnalysis, Money, Coin, TrendCharts, DocumentAdd } from '@element-plus/icons-vue'

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
    DocumentAdd
  },
  setup() {
    const activeMenu = ref('dashboard')

    const handleMenuSelect = (index) => {
      activeMenu.value = index
    }

    return {
      activeMenu,
      handleMenuSelect
    }
  }
}
</script>

<style>
#app {
  font-family: Arial, Helvetica, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100vh;
  margin: 0;
}
</style>