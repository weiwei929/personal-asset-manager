<template>
  <div class="p-6 space-y-6">
    <!-- 顶部统计卡片 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6 mb-6 sm:mb-8">
      <!-- 月度收支统计 -->
      <div class="bg-card-light dark:bg-card-dark rounded-xl p-4 sm:p-6 shadow-sm border border-border-light dark:border-border-dark">
        <div class="flex items-center">
          <div class="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mr-3 sm:mr-4">
            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-lg sm:text-xl lg:text-2xl font-bold text-text-light dark:text-text-dark truncate">¥{{ currentMonthFinance.income.toLocaleString() }}</div>
            <div class="text-xs sm:text-sm text-gray-500 dark:text-gray-400">当月收入</div>
          </div>
        </div>
      </div>

      <div class="bg-card-light dark:bg-card-dark rounded-xl p-4 sm:p-6 shadow-sm border border-border-light dark:border-border-dark">
        <div class="flex items-center">
          <div class="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center mr-3 sm:mr-4">
            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 12H6"></path>
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-lg sm:text-xl lg:text-2xl font-bold text-text-light dark:text-text-dark truncate">¥{{ currentMonthFinance.expense.toLocaleString() }}</div>
            <div class="text-xs sm:text-sm text-gray-500 dark:text-gray-400">当月支出</div>
          </div>
        </div>
      </div>

      <div class="bg-card-light dark:bg-card-dark rounded-xl p-4 sm:p-6 shadow-sm border border-border-light dark:border-border-dark">
        <div class="flex items-center">
          <div class="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mr-3 sm:mr-4">
            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-lg sm:text-xl lg:text-2xl font-bold truncate" :class="currentMonthFinance.netIncome >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
              ¥{{ currentMonthFinance.netIncome.toLocaleString() }}
            </div>
            <div class="text-xs sm:text-sm text-gray-500 dark:text-gray-400">月净收入</div>
          </div>
        </div>
      </div>

      <!-- 资产统计 -->
      <div class="bg-card-light dark:bg-card-dark rounded-xl p-4 sm:p-6 shadow-sm border border-border-light dark:border-border-dark">
        <div class="flex items-center">
          <div class="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center mr-3 sm:mr-4">
            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-lg sm:text-xl lg:text-2xl font-bold text-text-light dark:text-text-dark truncate">¥{{ totalDepositAmount.toLocaleString() }}</div>
            <div class="text-xs sm:text-sm text-gray-500 dark:text-gray-400">银行存款</div>
          </div>
        </div>
      </div>

      <div class="bg-card-light dark:bg-card-dark rounded-xl p-4 sm:p-6 shadow-sm border border-border-light dark:border-border-dark">
        <div class="flex items-center">
          <div class="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mr-3 sm:mr-4">
            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-lg sm:text-xl lg:text-2xl font-bold text-text-light dark:text-text-dark truncate">¥{{ totalInvestmentAssets.toLocaleString() }}</div>
            <div class="text-xs sm:text-sm text-gray-500 dark:text-gray-400">股票投资</div>
          </div>
        </div>
      </div>

      <div class="bg-card-light dark:bg-card-dark rounded-xl p-4 sm:p-6 shadow-sm border border-border-light dark:border-border-dark">
        <div class="flex items-center">
          <div class="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center mr-3 sm:mr-4">
            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-lg sm:text-xl lg:text-2xl font-bold truncate" :class="totalAssets >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
              ¥{{ totalAssets.toLocaleString() }}
            </div>
            <div class="text-xs sm:text-sm text-gray-500 dark:text-gray-400">总资产</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 详细信息和图表区域 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      <div class="lg:col-span-2">
        <div class="bg-card-light dark:bg-card-dark rounded-xl p-4 sm:p-6 shadow-sm border border-border-light dark:border-border-dark">
          <div class="flex items-center justify-between mb-4 sm:mb-6">
            <h3 class="text-base sm:text-lg font-semibold text-text-light dark:text-text-dark">资产分布概览</h3>
            <div class="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              总资产: <span class="font-semibold" :class="totalAssets >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                ¥{{ totalAssets.toLocaleString() }}
              </span>
            </div>
          </div>
          
          <div class="space-y-4 sm:space-y-6">
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <div class="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <span class="text-sm font-medium text-text-light dark:text-text-dark">月度净收入</span>
              </div>
              <span class="text-sm font-semibold" :class="totalCumulativeNet >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                ¥{{ totalCumulativeNet.toLocaleString() }}
              </span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                class="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                :style="{ width: (totalAssets > 0 ? Math.abs(totalCumulativeNet / totalAssets * 100) : 0) + '%' }"
              ></div>
            </div>
            <div class="text-right text-xs text-gray-500 dark:text-gray-400">
              {{ totalAssets > 0 ? (totalCumulativeNet / totalAssets * 100).toFixed(1) : '0.0' }}%
            </div>

            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <div class="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                <span class="text-sm font-medium text-text-light dark:text-text-dark">银行存款</span>
              </div>
              <span class="text-sm font-semibold text-text-light dark:text-text-dark">¥{{ totalDepositAmount.toLocaleString() }}</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                class="bg-yellow-500 h-2 rounded-full transition-all duration-300" 
                :style="{ width: (totalAssets > 0 ? (totalDepositAmount / totalAssets * 100) : 0) + '%' }"
              ></div>
            </div>
            <div class="text-right text-xs text-gray-500 dark:text-gray-400">
              {{ totalAssets > 0 ? (totalDepositAmount / totalAssets * 100).toFixed(1) : '0.0' }}%
            </div>

            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <div class="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                <span class="text-sm font-medium text-text-light dark:text-text-dark">股票投资</span>
              </div>
              <span class="text-sm font-semibold text-text-light dark:text-text-dark">¥{{ totalInvestmentAssets.toLocaleString() }}</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                class="bg-purple-500 h-2 rounded-full transition-all duration-300" 
                :style="{ width: (totalAssets > 0 ? (totalInvestmentAssets / totalAssets * 100) : 0) + '%' }"
              ></div>
            </div>
            <div class="text-right text-xs text-gray-500 dark:text-gray-400">
              {{ totalAssets > 0 ? (totalInvestmentAssets / totalAssets * 100).toFixed(1) : '0.0' }}%
            </div>

            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <div class="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span class="text-sm font-medium text-text-light dark:text-text-dark">待还款资金</span>
              </div>
              <span class="text-sm font-semibold text-text-light dark:text-text-dark">¥{{ pendingAmount.toLocaleString() }}</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                class="bg-green-500 h-2 rounded-full transition-all duration-300" 
                :style="{ width: (totalAssets > 0 ? (pendingAmount / totalAssets * 100) : 0) + '%' }"
              ></div>
            </div>
            <div class="text-right text-xs text-gray-500 dark:text-gray-400">
              {{ totalAssets > 0 ? (pendingAmount / totalAssets * 100).toFixed(1) : '0.0' }}%
            </div>
          </div>
        </div>
      </div>

      <div class="lg:col-span-1">
        <div class="bg-card-light dark:bg-card-dark rounded-xl p-4 sm:p-6 shadow-sm border border-border-light dark:border-border-dark h-full flex flex-col">
          <h3 class="text-base sm:text-lg font-semibold text-text-light dark:text-text-dark mb-4 sm:mb-6">快捷操作</h3>
          
          <div class="space-y-4 sm:space-y-6 flex-1 flex flex-col justify-end pb-4">
            <button 
              @click="$emit('openDialog', 'monthlyFinance')" 
              class="w-full bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 text-white py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg hover:from-indigo-600 hover:to-purple-700 dark:hover:from-indigo-700 dark:hover:to-purple-800 transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg"
            >
              <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              <span class="text-sm sm:text-base">月度收支</span>
            </button>
            
            <button 
              @click="showTransferDialog = true" 
              class="w-full bg-orange-500 dark:bg-orange-600 text-white py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg hover:bg-opacity-90 transition-colors flex items-center justify-center space-x-2"
            >
              <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path>
              </svg>
              <span class="text-sm sm:text-base">资金管理</span>
            </button>
            
            <button 
              @click="$emit('openDialog', 'bankDeposit')" 
              class="w-full bg-green-500 dark:bg-green-600 text-white py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg hover:bg-opacity-90 transition-colors flex items-center justify-center space-x-2"
            >
              <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
              </svg>
              <span class="text-sm sm:text-base">新增存款</span>
            </button>
            
            <button 
              @click="$emit('openDialog', 'stockInvestment')" 
              class="w-full bg-blue-500 dark:bg-blue-600 text-white py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg hover:bg-opacity-90 transition-colors flex items-center justify-center space-x-2"
            >
              <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
              </svg>
              <span class="text-sm sm:text-base">股票投资</span>
            </button>
            
            <button 
              @click="$emit('openDialog', 'lentMoney')" 
              class="w-full bg-red-500 dark:bg-red-600 text-white py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg hover:bg-opacity-90 transition-colors flex items-center justify-center space-x-2"
            >
              <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
              </svg>
              <span class="text-sm sm:text-base">借贷记录</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 资金转换对话框 -->
    <TransferDialog 
      v-model="showTransferDialog"
      :current-month="currentMonth"
      @success="handleTransferSuccess"
    />
  </div>
</template>

<script>
import { computed, onMounted, ref } from 'vue'
import { useFinanceStore } from '../stores/finance.js'
import { useBankDepositStore } from '../stores/bankDeposit.js'
import { useStockInvestmentStore } from '../stores/stockInvestment.js'
import { useLentMoneyStore } from '../stores/lentMoney.js'
import { useFundTransferStore } from '../stores/fundTransfer.js'
import TransferDialog from './TransferDialog.vue'

export default {
  name: 'FinanceDashboard',
  components: {
    TransferDialog
  },
  setup() {
    const financeStore = useFinanceStore()
    const bankDepositStore = useBankDepositStore()
    const stockStore = useStockInvestmentStore()
    const lentMoneyStore = useLentMoneyStore()
    const fundTransferStore = useFundTransferStore()

    // 响应式数据
    const showTransferDialog = ref(false)
    const currentMonth = ref(new Date().toISOString().slice(0, 7))

    // 月度财务数据
    const currentMonthFinance = computed(() => financeStore.currentMonthFinance)
    const totalCumulativeNet = computed(() => financeStore.totalCumulativeNet)

    // 资产数据
    const totalDepositAmount = computed(() => bankDepositStore.totalDepositAmount)
    const totalInvestmentAssets = computed(() => stockStore.totalInvestmentAssets)
    const pendingAmount = computed(() => lentMoneyStore.pendingAmount)

    // 总资产 = 累积净收入 + 银行存款 + 股票投资 - 待还款资金
    const totalAssets = computed(() => {
      return totalCumulativeNet.value + totalDepositAmount.value + totalInvestmentAssets.value - pendingAmount.value
    })

    // 处理转换成功
    const handleTransferSuccess = () => {
      // 转换成功后可以刷新数据或显示提示
      console.log('资金转换成功')
    }

    onMounted(() => {
      financeStore.loadFromLocalStorage()
      bankDepositStore.loadFromLocalStorage()
      stockStore.loadFromLocalStorage()
      lentMoneyStore.loadFromLocalStorage()
      fundTransferStore.loadFromLocalStorage()
    })

    return {
      currentMonthFinance,
      totalCumulativeNet,
      totalDepositAmount,
      totalInvestmentAssets,
      pendingAmount,
      totalAssets,
      showTransferDialog,
      currentMonth,
      handleTransferSuccess
    }
  }
}
</script>

<style scoped>
.dashboard {
  padding: 0;
  background-color: var(--theme-bg-tertiary, #f5f7fa);
  min-height: calc(100vh - 120px);
  transition: var(--theme-transition, all 0.3s ease);
}

/* 统计卡片行 */
.stats-row {
  margin-bottom: 24px;
}

.stat-card {
  height: 100px;
  margin-bottom: 16px;
  border: none;
  border-radius: 12px;
  box-shadow: var(--theme-card-shadow, 0 2px 12px rgba(0, 0, 0, 0.08));
  transition: var(--theme-transition, all 0.3s ease);
  overflow: hidden;
  position: relative;
  background-color: var(--theme-card-bg, #ffffff);
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #6b7280 0%, #4b5563 100%);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

/* 不同类型卡片的主题色 */
.income-card::before {
  background: var(--gradient-income);
}

.expense-card::before {
  background: var(--gradient-expense);
}

.balance-card::before {
  background: var(--gradient-balance);
}

.deposit-card::before {
  background: var(--gradient-deposit);
}

.investment-card::before {
  background: var(--gradient-investment);
}

.total-card::before {
  background: var(--gradient-total);
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 16px 20px;
}

.stat-icon {
  width: 55px;
  height: 55px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.income-icon {
  background: var(--gradient-income);
  color: white;
  box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3);
}

.expense-icon {
  background: var(--gradient-expense);
  color: white;
  box-shadow: 0 4px 12px rgba(156, 163, 175, 0.3);
}

.balance-icon {
  background: var(--gradient-balance);
  color: white;
  box-shadow: 0 4px 12px rgba(55, 65, 81, 0.3);
}

.deposit-icon {
  background: var(--gradient-deposit);
  color: white;
  box-shadow: 0 4px 12px rgba(75, 85, 99, 0.3);
}

.stock-icon {
  background: var(--gradient-investment);
  color: white;
  box-shadow: 0 4px 12px rgba(209, 213, 219, 0.3);
}

.total-icon {
  background: var(--gradient-total);
  color: white;
  box-shadow: 0 4px 12px rgba(17, 24, 39, 0.3);
}

/* 暗黑主题下的图标优化 - 灰色系 */
.theme-dark .income-icon {
  box-shadow: 0 4px 12px rgba(107, 114, 128, 0.2);
}

.theme-dark .expense-icon {
  box-shadow: 0 4px 12px rgba(156, 163, 175, 0.2);
}

.theme-dark .balance-icon {
  box-shadow: 0 4px 12px rgba(55, 65, 81, 0.2);
}

.theme-dark .deposit-icon {
  box-shadow: 0 4px 12px rgba(75, 85, 99, 0.2);
}

.theme-dark .stock-icon {
  box-shadow: 0 4px 12px rgba(209, 213, 219, 0.2);
}

.theme-dark .total-icon {
  box-shadow: 0 4px 12px rgba(17, 24, 39, 0.2);
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--theme-text-primary, #303133);
  line-height: 1.2;
  margin-bottom: 4px;
  transition: var(--theme-transition, all 0.3s ease);
}

.stat-value.positive {
  color: var(--theme-text-primary, #303133);
}

.stat-value.negative {
  color: var(--theme-text-primary, #303133);
}

.stat-label {
  font-size: 14px;
  color: var(--theme-text-tertiary, #909399);
  font-weight: 500;
  transition: var(--theme-transition, all 0.3s ease);
}

/* 内容区域行 */
.content-row {
  margin-bottom: 24px;
}

/* 主卡片 */
.main-card {
  border: none;
  border-radius: 16px;
  box-shadow: var(--theme-card-shadow, 0 4px 20px rgba(0, 0, 0, 0.08));
  min-height: 400px;
  background-color: var(--theme-card-bg, #ffffff);
  transition: var(--theme-transition, all 0.3s ease);
}

.main-card .el-card__header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 16px 16px 0 0;
  padding: 20px 24px;
  border-bottom: none;
}

.asset-chart {
  padding: 24px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--theme-border-light, #f0f2f5);
  transition: var(--theme-transition, all 0.3s ease);
}

.chart-header h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--theme-text-primary, #303133);
  transition: var(--theme-transition, all 0.3s ease);
}

.total-display {
  font-size: 16px;
  font-weight: 600;
  color: var(--theme-text-secondary, #606266);
  transition: var(--theme-transition, all 0.3s ease);
}

.total-amount {
  font-size: 20px;
  font-weight: 700;
  margin-left: 8px;
}

.asset-item {
  margin-bottom: 20px;
  padding: 8px 0;
  transition: var(--theme-transition, all 0.3s ease);
}

.asset-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.asset-label {
  font-size: 15px;
  color: var(--theme-text-secondary, #606266);
  font-weight: 500;
  transition: var(--theme-transition, all 0.3s ease);
}

.asset-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--theme-text-primary, #303133);
  transition: var(--theme-transition, all 0.3s ease);
}

.asset-value.positive {
  color: var(--theme-text-primary, #303133);
}

.asset-value.negative {
  color: var(--theme-text-primary, #303133);
}

.asset-progress-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bg {
  flex: 1;
  height: 8px;
  background-color: var(--theme-border-light, #f0f2f5);
  border-radius: 4px;
  overflow: hidden;
  transition: var(--theme-transition, all 0.3s ease);
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.6s ease;
}

.progress-fill.net-income {
  background: var(--gradient-income);
}

.progress-fill.deposits {
  background: var(--gradient-deposit);
}

.progress-fill.investments {
  background: var(--gradient-investment);
}

.progress-fill.pending {
  background: var(--gradient-expense);
}

.percentage {
  font-size: 14px;
  font-weight: 600;
  color: var(--theme-text-secondary, #606266);
  min-width: 45px;
  text-align: right;
  transition: var(--theme-transition, all 0.3s ease);
}

/* 侧边卡片 */
.side-card {
  border: none;
  border-radius: 16px;
  box-shadow: var(--theme-card-shadow, 0 4px 20px rgba(0, 0, 0, 0.08));
  min-height: 400px;
  height: 100%;
  background-color: var(--theme-card-bg, #ffffff);
  transition: var(--theme-transition, all 0.3s ease);
}

.side-card .el-card__header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 16px 16px 0 0;
  padding: 20px 24px;
  border-bottom: none;
}

.side-card .el-card__body {
  padding: 24px;
  height: calc(100% - 70px);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.card-header {
  font-size: 18px;
  font-weight: 600;
}

/* 快捷操作 */
.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;
}

.quick-action-btn {
  height: 48px !important;
  border-radius: 12px !important;
  font-size: 15px !important;
  font-weight: 600 !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  border: none !important;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1) !important;
  width: 140px !important;
  min-width: 140px !important;
  max-width: 140px !important;
  position: relative !important;
  overflow: hidden !important;
  letter-spacing: 0.3px !important;
  margin: 0 !important;
  padding: 10px 16px !important;
  box-sizing: border-box !important;
  flex-shrink: 0 !important;
}

.quick-action-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.quick-action-btn:hover::before {
  left: 100%;
}

.quick-action-btn:hover {
  transform: translateY(-3px) scale(1.02) !important;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.18) !important;
}

.quick-action-btn:active {
  transform: translateY(-1px) scale(0.98) !important;
  transition: all 0.1s ease !important;
}

.quick-action-btn .el-icon {
  margin-right: 10px !important;
  font-size: 19px !important;
  transition: transform 0.3s ease !important;
}

.quick-action-btn:hover .el-icon {
  transform: scale(1.1) !important;
}

.quick-action-btn span {
  font-weight: 600 !important;
  position: relative !important;
  z-index: 1 !important;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .dashboard {
    padding: 0;
    background-color: var(--theme-bg-tertiary, #fafafa);
  }
  
  .stats-row {
    margin-bottom: 16px;
  }
  
  .stat-card {
    height: 80px;
    margin-bottom: 12px;
    border-radius: 8px;
  }
  
  .stat-content {
    padding: 12px 16px;
  }
  
  .stat-icon {
    width: 40px;
    height: 40px;
    margin-right: 12px;
    font-size: 18px;
    border-radius: 8px;
  }
  
  .stat-value {
    font-size: 16px;
  }
  
  .stat-label {
    font-size: 12px;
  }
  
  .content-row {
    margin-bottom: 16px;
  }
  
  .main-card,
  .side-card {
    border-radius: 12px;
    min-height: auto;
    margin-bottom: 16px;
  }
  
  .asset-chart {
    padding: 16px;
  }
  
  .chart-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 16px;
  }
  
  .chart-header h4 {
    font-size: 16px;
  }
  
  .total-display {
    font-size: 14px;
  }
  
  .total-amount {
    font-size: 16px;
  }
  
  .asset-item {
    margin-bottom: 16px;
  }
  
  .asset-label,
  .asset-value {
    font-size: 13px;
  }
  
  .progress-bg {
    height: 6px;
  }
  
  .percentage {
    font-size: 12px;
    min-width: 35px;
  }
  
  .reminders-section h4,
  .quick-actions-section h4 {
    font-size: 14px;
    margin-bottom: 12px;
  }
  
  .reminder-item {
    padding: 10px 12px;
    font-size: 13px;
    margin-bottom: 6px;
  }
  
  .action-buttons .el-button {
    height: 36px;
    font-size: 13px;
  }
}

/* 小屏幕手机适配 */
@media (max-width: 480px) {
  .stat-card {
    height: 70px;
  }
  
  .stat-content {
    padding: 10px 12px;
  }
  
  .stat-icon {
    width: 35px;
    height: 35px;
    margin-right: 10px;
    font-size: 16px;
  }
  
  .stat-value {
    font-size: 14px;
  }
  
  .stat-label {
    font-size: 11px;
  }
  
  .asset-chart {
    padding: 12px;
  }
}

/* 卡片间距调整 */
.el-row {
  margin-left: -10px !important;
  margin-right: -10px !important;
}

.el-col {
  padding-left: 10px !important;
  padding-right: 10px !important;
}

/* 桌面端布局优化 */
@media (min-width: 1200px) {
  .dashboard {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 20px;
  }
  
  .stats-row .el-col {
    margin-bottom: 0;
  }
  
  .stat-card {
    margin-bottom: 0;
  }
}
</style>