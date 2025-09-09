<template>
  <el-dialog
    v-model="visible"
    title="资金转换"
    width="500px"
    :before-close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
      @submit.prevent="handleSubmit"
    >
      <!-- 转换信息概览 -->
      <div class="transfer-info">
        <div class="info-item">
          <span class="label">当前净收入:</span>
          <span class="value">¥{{ formatAmount(currentNetIncome) }}</span>
        </div>
        <div class="info-item">
          <span class="label">已分配金额:</span>
          <span class="value">¥{{ formatAmount(allocatedAmount) }}</span>
        </div>
        <div class="info-item">
          <span class="label">可用金额:</span>
          <span class="value available">¥{{ formatAmount(availableAmount) }}</span>
        </div>
      </div>

      <el-divider />

      <!-- 转换表单 -->
      <el-form-item label="来源资金" prop="fromType">
        <el-select v-model="form.fromType" placeholder="请选择来源资金类型" style="width: 100%">
          <el-option
            v-for="option in fromTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="目标资金" prop="toType">
        <el-select v-model="form.toType" placeholder="请选择目标资金类型" style="width: 100%">
          <el-option
            v-for="option in toTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="转换金额" prop="amount">
        <el-input-number
          v-model="form.amount"
          :min="0"
          :max="maxAmount"
          :precision="2"
          placeholder="请输入转换金额"
          style="width: 100%"
        />
        <div class="amount-hint">
          最大可转换: ¥{{ formatAmount(maxAmount) }}
        </div>
      </el-form-item>

      <el-form-item label="转换说明" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="请输入转换说明（可选）"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="转换日期" prop="date">
        <el-date-picker
          v-model="form.date"
          type="date"
          placeholder="选择转换日期"
          style="width: 100%"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button 
          type="primary" 
          :loading="loading"
          @click="handleSubmit"
        >
          确认转换
        </el-button>
      </div>
    </template>
  </el-dialog>
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
      { value: 'bank-deposit', label: '银行存款' },
      { value: 'stock', label: '股票投资' },
      { value: 'lent-money', label: '借出资金' }
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
        { income: 0, expense: 0, netIncome: 0 }
    })

    const currentNetIncome = computed(() => {
      return currentMonthFinance.value.income - currentMonthFinance.value.expense
    })

    const allocatedAmount = computed(() => {
      return fundTransferStore.getTotalTransferredByMonth(props.currentMonth)
    })

    const availableAmount = computed(() => {
      if (form.value.fromType === 'net-income') {
        return Math.max(0, currentNetIncome.value - allocatedAmount.value)
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
      currentNetIncome,
      allocatedAmount,
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
