<template>
  <el-card class="monthly-finance">
    <template #header>
      <div class="card-header">
        <span>月度收支管理</span>
        <el-select v-model="selectedMonth" @change="loadMonthData" style="width: 120px;">
          <el-option
            v-for="month in availableMonths"
            :key="month.value"
            :label="month.label"
            :value="month.value"
          />
        </el-select>
      </div>
    </template>

    <!-- 月度统计卡片 -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-card class="stat-card income-card">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><Plus /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">¥{{ currentMonthFinance.income.toLocaleString() }}</div>
                <div class="stat-label">当月收入</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="8">
          <el-card class="stat-card expense-card">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><Minus /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">¥{{ currentMonthFinance.expense.toLocaleString() }}</div>
                <div class="stat-label">当月支出</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="8">
          <el-card class="stat-card net-card">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><Money /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value" :class="currentMonthFinance.netIncome >= 0 ? 'positive' : 'negative'">
                  ¥{{ currentMonthFinance.netIncome.toLocaleString() }}
                </div>
                <div class="stat-label">月净收入</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 累积净收入显示 -->
    <el-alert
      :title="`累积净收入: ¥${totalCumulativeNet.toLocaleString()}`"
      type="info"
      show-icon
      :closable="false"
      style="margin: 20px 0;"
    />

    <!-- 收入支出录入表单 -->
    <el-card style="margin-top: 20px;">
      <template #header>
        <span>录入{{ MonthlyFinance.formatMonth(selectedMonth) }}收支</span>
      </template>

      <el-form :model="financeForm" :rules="financeRules" ref="financeFormRef" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="当月收入" prop="income">
              <el-input-number
                v-model="financeForm.income"
                :precision="2"
                :min="0"
                :max="99999999.99"
                controls-position="right"
                placeholder="请输入当月总收入"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="当月支出" prop="expense">
              <el-input-number
                v-model="financeForm.expense"
                :precision="2"
                :min="0"
                :max="99999999.99"
                controls-position="right"
                placeholder="请输入当月总支出"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item>
          <el-button type="primary" @click="saveMonthlyFinance" :loading="saving">
            保存月度收支
          </el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 月度历史记录 -->
    <el-card style="margin-top: 20px;">
      <template #header>
        <span>月度收支历史</span>
      </template>

      <el-table :data="monthlyFinancesByMonth" style="width: 100%" stripe>
        <el-table-column prop="month" label="月份" width="120">
          <template #default="scope">
            {{ MonthlyFinance.formatMonth(scope.row.month) }}
          </template>
        </el-table-column>

        <el-table-column prop="income" label="收入" width="120">
          <template #default="scope">
            ¥{{ scope.row.income.toLocaleString() }}
          </template>
        </el-table-column>

        <el-table-column prop="expense" label="支出" width="120">
          <template #default="scope">
            ¥{{ scope.row.expense.toLocaleString() }}
          </template>
        </el-table-column>

        <el-table-column prop="netIncome" label="净收入" width="120">
          <template #default="scope">
            <span :class="scope.row.netIncome >= 0 ? 'positive-text' : 'negative-text'">
              ¥{{ scope.row.netIncome.toLocaleString() }}
            </span>
          </template>
        </el-table-column>

        <el-table-column prop="cumulativeNet" label="累积净收入" width="140">
          <template #default="scope">
            <span :class="scope.row.cumulativeNet >= 0 ? 'positive-text' : 'negative-text'">
              ¥{{ scope.row.cumulativeNet.toLocaleString() }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="100">
          <template #default="scope">
            <el-button size="small" @click="editMonth(scope.row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </el-card>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Minus, Money } from '@element-plus/icons-vue'
import { useFinanceStore } from '../stores/finance.js'
import MonthlyFinance from '../models/MonthlyFinance.js'

export default {
  name: 'MonthlyFinance',
  components: {
    Plus,
    Minus,
    Money
  },
  setup() {
    const financeStore = useFinanceStore()
    const financeFormRef = ref(null)
    const saving = ref(false)

    const selectedMonth = ref(MonthlyFinance.getCurrentMonth())

    const financeForm = ref({
      income: 0,
      expense: 0
    })

    const financeRules = {
      income: [{ required: true, message: '请输入当月收入', trigger: 'blur' }],
      expense: [{ required: true, message: '请输入当月支出', trigger: 'blur' }]
    }

    // 计算属性
    const currentMonthFinance = computed(() => financeStore.currentMonthFinance)
    const monthlyFinancesByMonth = computed(() => financeStore.monthlyFinancesByMonth)
    const totalCumulativeNet = computed(() => financeStore.totalCumulativeNet)

    // 生成可用月份选项（最近12个月）
    const availableMonths = computed(() => {
      const months = []
      const current = new Date()

      for (let i = 0; i < 12; i++) {
        const date = new Date(current.getFullYear(), current.getMonth() - i, 1)
        const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        months.push({
          value: monthStr,
          label: MonthlyFinance.formatMonth(monthStr)
        })
      }

      return months
    })

    const loadMonthData = () => {
      const existingFinance = financeStore.monthlyFinances.find(mf => mf.month === selectedMonth.value)
      if (existingFinance) {
        financeForm.value = {
          income: existingFinance.income,
          expense: existingFinance.expense
        }
      } else {
        financeForm.value = {
          income: 0,
          expense: 0
        }
      }
    }

    const saveMonthlyFinance = async () => {
      if (!financeFormRef.value) return

      try {
        await financeFormRef.value.validate()
        saving.value = true

        financeStore.updateMonthlyFinance(
          selectedMonth.value,
          financeForm.value.income,
          financeForm.value.expense
        )

        ElMessage.success('月度收支保存成功')
      } catch (error) {
        console.error('表单验证失败:', error)
      } finally {
        saving.value = false
      }
    }

    const editMonth = (monthlyFinance) => {
      selectedMonth.value = monthlyFinance.month
      financeForm.value = {
        income: monthlyFinance.income,
        expense: monthlyFinance.expense
      }
    }

    const resetForm = () => {
      financeForm.value = {
        income: 0,
        expense: 0
      }
      financeFormRef.value?.clearValidate()
    }

    onMounted(() => {
      financeStore.loadFromLocalStorage()
      loadMonthData()
    })

    return {
      selectedMonth,
      financeForm,
      financeRules,
      financeFormRef,
      saving,
      currentMonthFinance,
      monthlyFinancesByMonth,
      totalCumulativeNet,
      availableMonths,
      loadMonthData,
      saveMonthlyFinance,
      editMonth,
      resetForm,
      MonthlyFinance
    }
  }
}
</script>

<style scoped>
.monthly-finance {
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stats-section {
  margin-bottom: 20px;
}

.stat-card {
  height: 100px;
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 20px;
}

.income-card .stat-icon {
  background-color: #f0f9ff;
  color: #67C23A;
}

.expense-card .stat-icon {
  background-color: #fef0f0;
  color: #F56C6C;
}

.net-card .stat-icon {
  background-color: #f5f7fa;
  color: #409EFF;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.stat-value.positive {
  color: #67C23A;
}

.stat-value.negative {
  color: #F56C6C;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.positive-text {
  color: #67C23A;
  font-weight: bold;
}

.negative-text {
  color: #F56C6C;
  font-weight: bold;
}
</style>