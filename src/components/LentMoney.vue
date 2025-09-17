<template>
  <div class="lent-money">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h2 class="header-title">借出资金管理</h2>
      <div class="header-actions">
        <button class="btn btn-success" @click="showAddDialog = true">
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          新增借出
        </button>
        <button class="btn btn-danger" @click="clearAllRecords" v-if="lentRecords.length > 0">
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
          清空数据
        </button>
        </div>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-section">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-content">
            <div class="stat-icon total-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v6m0 6v6"/>
                <path d="m21 12-6-3-6 3-6-3"/>
              </svg>
            </div>
            <div class="stat-info">
              <div class="stat-value">¥{{ totalLentAmount.toLocaleString() }}</div>
              <div class="stat-label">总借出金额</div>
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-content">
            <div class="stat-icon pending-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
            </div>
            <div class="stat-info">
              <div class="stat-value">¥{{ pendingAmount.toLocaleString() }}</div>
              <div class="stat-label">待还款金额</div>
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-content">
            <div class="stat-icon returned-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
            </div>
            <div class="stat-info">
              <div class="stat-value">¥{{ returnedAmount.toLocaleString() }}</div>
              <div class="stat-label">已还款金额</div>
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-content">
            <div class="stat-icon maturing-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m21 16-4 4-4-4"/>
                <path d="M17 20V4"/>
                <path d="m3 8 4-4 4 4"/>
                <path d="M7 4v16"/>
              </svg>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ maturingRecords.length }}</div>
              <div class="stat-label">即将到期</div>
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-content">
            <div class="stat-icon overdue-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ overdueRecords.length }}</div>
              <div class="stat-label">逾期未还</div>
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-content">
            <div class="stat-icon count-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="8" y1="6" x2="21" y2="6"/>
                <line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/>
                <line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ lentRecords.length }}</div>
              <div class="stat-label">总记录数</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 到期提醒 -->
    <div v-if="maturingRecords.length > 0 || overdueRecords.length > 0">
      <div v-if="maturingRecords.length > 0" class="alert">
        <div class="alert-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m21 16-4 4-4-4"/>
            <path d="M17 20V4"/>
            <path d="m3 8 4-4 4 4"/>
            <path d="M7 4v16"/>
          </svg>
        </div>
        <div class="alert-content">
          <div class="alert-title">即将到期提醒</div>
          <div class="alert-message">有 {{ maturingRecords.length }} 笔借出资金将在30天内到期，请及时跟进</div>
        </div>
      </div>

      <div v-if="overdueRecords.length > 0" class="alert" style="background: #fee2e2; border-color: #ef4444;">
        <div class="alert-icon" style="color: #ef4444;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <div class="alert-content">
          <div class="alert-title" style="color: #dc2626;">逾期提醒</div>
          <div class="alert-message" style="color: #dc2626;">有 {{ overdueRecords.length }} 笔借出资金已逾期，请立即跟进</div>
        </div>
      </div>
    </div>

    <!-- 借出资金列表 -->
    <div v-if="lentRecords.length === 0" class="unified-empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v6m0 6v6"/>
          <path d="m21 12-6-3-6 3-6-3"/>
        </svg>
      </div>
      <h3 class="empty-title">暂无借出资金记录</h3>
      <p class="empty-description">开始添加您的第一笔借出记录</p>
      <button class="empty-action" @click="showAddDialog = true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        添加第一笔借出记录
      </button>
    </div>

    <div v-else class="table-container">
        <table class="custom-table">
          <thead>
            <tr>
              <th>借出人</th>
              <th>金额</th>
              <th>借出日期</th>
              <th>预计还款时间</th>
              <th>实际还款时间</th>
              <th>状态</th>
              <th>备注</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in recordsByDueDate" :key="record.id" class="table-row">
              <td>{{ record.borrower }}</td>
              <td class="amount-cell">¥{{ record.amount.toLocaleString() }}</td>
              <td>{{ formatDate(record.lendDate) }}</td>
              <td>{{ formatDate(record.expectedReturnDate) }}</td>
              <td>{{ record.actualReturnDate ? formatDate(record.actualReturnDate) : '-' }}</td>
              <td>
                <span class="status-tag" :class="getStatusClass(record.status)">
                  {{ record.getStatusText() }}
                </span>
              </td>
              <td class="notes-cell">{{ record.notes || '-' }}</td>
              <td class="actions-cell">
                <div class="action-buttons">
                  <button
                    v-if="record.status === 'pending'"
                    class="btn btn-sm btn-success"
                    @click="markAsReturned(record.id)"
                  >
                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20,6 9,17 4,12"/>
                    </svg>
                    标记已还
                  </button>
                  <button class="btn btn-sm btn-secondary" @click="editRecord(record)">
                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    编辑
                  </button>
                  <button class="btn btn-sm btn-danger" @click="deleteRecord(record.id)">
                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                    </svg>
                    删除
                  </button>
                </div>
               </td>
             </tr>
           </tbody>
         </table>
     </div>

    <!-- 新增/编辑借出资金对话框 -->
    <div v-if="showAddDialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-card-light dark:bg-card-dark rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-text-light dark:text-text-dark">
              {{ isEditing ? '编辑借出记录' : '新增借出记录' }}
            </h3>
            <button 
              @click="showAddDialog = false"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <form @submit.prevent="saveRecord" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                借出人 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="recordForm.borrower"
                type="text"
                placeholder="请输入借出人姓名"
                class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                资金数量 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="recordForm.amount"
                type="number"
                step="0.01"
                min="0.01"
                max="99999999.99"
                placeholder="请输入借出金额"
                class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                借出日期 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="recordForm.lendDate"
                type="date"
                class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                预计还款时间 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="recordForm.expectedReturnDate"
                type="date"
                class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                备注
              </label>
              <textarea
                v-model="recordForm.notes"
                placeholder="备注信息"
                rows="3"
                class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              ></textarea>
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <button
                type="button"
                @click="showAddDialog = false"
                class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                {{ isEditing ? '更新' : '保存' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useLentMoneyStore } from '../stores/lentMoney.js'

export default {
  name: 'LentMoney',
  setup() {
    const lentMoneyStore = useLentMoneyStore()
    const showAddDialog = ref(false)
    const isEditing = ref(false)
    const recordForm = ref({
      id: null,
      borrower: '',
      amount: null,
      lendDate: '',
      expectedReturnDate: '',
      notes: ''
    })

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
      // 简单的表单验证
      if (!recordForm.value.borrower || !recordForm.value.amount || !recordForm.value.lendDate || !recordForm.value.expectedReturnDate) {
        ElMessage.error('请填写所有必填字段')
        return
      }

      try {
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

    const getStatusClass = (status) => {
      switch (status) {
        case 'pending':
          return 'status-pending'
        case 'returned':
          return 'status-returned'
        default:
          return 'status-default'
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
      formatDate,
      getStatusClass,
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
  padding: 20px;
}

/* 页面头部样式 */
.page-header {
  background: var(--theme-card-bg, #1f2937);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--theme-border-light, #374151);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--theme-text-primary, #f9fafb);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

/* 统计卡片样式 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--theme-card-bg, #1f2937);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s;
  border: 1px solid var(--theme-border-light, #374151);
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-content {
  display: flex;
  align-items: center;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 20px;
}

.total-icon {
  background-color: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.pending-icon {
  background-color: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.returned-icon {
  background-color: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.maturing-icon {
  background-color: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.overdue-icon {
  background-color: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.count-icon {
  background-color: rgba(107, 114, 128, 0.2);
  color: #9ca3af;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--theme-text-primary, #f9fafb);
  margin: 0;
}

.stat-label {
  font-size: 14px;
  color: var(--theme-text-secondary, #d1d5db);
  margin: 4px 0 0 0;
}

/* 提醒样式 */
.alert {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.alert-icon {
  color: #fbbf24;
  font-size: 20px;
}

.alert-content {
  flex: 1;
}

.alert-title {
  font-weight: 600;
  color: var(--theme-text-primary, #f9fafb);
  margin: 0 0 4px 0;
}

.alert-message {
  color: var(--theme-text-secondary, #d1d5db);
  margin: 0;
}

/* 表格样式 */
.table-container {
  background: var(--theme-card-bg, #1f2937);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--theme-border-light, #374151);
}

.custom-table {
  width: 100%;
  border-collapse: collapse;
}

.custom-table th {
  background: #f8fafc;
  padding: 16px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

.custom-table td {
  padding: 16px;
  border-bottom: 1px solid #f3f4f6;
  color: #374151;
}

.custom-table tr:hover {
  background: #f9fafb;
}

.status-tag {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-pending {
  background: #fef3c7;
  color: #92400e;
}

.status-returned {
  background: #d1fae5;
  color: #065f46;
}

.status-default {
  background: #f3f4f6;
  color: #374151;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 6px;
}

.btn-success {
  background: #10b981;
  color: white;
}

.btn-success:hover {
  background: #059669;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover {
  background: #4b5563;
}



/* 对话框样式 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: var(--theme-card-bg, #1f2937);
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--theme-border-light, #374151);
}

.dialog-header {
  padding: 24px 24px 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--theme-text-primary, #f9fafb);
  margin: 0;
}

.dialog-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.dialog-close:hover {
  background: var(--theme-hover-bg, #374151);
}

.dialog-body {
  padding: 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.dialog-footer {
  padding: 0 24px 24px 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--theme-border-light, #374151);
  color: var(--theme-text-primary, #f9fafb);
}

.btn-outline:hover {
  background: var(--theme-hover-bg, #374151);
}

/* 按钮图标样式 */
.btn-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* 表单样式补充 */
.form-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.2s;
  resize: vertical;
  min-height: 80px;
}

.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* 表格单元格样式 */
.amount-cell {
  font-weight: 600;
  color: #059669;
}

.notes-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions-cell {
  white-space: nowrap;
}
</style>