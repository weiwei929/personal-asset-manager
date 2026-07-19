<template>
  <div class="page-stack monthly-finance">
    <div>
      <p class="text-sm text-subtext-light dark:text-subtext-dark">
        {{ MonthlyFinance.formatMonth(selectedMonth) }} · 按月流量，净额进入资金池
      </p>
    </div>

    <div class="stat-strip" style="grid-template-columns: repeat(3, minmax(0, 1fr));">
      <div class="stat-cell">
        <p class="stat-cell-label">收入</p>
        <p class="stat-cell-value">¥{{ formatAmount(currentMonthFinance.income) }}</p>
      </div>
      <div class="stat-cell">
        <p class="stat-cell-label">支出</p>
        <p class="stat-cell-value">¥{{ formatAmount(currentMonthFinance.expense) }}</p>
      </div>
      <div class="stat-cell">
        <p class="stat-cell-label">净收入</p>
        <p
          class="stat-cell-value"
          :class="(currentMonthFinance.netIncome || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'"
        >
          ¥{{ formatAmount(currentMonthFinance.netIncome) }}
        </p>
      </div>
    </div>

    <p class="text-xs text-subtext-light dark:text-subtext-dark -mt-2">
      资金池 ¥{{ formatAmount(financeStore.cashPool) }}
      <span v-if="monthlyFinance"> · 本月净额 ¥{{ formatAmount(monthlyFinance.netIncome) }}</span>
    </p>

    <!-- 累积净收入显示（保留后续结构，样式弱化） -->
    <div class="rounded-xl border border-border-light dark:border-border-dark p-4">
      <div class="flex items-center">
        <div class="ml-0">
          <p class="text-sm font-medium text-text-light dark:text-text-dark">
            累积净收入: ¥{{ totalCumulativeNet.toLocaleString() }}
          </p>
        </div>
      </div>
    </div>

    <div class="panel p-5">
      <h3 class="text-sm font-medium text-text-light dark:text-text-dark mb-4">
        录入本月
      </h3>

      <form @submit.prevent="saveMonthlyFinance" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs text-subtext-light dark:text-subtext-dark mb-1.5">收入</label>
            <input
              v-model.number="financeForm.income"
              type="number"
              step="0.01"
              min="0"
              max="99999999.99"
              placeholder="0.00"
              class="w-full px-3 py-2 bg-transparent border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label class="block text-xs text-subtext-light dark:text-subtext-dark mb-1.5">支出</label>
            <input
              v-model.number="financeForm.expense"
              type="number"
              step="0.01"
              min="0"
              max="99999999.99"
              placeholder="0.00"
              class="w-full px-3 py-2 bg-transparent border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <button type="submit" :disabled="saving" class="btn-line-primary disabled:opacity-50">
            {{ saving ? '保存中…' : '保存' }}
          </button>
          <button type="button" class="btn-line" @click="resetForm">清空表单</button>
        </div>
      </form>
    </div>

    <div class="panel p-5">
      <h3 class="text-sm font-medium text-text-light dark:text-text-dark mb-4">历史</h3>

      <div class="overflow-x-auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>月份</th>
              <th>收入</th>
              <th>支出</th>
              <th>净收入</th>
              <th>累积</th>
              <th class="text-right">操作</th>
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
