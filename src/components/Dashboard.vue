<template>
  <div class="space-y-6">
    <!-- 现金流管理专区 - 压缩高度版本 -->
    <div class="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-4 text-white">
      <h2 class="text-lg font-semibold mb-3 flex items-center">
        <span class="mr-2">💰</span>
        现金流管理
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
        <!-- 当月净收入 -->
        <div class="bg-white/20 rounded-lg p-3">
          <p class="text-xs opacity-90">{{ currentMonthLabel }}</p>
          <p class="text-xl font-bold">¥{{ formatAmount(currentMonthNet) }}</p>
          <p class="text-xs opacity-75 mt-1">{{ getCurrentMonthStatus() }}</p>
        </div>
        
        <!-- 资金池累积 -->
        <div class="bg-white/20 rounded-lg p-3">
          <p class="text-xs opacity-90">资金池累积</p>
          <p class="text-xl font-bold">¥{{ formatAmount(cashPool) }}</p>
          <div class="w-full bg-white/30 rounded-full h-1.5 mt-1">
            <div class="bg-white rounded-full h-1.5 transition-all duration-300" 
                 :style="`width: ${Math.min((cashPool / 50000) * 100, 100)}%`"></div>
          </div>
          <p class="text-xs opacity-75 mt-1">转存进度 {{ Math.min(Math.round((cashPool / 50000) * 100), 100) }}%</p>
        </div>
        
        <!-- 转存状态 -->
        <div class="bg-white/20 rounded-lg p-3">
          <p class="text-xs opacity-90">转存状态</p>
          <div v-if="cashPool >= 50000" class="text-center">
            <p class="text-base font-bold text-green-300">✅ 可转存</p>
            <p class="text-xs opacity-75 mt-1">已达到5万元门槛</p>
          </div>
          <div v-else class="text-center">
            <p class="text-sm font-semibold">还需 ¥{{ formatAmount(50000 - cashPool) }}</p>
            <p class="text-xs opacity-75 mt-1">距离转存目标</p>
          </div>
        </div>
        
        <!-- 总资产 -->
        <div class="bg-white/20 rounded-lg p-3">
          <p class="text-xs opacity-90">总资产</p>
          <p class="text-xl font-bold">¥{{ formatAmount(totalAssetsCorrect) }}</p>
          <p class="text-xs opacity-75 mt-1">全部资产价值</p>
        </div>
      </div>
    </div>

    <!-- 资产分布 -->
    <div class="bg-card-light dark:bg-card-dark rounded-xl p-6 shadow-sm border border-border-light dark:border-border-dark">
      <h3 class="text-lg font-semibold text-text-light dark:text-text-dark mb-4 flex items-center">
        <span class="mr-2">📊</span>
        资产分布
      </h3>
      
      <div class="space-y-4">
        <!-- 资产项目列表 -->
        <div class="space-y-3">
          <!-- 现金池 -->
          <div class="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div class="flex items-center">
              <div class="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
              <span class="text-text-light dark:text-text-dark font-medium">现金池</span>
            </div>
            <div class="text-right">
              <div class="text-text-light dark:text-text-dark font-semibold">
                ¥{{ formatAmount(cashPool) }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ totalAssetsCorrect > 0 ? ((cashPool / totalAssetsCorrect) * 100).toFixed(1) : 0 }}%
              </div>
            </div>
          </div>

          <!-- 银行存款 -->
          <div class="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div class="flex items-center">
              <div class="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <span class="text-text-light dark:text-text-dark font-medium">银行存款</span>
            </div>
            <div class="text-right">
              <div class="text-text-light dark:text-text-dark font-semibold">
                ¥{{ formatAmount(totalDepositAmount) }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ totalAssetsCorrect > 0 ? ((totalDepositAmount / totalAssetsCorrect) * 100).toFixed(1) : 0 }}%
              </div>
            </div>
          </div>

          <!-- 股票投资 -->
          <div class="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div class="flex items-center">
              <div class="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
              <span class="text-text-light dark:text-text-dark font-medium">股票投资</span>
            </div>
            <div class="text-right">
              <div class="text-text-light dark:text-text-dark font-semibold">
                ¥{{ formatAmount(totalInvestmentAssets) }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ totalAssetsCorrect > 0 ? ((totalInvestmentAssets / totalAssetsCorrect) * 100).toFixed(1) : 0 }}%
              </div>
            </div>
          </div>

          <!-- 借出资金 -->
          <div class="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div class="flex items-center">
              <div class="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
              <span class="text-text-light dark:text-text-dark font-medium">借出资金</span>
            </div>
            <div class="text-right">
              <div class="text-text-light dark:text-text-dark font-semibold">
                ¥{{ formatAmount(pendingAmount) }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ totalAssetsCorrect > 0 ? ((pendingAmount / totalAssetsCorrect) * 100).toFixed(1) : 0 }}%
              </div>
            </div>
          </div>
        </div>

        <!-- 总资产汇总 -->
        <div class="border-t border-border-light dark:border-border-dark pt-3">
          <div class="flex items-center justify-between">
            <span class="text-text-light dark:text-text-dark font-semibold">总资产</span>
            <span class="text-text-light dark:text-text-dark font-bold text-xl">
              ¥{{ formatAmount(totalAssetsCorrect) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="bg-card-light dark:bg-card-dark rounded-xl p-6 shadow-sm border border-border-light dark:border-border-dark">
      <h3 class="text-lg font-semibold text-text-light dark:text-text-dark mb-4 flex items-center">
        <span class="mr-2">⚡</span>
        快捷操作
      </h3>
      
      <button
        @click="showTransferDialog = true"
        class="w-full px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center"
      >
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
        </svg>
        资金管理
      </button>
    </div>

    <!-- 资金到期提醒 -->
    <div class="bg-gradient-to-r from-orange-400 to-red-500 rounded-xl p-4 text-white">
      <h3 class="text-lg font-semibold mb-3 flex items-center">
        <span class="mr-2">⏰</span>
        资金到期提醒
      </h3>
      <div class="bg-white/20 rounded-lg p-3">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm opacity-90">即将到期资金</p>
            <p class="text-xl font-bold">¥0</p>
          </div>
          <div class="text-right">
            <p class="text-xs opacity-75">本月内到期</p>
            <p class="text-sm font-semibold">0 笔</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 资金转换对话框 -->
    <TransferDialog 
      v-model="showTransferDialog"
      @success="handleTransferSuccess"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { formatAmount } from '../utils/format.js'
import { useFinanceStore } from '../stores/finance'
import { useBankDepositStore } from '../stores/bankDeposit'
import { useStockInvestmentStore } from '../stores/stockInvestment'
import { useLentMoneyStore } from '../stores/lentMoney'
import { useFundTransferStore } from '../stores/fundTransfer'
import TransferDialog from './TransferDialog.vue'

// Store 实例
const financeStore = useFinanceStore()
const bankDepositStore = useBankDepositStore()
const stockStore = useStockInvestmentStore()
const lentMoneyStore = useLentMoneyStore()
const transferStore = useFundTransferStore()

// 响应式数据
const showTransferDialog = ref(false)

// 计算属性
const currentMonthNet = computed(() => {
  const monthData = financeStore.currentMonthNet
  return monthData.amount || 0
})

const currentMonthLabel = computed(() => financeStore.currentMonthLabel)
const cashPool = computed(() => financeStore.cashPool)
const totalDepositAmount = computed(() => bankDepositStore.totalDepositAmount)
const totalInvestmentAssets = computed(() => stockStore.totalInvestmentAssets)
const pendingAmount = computed(() => lentMoneyStore.pendingAmount)

// 修正后的总资产计算
const totalAssetsCorrect = computed(() => {
  return cashPool.value + totalDepositAmount.value + totalInvestmentAssets.value + pendingAmount.value
})

// 方法
const getCurrentMonthStatus = () => {
  const today = new Date()
  const dayOfMonth = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  
  if (dayOfMonth <= 10) return '月初'
  if (dayOfMonth >= daysInMonth - 5) return '月末'
  return '月中'
}

const handleTransferSuccess = () => {
  // 刷新所有相关数据
  financeStore.loadFromLocalStorage()
  bankDepositStore.loadFromLocalStorage()
  stockStore.loadFromLocalStorage()
  lentMoneyStore.loadFromLocalStorage()
}

// 生命周期
onMounted(() => {
  // 加载所有数据
  financeStore.loadFromLocalStorage()
  bankDepositStore.loadFromLocalStorage()
  stockStore.loadFromLocalStorage()
  lentMoneyStore.loadFromLocalStorage()
  transferStore.loadTransfers()
})
</script>
