<template>
  <el-card class="lent-money">
    <template #header>
      <div class="card-header">
        <span>借出资金管理</span>
        <div class="header-actions">
          <el-button type="success" size="small" @click="showAddDialog = true">
            新增借出
          </el-button>
          <el-button type="danger" size="small" @click="clearAllRecords" v-if="lentRecords.length > 0">
            清空数据
          </el-button>
        </div>
      </div>
    </template>

    <!-- 统计信息 -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="4">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon total-icon">
                <el-icon><Coin /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">¥{{ totalLentAmount.toLocaleString() }}</div>
                <div class="stat-label">总借出金额</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="4">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon pending-icon">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">¥{{ pendingAmount.toLocaleString() }}</div>
                <div class="stat-label">待还款金额</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="4">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon returned-icon">
                <el-icon><Check /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">¥{{ returnedAmount.toLocaleString() }}</div>
                <div class="stat-label">已还款金额</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="4">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon maturing-icon">
                <el-icon><Warning /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ maturingRecords.length }}</div>
                <div class="stat-label">即将到期</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="4">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon overdue-icon">
                <el-icon><Close /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ overdueRecords.length }}</div>
                <div class="stat-label">逾期未还</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="4">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon count-icon">
                <el-icon><List /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ lentRecords.length }}</div>
                <div class="stat-label">总记录数</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 到期提醒 -->
    <div v-if="maturingRecords.length > 0 || overdueRecords.length > 0">
      <el-alert
        v-if="maturingRecords.length > 0"
        title="即将到期提醒"
        :description="`有 ${maturingRecords.length} 笔借出资金将在30天内到期，请及时跟进`"
        type="warning"
        show-icon
        :closable="false"
        style="margin-bottom: 10px;"
      />

      <el-alert
        v-if="overdueRecords.length > 0"
        title="逾期提醒"
        :description="`有 ${overdueRecords.length} 笔借出资金已逾期，请立即跟进`"
        type="error"
        show-icon
        :closable="false"
      />
    </div>

    <!-- 借出资金列表 -->
    <div v-if="lentRecords.length === 0" class="empty-state">
      <el-empty description="暂无借出资金记录">
        <template #image>
          <el-button type="primary" @click="showAddDialog = true">添加第一笔借出记录</el-button>
        </template>
      </el-empty>
    </div>

    <div v-else>
      <el-table :data="recordsByDueDate" style="width: 100%" stripe>
        <el-table-column prop="borrower" label="借出人" width="120" />
        <el-table-column prop="amount" label="金额" width="120">
          <template #default="scope">
            ¥{{ scope.row.amount.toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column prop="lendDate" label="借出日期" width="120">
          <template #default="scope">
            {{ formatDate(scope.row.lendDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="expectedReturnDate" label="预计还款时间" width="140">
          <template #default="scope">
            {{ formatDate(scope.row.expectedReturnDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="actualReturnDate" label="实际还款时间" width="140">
          <template #default="scope">
            {{ scope.row.actualReturnDate ? formatDate(scope.row.actualReturnDate) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="scope">
            <el-tag :color="scope.row.getStatusColor()">
              {{ scope.row.getStatusText() }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="notes" label="备注" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button
              v-if="scope.row.status === 'pending'"
              size="small"
              type="success"
              @click="markAsReturned(scope.row.id)"
            >
              标记已还
            </el-button>
            <el-button size="small" @click="editRecord(scope.row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteRecord(scope.row.id)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 新增/编辑借出资金对话框 -->
    <el-dialog :v-model="showAddDialog" :title="isEditing ? '编辑借出记录' : '新增借出记录'" width="600px">
      <el-form :model="recordForm" :rules="recordRules" ref="recordFormRef" label-width="120px">
        <el-form-item label="借出人" prop="borrower">
          <el-input v-model="recordForm.borrower" placeholder="请输入借出人姓名" />
        </el-form-item>

        <el-form-item label="资金数量" prop="amount">
          <el-input-number
            v-model="recordForm.amount"
            :precision="2"
            :min="0.01"
            :max="99999999.99"
            controls-position="right"
            placeholder="请输入借出金额"
            style="width: 100%;"
          />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="借出日期" prop="lendDate">
              <el-date-picker
                v-model="recordForm.lendDate"
                type="date"
                placeholder="选择借出日期"
                format="YYYY年MM月DD日"
                value-format="YYYY-MM-DD"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="预计还款时间" prop="expectedReturnDate">
              <el-date-picker
                v-model="recordForm.expectedReturnDate"
                type="date"
                placeholder="选择预计还款日期"
                format="YYYY年MM月DD日"
                value-format="YYYY-MM-DD"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="备注" prop="notes">
          <el-input
            v-model="recordForm.notes"
            type="textarea"
            placeholder="备注信息"
            :rows="3"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="saveRecord">
          {{ isEditing ? '更新' : '保存' }}
        </el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Coin, Clock, Check, Warning, Close, List } from '@element-plus/icons-vue'
import { useLentMoneyStore } from '../stores/lentMoney.js'

export default {
  name: 'LentMoney',
  components: {
    Coin,
    Clock,
    Check,
    Warning,
    Close,
    List
  },
  setup() {
    const lentMoneyStore = useLentMoneyStore()
    const showAddDialog = ref(false)
    const isEditing = ref(false)
    const recordFormRef = ref(null)

    const recordForm = ref({
      id: null,
      borrower: '',
      amount: null,
      lendDate: '',
      expectedReturnDate: '',
      notes: ''
    })

    const recordRules = {
      borrower: [{ required: true, message: '请输入借出人姓名', trigger: 'blur' }],
      amount: [{ required: true, message: '请输入借出金额', trigger: 'blur' }],
      lendDate: [{ required: true, message: '请选择借出日期', trigger: 'change' }],
      expectedReturnDate: [{ required: true, message: '请选择预计还款时间', trigger: 'change' }]
    }

    // 计算属性
    const lentRecords = computed(() => lentMoneyStore.lentRecords)
    const recordsByDueDate = computed(() => lentMoneyStore.recordsByDueDate)
    const totalLentAmount = computed(() => lentMoneyStore.totalLentAmount)
    const pendingAmount = computed(() => lentMoneyStore.pendingAmount)
    const returnedAmount = computed(() => lentMoneyStore.returnedAmount)
    const maturingRecords = computed(() => lentMoneyStore.maturingRecords)
    const overdueRecords = computed(() => lentMoneyStore.overdueRecords)

    const formatDate = (dateString) => {
      if (!dateString) return '-'
      const date = new Date(dateString)
      return date.toLocaleDateString('zh-CN')
    }

    const saveRecord = async () => {
      if (!recordFormRef.value) return

      try {
        await recordFormRef.value.validate()

        if (isEditing.value) {
          lentMoneyStore.updateLentRecord(
            recordForm.value.id,
            recordForm.value.borrower,
            recordForm.value.amount,
            recordForm.value.lendDate,
            recordForm.value.expectedReturnDate,
            recordForm.value.notes
          )
          ElMessage.success('借出记录更新成功')
        } else {
          lentMoneyStore.addLentRecord(
            recordForm.value.borrower,
            recordForm.value.amount,
            recordForm.value.lendDate,
            recordForm.value.expectedReturnDate,
            recordForm.value.notes
          )
          ElMessage.success('借出记录添加成功')
        }

        showAddDialog.value = false
        resetForm()
      } catch (error) {
        console.error('表单验证失败:', error)
      }
    }

    const editRecord = (record) => {
      recordForm.value = {
        id: record.id,
        borrower: record.borrower,
        amount: record.amount,
        lendDate: record.lendDate,
        expectedReturnDate: record.expectedReturnDate,
        notes: record.notes
      }
      isEditing.value = true
      showAddDialog.value = true
    }

    const markAsReturned = async (id) => {
      try {
        await ElMessageBox.confirm('确认标记为已还款吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })

        lentMoneyStore.markAsReturned(id)
        ElMessage.success('已标记为已还款')
      } catch {
        // 用户取消操作
      }
    }

    const deleteRecord = async (id) => {
      try {
        await ElMessageBox.confirm('确定要删除这条借出记录吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })

        lentMoneyStore.removeLentRecord(id)
        ElMessage.success('借出记录删除成功')
      } catch {
        // 用户取消删除
      }
    }

    const clearAllRecords = async () => {
      try {
        await ElMessageBox.confirm('确定要清空所有借出资金记录吗？此操作不可恢复！', '警告', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })

        lentMoneyStore.clearAllRecords()
        ElMessage.success('所有借出资金记录已清空')
      } catch {
        // 用户取消操作
      }
    }

    const resetForm = () => {
      recordForm.value = {
        id: null,
        borrower: '',
        amount: null,
        lendDate: '',
        expectedReturnDate: '',
        notes: ''
      }
      isEditing.value = false
      if (recordFormRef.value) {
        recordFormRef.value.clearValidate()
      }
    }

    onMounted(() => {
      lentMoneyStore.loadFromLocalStorage()
    })

    return {
      lentRecords,
      recordsByDueDate,
      totalLentAmount,
      pendingAmount,
      returnedAmount,
      maturingRecords,
      overdueRecords,
      showAddDialog,
      isEditing,
      recordForm,
      recordRules,
      recordFormRef,
      formatDate,
      saveRecord,
      editRecord,
      markAsReturned,
      deleteRecord,
      clearAllRecords,
      resetForm
    }
  }
}
</script>

<style scoped>
.lent-money {
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
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

.total-icon {
  background-color: #f0f9ff;
  color: #409EFF;
}

.pending-icon {
  background-color: #fdf6ec;
  color: #E6A23C;
}

.returned-icon {
  background-color: #f0f9ff;
  color: #67C23A;
}

.maturing-icon {
  background-color: #fdf6ec;
  color: #E6A23C;
}

.overdue-icon {
  background-color: #fef0f0;
  color: #F56C6C;
}

.count-icon {
  background-color: #f5f7fa;
  color: #909399;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 20px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
}
</style>