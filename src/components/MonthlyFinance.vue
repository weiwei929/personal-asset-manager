<template>
  <div class="monthly-finance">
    <!-- 当前月份显示 -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
        {{ MonthlyFinance.formatMonth(selectedMonth) }}收支管理
      </h2>
      <p class="text-gray-600 dark:text-gray-400 mt-1">
        管理您的月度收入和支出数据，构建资金池
      </p>
    </div>
    
    <!-- 资金池提示 -->
    <div v-if="monthlyFinance" class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-blue-700 dark:text-blue-300">
            💡 本月净收入将自动加入资金池
          </p>
          <p class="text-xs text-blue-600 dark:text-blue-400 mt-1">
            净收入 = 收入 - 支出 = ¥{{ formatAmount(monthlyFinance.netIncome) }}
          </p>
        </div>
        <div class="text-right">
          <p class="text-sm font-semibold text-blue-700 dark:text-blue-300">
            当前资金池
          </p>
          <p class="text-lg font-bold text-blue-600">
            ¥{{ formatAmount(financeStore.cashPool) }}
          </p>
        </div>
      </div>
    </div>

    <!-- 月度统计卡片 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      <!-- 当月收入 -->
      <div class="bg-card-light dark:bg-card-dark rounded-xl p-4 sm:p-6 shadow-sm border border-border-light dark:border-border-dark">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
            </div>
          </div>
          <div class="ml-4 flex-1">
            <p class="text-sm font-medium text-subtext-light dark:text-subtext-dark">当月收入</p>
            <p class="text-xl sm:text-2xl font-bold text-text-light dark:text-text-dark">¥{{ currentMonthFinance.income.toLocaleString() }}</p>
          </div>
        </div>
      </div>

      <!-- 当月支出 -->
      <div class="bg-card-light dark:bg-card-dark rounded-xl p-4 sm:p-6 shadow-sm border border-border-light dark:border-border-dark">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
              </svg>
            </div>
          </div>
          <div class="ml-4 flex-1">
            <p class="text-sm font-medium text-subtext-light dark:text-subtext-dark">当月支出</p>
            <p class="text-xl sm:text-2xl font-bold text-text-light dark:text-text-dark">¥{{ currentMonthFinance.expense.toLocaleString() }}</p>
          </div>
        </div>
      </div>

      <!-- 月净收入 -->
      <div class="bg-card-light dark:bg-card-dark rounded-xl p-4 sm:p-6 shadow-sm border border-border-light dark:border-border-dark">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
              </svg>
            </div>
          </div>
          <div class="ml-4 flex-1">
            <p class="text-sm font-medium text-subtext-light dark:text-subtext-dark">月净收入</p>
            <p class="text-xl sm:text-2xl font-bold" :class="currentMonthFinance.netIncome >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
              ¥{{ currentMonthFinance.netIncome.toLocaleString() }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 累积净收入显示 -->
    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium text-blue-800 dark:text-blue-200">
            累积净收入: ¥{{ totalCumulativeNet.toLocaleString() }}
          </p>
        </div>
      </div>
    </div>

    <!-- 收入支出录入表单 -->
    <div class="bg-card-light dark:bg-card-dark rounded-xl p-4 sm:p-6 shadow-sm border border-border-light dark:border-border-dark">
      <h3 class="text-lg font-semibold text-text-light dark:text-text-dark mb-6">
        录入{{ MonthlyFinance.formatMonth(selectedMonth) }}收支
      </h3>

      <form @submit.prevent="saveMonthlyFinance" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              当月收入
            </label>
            <input
              v-model.number="financeForm.income"
              type="number"
              step="0.01"
              min="0"
              max="99999999.99"
              placeholder="请输入当月总收入"
              class="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              当月支出
            </label>
            <input
              v-model.number="financeForm.expense"
              type="number"
              step="0.01"
              min="0"
              max="99999999.99"
              placeholder="请输入当月总支出"
              class="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            :disabled="saving"
            class="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ saving ? '保存中...' : '保存月度收支' }}
          </button>
          <button
            type="button"
            @click="resetForm"
            class="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            重置
          </button>
        </div>
      </form>
    </div>

    <!-- 月度历史记录 -->
    <div class="bg-card-light dark:bg-card-dark rounded-xl p-4 sm:p-6 shadow-sm border border-border-light dark:border-border-dark">
      <h3 class="text-lg font-semibold text-text-light dark:text-text-dark mb-6">
        月度收支历史
      </h3>

      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border-light dark:border-border-dark">
              <th class="text-left py-3 px-4 text-sm font-medium text-text-light dark:text-text-dark">月份</th>
              <th class="text-left py-3 px-4 text-sm font-medium text-text-light dark:text-text-dark">收入</th>
              <th class="text-left py-3 px-4 text-sm font-medium text-text-light dark:text-text-dark">支出</th>
              <th class="text-left py-3 px-4 text-sm font-medium text-text-light dark:text-text-dark">净收入</th>
              <th class="text-left py-3 px-4 text-sm font-medium text-text-light dark:text-text-dark">累积净收入</th>
              <th class="text-left py-3 px-4 text-sm font-medium text-text-light dark:text-text-dark">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="(row, index) in monthlyFinancesByMonth" 
              :key="row.month"
              :class="index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-900'"
              class="border-b border-border-light dark:border-border-dark last:border-b-0"
            >
              <td class="py-3 px-4 text-sm text-text-light dark:text-text-dark">
                {{ MonthlyFinance.formatMonth(row.month) }}
              </td>
              <td class="py-3 px-4 text-sm text-text-light dark:text-text-dark">
                ¥{{ row.income.toLocaleString() }}
              </td>
              <td class="py-3 px-4 text-sm text-text-light dark:text-text-dark">
                ¥{{ row.expense.toLocaleString() }}
              </td>
              <td class="py-3 px-4 text-sm">
                <span :class="row.netIncome >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                  ¥{{ row.netIncome.toLocaleString() }}
                </span>
              </td>
              <td class="py-3 px-4 text-sm">
                <span :class="row.cumulativeNet >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                  ¥{{ row.cumulativeNet.toLocaleString() }}
                </span>
              </td>
              <td class="py-3 px-4">
                <button 
                  @click="editMonth(row)"
                  class="px-3 py-1 text-sm bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
                >
                  编辑
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useFinanceStore } from '../stores/finance.js'
import { formatAmount } from '../utils/format.js'
import MonthlyFinance from '@/models/MonthlyFinance'

const financeStore = useFinanceStore()

// 响应式数据
const selectedMonth = ref(MonthlyFinance.getCurrentMonth())
const financeForm = ref({
  income: 0,
  expense: 0
})
const saving = ref(false)

// 计算属性
const monthlyFinance = computed(() => {
  return financeStore.monthlyFinances.find(mf => mf.month === selectedMonth.value) || 
    new MonthlyFinance(selectedMonth.value, 0, 0)
})

const currentMonthFinance = computed(() => {
  const current = financeStore.monthlyFinances.find(mf => mf.month === selectedMonth.value)
  return current || { income: 0, expense: 0, netIncome: 0 }
})

const totalCumulativeNet = computed(() => financeStore.totalCumulativeNet)

const monthlyFinancesByMonth = computed(() => {
  const sorted = [...financeStore.monthlyFinances].sort((a, b) => b.month.localeCompare(a.month))
  return sorted.map((mf, index, arr) => {
    const cumulativeNet = arr.slice(index).reduce((sum, item) => sum + item.netIncome, 0)
    return {
      ...mf,
      cumulativeNet
    }
  })
})

// 方法
const saveMonthlyFinance = async () => {
  try {
    saving.value = true
    
    financeStore.updateMonthlyFinance(
      selectedMonth.value,
      financeForm.value.income || 0,
      financeForm.value.expense || 0
    )
    
    alert('月度收支保存成功')
  } catch (error) {
    alert('保存失败: ' + error.message)
  } finally {
    saving.value = false
  }
}

const resetForm = () => {
  financeForm.value = {
    income: 0,
    expense: 0
  }
}

const editMonth = (row) => {
  selectedMonth.value = row.month
  financeForm.value = {
    income: row.income,
    expense: row.expense
  }
}

// 生命周期
onMounted(() => {
  financeStore.loadFromLocalStorage()
  
  // 初始化表单数据
  const existing = financeStore.monthlyFinances.find(mf => mf.month === selectedMonth.value)
  if (existing) {
    financeForm.value = {
      income: existing.income,
      expense: existing.expense
    }
  }
})
</script>
