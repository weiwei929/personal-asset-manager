<template>
  <!-- 资金转换对话框 -->
  <div v-if="visible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" tabindex="-1" @keydown.esc="handleClose">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="transferDialogTitle">
      <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 id="transferDialogTitle" class="text-lg font-semibold text-gray-900 dark:text-white">
          资金转换
        </h3>
        <button
          @click="handleClose"
          aria-label="关闭资金转换对话框"
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div class="p-6">
        <!-- 资金池状态概览 -->
        <div class="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg mb-6">
          <h4 class="font-semibold text-gray-900 dark:text-white mb-3">💰 资金池状态</h4>
          
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600 dark:text-gray-400">
                {{ financeStore.currentMonthLabel }}:
              </span>
              <span class="font-semibold text-gray-900 dark:text-white">
                ¥{{ formatAmount(financeStore.currentMonthNet.amount) }}
              </span>
            </div>
            
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600 dark:text-gray-400">历史累积:</span>
              <span class="font-semibold text-gray-900 dark:text-white">
                ¥{{ formatAmount(financeStore.totalCumulativeNet) }}
              </span>
            </div>
            
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600 dark:text-gray-400">已分配:</span>
              <span class="font-semibold text-gray-900 dark:text-white">
                ¥{{ formatAmount(financeStore.totalAllocatedAmount) }}
              </span>
            </div>
            
            <div class="border-t pt-2 mt-2">
              <div class="flex justify-between items-center">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">可用资金池:</span>
                <span class="font-bold text-green-600 dark:text-green-400 text-lg">
                  ¥{{ formatAmount(availableAmount) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              来源资金 <span class="text-red-500">*</span>
            </label>
            <select
              v-model="form.fromType"
              class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              required
            >
              <option value="">请选择来源资金类型</option>
              <option
                v-for="option in fromTypeOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              目标资金 <span class="text-red-500">*</span>
            </label>
            <select
              v-model="form.toType"
              class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              required
            >
              <option value="">请选择目标资金类型</option>
              <option
                v-for="option in toTypeOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              转换金额 <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.amount"
              type="number"
              step="0.01"
              :min="0"
              :max="maxAmount"
              placeholder="请输入转换金额"
              class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              required
            />
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              最大可转换: ¥{{ formatAmount(maxAmount) }} (来自资金池)
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              转换说明
            </label>
            <textarea
              v-model="form.description"
              placeholder="请输入转换说明（可选）"
              rows="3"
              maxlength="200"
              class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              转换日期 <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.date"
              type="date"
              class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              required
            />
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <button
              type="button"
              @click="handleClose"
              class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {{ loading ? '转换中...' : '确认转换' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useFundTransferStore } from '../stores/fundTransfer.js'
import { useFinanceStore } from '../stores/finance.js'
import { ElMessage } from 'element-plus'
import { formatAmount } from '../utils/format.js'

// Props 和 Emits
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  currentMonth: {
    type: String,
    default: () => new Date().toISOString().slice(0, 7)
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const fundTransferStore = useFundTransferStore()
const financeStore = useFinanceStore()
    
const loading = ref(false)
    
// 表单数据（类型值须与 FundTransfer / finance store 一致）
const form = ref({
  fromType: 'cash_pool',
  toType: '',
  amount: 0,
  description: '',
  date: new Date().toISOString().slice(0, 10)
})

// 来源资金类型选项
const fromTypeOptions = [
  { value: 'cash_pool', label: '资金池' },
  { value: 'bank_deposit', label: '银行存款' },
  { value: 'stock_investment', label: '股票投资' },
  { value: 'lent_money', label: '借出资金' }
]

// 目标资金类型选项（排除来源类型）
const toTypeOptions = computed(() => {
  return fromTypeOptions.filter(option => option.value !== form.value.fromType)
})

// 计算属性
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const availableAmount = computed(() => financeStore.cashPool)
const maxAmount = computed(() => availableAmount.value)

// 监听来源类型变化，重置目标类型
watch(() => form.value.fromType, () => {
  form.value.toType = ''
  form.value.amount = 0
})

// 统一使用 src/utils/format.js 的 formatAmount 工具
// 处理关闭
const handleClose = () => {
  visible.value = false
  resetForm()
}

// 重置表单（自定义表单，无 Element formRef）
const resetForm = () => {
  form.value = {
    fromType: 'cash_pool',
    toType: '',
    amount: 0,
    description: '',
    date: new Date().toISOString().slice(0, 10)
  }
}

// 处理提交
const handleSubmit = async () => {
  try {
    if (form.value.amount <= 0) {
      ElMessage.warning('请输入有效的转换金额')
      return
    }

    // 仅从资金池转出时校验资金池上限
    if (form.value.fromType === 'cash_pool' && form.value.amount > maxAmount.value) {
      ElMessage.warning('转换金额超过资金池可用余额')
      return
    }

    if (!form.value.fromType || !form.value.toType) {
      ElMessage.warning('请选择来源和目标资金类型')
      return
    }

    if (form.value.fromType === form.value.toType) {
      ElMessage.warning('来源与目标不能相同')
      return
    }

    loading.value = true

    const fromLabel = fromTypeOptions.find(o => o.value === form.value.fromType)?.label || form.value.fromType
    const toLabel = fromTypeOptions.find(o => o.value === form.value.toType)?.label || form.value.toType

    const result = await fundTransferStore.performTransfer({
      fromType: form.value.fromType,
      toType: form.value.toType,
      amount: form.value.amount,
      description: form.value.description || `手动转换: ${fromLabel} → ${toLabel}`,
      date: form.value.date
    })

    if (!result.success) {
      ElMessage.error(result.error || result.message || '转换失败')
      return
    }

    ElMessage.success('资金转换成功！')
    emit('success')
    handleClose()
  } catch (error) {
    ElMessage.error(error.message || '转换失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.transfer-info {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.label {
  color: #606266;
  font-size: 14px;
}

.value {
  font-weight: 600;
  color: #303133;
}

.value.available {
  color: #67C23A;
  font-size: 16px;
}

.amount-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.dialog-footer {
  text-align: right;
}

.el-divider {
  margin: 16px 0;
}
</style>
