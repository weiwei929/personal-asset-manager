<template>
  <!-- 资金转换对话框 -->
  <div v-if="visible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
      <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          资金转换
        </h3>
        <button
          @click="handleClose"
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div class="p-6">
        <!-- 转换信息概览 -->
        <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm text-gray-600 dark:text-gray-400">当前净收入:</span>
            <span class="font-semibold text-gray-900 dark:text-white">¥{{ formatAmount(currentMonthFinance.netIncome || 0) }}</span>
          </div>
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm text-gray-600 dark:text-gray-400">已分配金额:</span>
            <span class="font-semibold text-gray-900 dark:text-white">¥{{ formatAmount((currentMonthFinance.getAllocatedAmount && currentMonthFinance.getAllocatedAmount()) || 0) }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600 dark:text-gray-400">可用金额:</span>
            <span class="font-semibold text-green-600 dark:text-green-400 text-lg">¥{{ formatAmount(availableAmount) }}</span>
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
              最大可转换: ¥{{ formatAmount(maxAmount) }}
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
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              {{ loading ? '转换中...' : '确认转换' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useFundTransferStore } from '../stores/fundTransfer.js'
import { useFinanceStore } from '../stores/finance.js'

export default {
  name: 'TransferDialog',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    currentMonth: {
      type: String,
      default: () => new Date().toISOString().slice(0, 7)
    }
  },
  emits: ['update:modelValue', 'success'],
  setup(props, { emit }) {
    const fundTransferStore = useFundTransferStore()
    const financeStore = useFinanceStore()
    
    const formRef = ref()
    const loading = ref(false)
    
    // 表单数据
    const form = ref({
      fromType: 'net-income',
      toType: '',
      amount: 0,
      description: '',
      date: new Date()
    })

    // 表单验证规则
    const rules = {
      fromType: [
        { required: true, message: '请选择来源资金类型', trigger: 'change' }
      ],
      toType: [
        { required: true, message: '请选择目标资金类型', trigger: 'change' }
      ],
      amount: [
        { required: true, message: '请输入转换金额', trigger: 'blur' },
        { type: 'number', min: 0.01, message: '转换金额必须大于0', trigger: 'blur' }
      ],
      date: [
        { required: true, message: '请选择转换日期', trigger: 'change' }
      ]
    }

    // 来源资金类型选项
    const fromTypeOptions = [
      { value: 'net-income', label: '月度净收入' },
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

    const currentMonthFinance = computed(() => {
      return financeStore.monthlyFinances.find(mf => mf.month === props.currentMonth) || 
        { income: 0, expense: 0, netIncome: 0, getAllocatedAmount: () => 0, getAvailableAmount: () => 0 }
    })

    const availableAmount = computed(() => {
      if (form.value.fromType === 'net-income') {
        const finance = financeStore.monthlyFinances.find(mf => mf.month === props.currentMonth)
        if (finance && typeof finance.getAvailableAmount === 'function') {
          return finance.getAvailableAmount()
        }
        // 回退计算方法：净收入 - 已分配金额
        const netIncome = finance?.netIncome || 0
        const allocated = (finance?.allocated_amounts && Object.values(finance.allocated_amounts).reduce((sum, amount) => sum + amount, 0)) || 0
        return Math.max(0, netIncome - allocated)
      }
      // 其他资金类型的可用金额需要单独计算，暂时返回0
      return 0
    })

    const maxAmount = computed(() => {
      return availableAmount.value
    })

    // 监听来源类型变化，重置目标类型
    watch(() => form.value.fromType, () => {
      form.value.toType = ''
      form.value.amount = 0
    })

    // 格式化金额显示
    const formatAmount = (amount) => {
      return new Intl.NumberFormat('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount || 0)
    }

    // 重置表单
    const resetForm = () => {
      form.value = {
        fromType: 'net-income',
        toType: '',
        amount: 0,
        description: '',
        date: new Date()
      }
      if (formRef.value) {
        formRef.value.clearValidate()
      }
    }

    // 处理关闭
    const handleClose = () => {
      resetForm()
      visible.value = false
    }

    // 处理提交
    const handleSubmit = async () => {
      if (!formRef.value) return

      try {
        // 表单验证
        await formRef.value.validate()
        
        // 金额验证
        if (form.value.amount > maxAmount.value) {
          ElMessage.error('转换金额超过可用余额')
          return
        }

        loading.value = true

        // 创建转换记录
        const transferData = {
          fromType: form.value.fromType,
          toType: form.value.toType,
          amount: form.value.amount,
          description: form.value.description,
          date: form.value.date
        }

        await fundTransferStore.addTransfer(transferData)

        ElMessage.success('资金转换成功')
        emit('success')
        handleClose()
      } catch (error) {
        ElMessage.error(error.message || '转换失败')
      } finally {
        loading.value = false
      }
    }

    return {
      formRef,
      loading,
      form,
      rules,
      visible,
      fromTypeOptions,
      toTypeOptions,
      currentMonthFinance,
      availableAmount,
      maxAmount,
      formatAmount,
      handleClose,
      handleSubmit
    }
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
