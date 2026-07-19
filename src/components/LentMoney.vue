<template>
  <div class="page-stack lent-money">
    <div class="page-toolbar">
      <button type="button" class="btn-line-primary" @click="showAddDialog = true">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14"/>
        </svg>
        新增
      </button>
      <button
        v-if="lentRecords.length > 0"
        type="button"
        class="btn-line-muted"
        @click="clearAllRecords"
      >
        清空
      </button>
    </div>

    <div class="stat-strip">
      <div class="stat-cell">
        <p class="stat-cell-label">借出合计</p>
        <p class="stat-cell-value">¥{{ totalLentAmount.toLocaleString() }}</p>
      </div>
      <div class="stat-cell">
        <p class="stat-cell-label">待还</p>
        <p class="stat-cell-value">¥{{ pendingAmount.toLocaleString() }}</p>
      </div>
      <div class="stat-cell">
        <p class="stat-cell-label">已还</p>
        <p class="stat-cell-value">¥{{ returnedAmount.toLocaleString() }}</p>
      </div>
      <div class="stat-cell">
        <p class="stat-cell-label">即将到期 / 逾期</p>
        <p class="stat-cell-value">{{ maturingRecords.length }} / {{ overdueRecords.length }}</p>
      </div>
    </div>

    <p
      v-if="maturingRecords.length > 0 || overdueRecords.length > 0"
      class="text-xs text-subtext-light dark:text-subtext-dark -mt-2"
    >
      <span v-if="overdueRecords.length">逾期 {{ overdueRecords.length }} 笔</span>
      <span v-if="overdueRecords.length && maturingRecords.length"> · </span>
      <span v-if="maturingRecords.length">30 天内到期 {{ maturingRecords.length }} 笔</span>
    </p>

    <div v-if="lentRecords.length === 0" class="panel">
      <div class="empty-panel">
        <svg class="w-10 h-10 text-subtext-light dark:text-subtext-dark opacity-40" fill="none" stroke="currentColor" stroke-width="1.25" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V6a2 2 0 00-4 0"/>
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 11V4a2 2 0 00-4 0v7"/>
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 11.5V8a2 2 0 00-4 0v6a6 6 0 006 6h2"/>
        </svg>
        <p class="empty-panel-title">暂无借出记录</p>
        <p class="empty-panel-desc">记录借给他人的款项与预计归还时间</p>
        <button type="button" class="btn-line mt-5" @click="showAddDialog = true">添加第一笔</button>
      </div>
    </div>

    <div v-else class="panel overflow-x-auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>借出人</th>
              <th>金额</th>
              <th>借出日</th>
              <th>预计归还</th>
              <th>实际归还</th>
              <th>状态</th>
              <th>备注</th>
              <th class="text-right">操作</th>
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
                    v-if="!record.isReturned"
                    @click="editRecord(record)"
                    class="px-3 py-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  >
                    编辑
                  </button>
                  
                  <!-- 新增收回按钮 -->
                  <button
                    v-if="!record.isReturned"
                    @click="showReturnDialog(record)"
                    class="px-3 py-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                  >
                    收回
                  </button>
                  
                  <button
                    @click="deleteRecord(record.id)"
                    class="px-3 py-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                  >
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
            <!-- 资金来源选择 -->
            <div v-if="!isEditing">
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                资金来源 <span class="text-red-500">*</span>
              </label>
              <div class="space-y-2">
                <label class="flex items-center">
                  <input
                    v-model="recordForm.fundSource"
                    type="radio"
                    value="cash_pool"
                    class="mr-2"
                  />
                  <span>资金池 (可用余额: ¥{{ formatAmount(availableCash) }})</span>
                </label>
                <label class="flex items-center">
                  <input
                    v-model="recordForm.fundSource"
                    type="radio"
                    value="external"
                    class="mr-2"
                  />
                  <span>外部资金</span>
                </label>
              </div>
            </div>

            <!-- 借款人 -->
            <div>
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                借款人 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="recordForm.borrower"
                type="text"
                placeholder="请输入借款人姓名"
                class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
            </div>

            <!-- 借出金额 -->
            <div>
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                借出金额 <span class="text-red-500">*</span>
              </label>
              <input
                v-model.number="recordForm.amount"
                type="number"
                step="0.01"
                :min="0"
                :max="recordForm.fundSource === 'cash_pool' ? availableCash : undefined"
                placeholder="请输入借出金额"
                class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
              <div v-if="recordForm.fundSource === 'cash_pool'" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                最大可用: ¥{{ formatAmount(availableCash) }}
              </div>
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

    <!-- 借款收回对话框 -->
    <div v-if="showReturnDialogFlag" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" tabindex="-1" @keydown.esc="closeReturnDialog">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4" role="dialog" aria-modal="true" aria-labelledby="returnDialogTitle">
        <h3 id="returnDialogTitle" class="text-lg font-semibold text-text-light dark:text-text-dark mb-4">
          借款收回
        </h3>
        
        <form @submit.prevent="processReturn" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              借款人
            </label>
            <input
              :value="selectedRecord?.borrower"
              readonly
              class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-gray-100 dark:bg-gray-700 text-text-light dark:text-text-dark"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              借出本金
            </label>
            <input
              :value="formatAmount(selectedRecord?.amount || 0)"
              readonly
              class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-gray-100 dark:bg-gray-700 text-text-light dark:text-text-dark"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              收回类型
            </label>
            <div class="space-y-2">
              <label class="flex items-center">
                <input
                  v-model="returnForm.returnType"
                  type="radio"
                  value="partial"
                  class="mr-2"
                />
                <span>部分收回</span>
              </label>
              <label class="flex items-center">
                <input
                  v-model="returnForm.returnType"
                  type="radio"
                  value="full"
                  class="mr-2"
                />
                <span>全部收回</span>
              </label>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              实际收回金额
            </label>
            <input
              v-model.number="returnForm.actualAmount"
              type="number"
              step="0.01"
              :min="0"
              :max="returnForm.returnType === 'full' ? undefined : selectedRecord?.amount"
              placeholder="请输入实际收回的金额"
              class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              required
            />
            <div v-if="returnForm.returnType === 'partial'" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              最大可收回: ¥{{ formatAmount(selectedRecord?.amount || 0) }}
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              利息收入
            </label>
            <input
              v-model.number="returnForm.interestIncome"
              type="number"
              step="0.01"
              :min="0"
              placeholder="利息收入（如有）"
              class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              收回日期
            </label>
            <input
              v-model="returnForm.returnDate"
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
              v-model="returnForm.notes"
              placeholder="收回说明（可选）"
              rows="3"
              class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            ></textarea>
          </div>

          <div class="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            <p class="text-sm text-green-700 dark:text-green-300">
              <strong>总收回金额：</strong>¥{{ formatAmount(totalReturnAmount) }}
            </p>
            <p class="text-xs text-green-600 dark:text-green-400 mt-1">
              本金 + 利息将转入资金池
            </p>
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <button
              type="button"
              @click="closeReturnDialog"
              class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              aria-label="关闭收回对话框"
            >
              取消
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              确认收回
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useLentMoneyStore } from '../stores/lentMoney.js'
import { useFinanceStore } from '../stores/finance.js'
import { useFundTransferStore } from '../stores/fundTransfer.js'
import { formatAmount } from '../utils/format.js'

export default {
  name: 'LentMoney',
  setup() {
    const lentMoneyStore = useLentMoneyStore()
    const financeStore = useFinanceStore()
    const fundTransferStore = useFundTransferStore()
    
    const showAddDialog = ref(false)
    const isEditing = ref(false)
    
    const recordForm = ref({
      id: null,
      borrower: '',
      amount: null,
      lendDate: '',
      expectedReturnDate: '',
      notes: '',
      fundSource: 'cash_pool' // 新增字段
    })

    // 计算属性
    const lentRecords = computed(() => lentMoneyStore.lentRecords)
    const recordsByDueDate = computed(() => lentMoneyStore.recordsByDueDate)
    const totalLentAmount = computed(() => lentMoneyStore.totalLentAmount)
    const pendingAmount = computed(() => lentMoneyStore.pendingAmount)
    const returnedAmount = computed(() => lentMoneyStore.returnedAmount)
    const maturingRecords = computed(() => lentMoneyStore.maturingRecords)
    const overdueRecords = computed(() => lentMoneyStore.overdueRecords)
    const availableCash = computed(() => financeStore.cashPool)

    const formatDate = (dateString) => {
      if (!dateString) return '-'
      const date = new Date(dateString)
      return date.toLocaleDateString('zh-CN')
    }

    // formatAmount 现统一从 src/utils/format.js 导入使用

    const saveRecord = async () => {
      try {
        // 验证资金来源
        if (!isEditing.value && recordForm.value.fundSource === 'cash_pool') {
          if (recordForm.value.amount > availableCash.value) {
            ElMessage.error('借出金额超过资金池可用余额')
            return
          }
        }

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
          // 创建借出记录
          const recordId = lentMoneyStore.addLentRecord(
            recordForm.value.borrower,
            recordForm.value.amount,
            recordForm.value.lendDate,
            recordForm.value.expectedReturnDate,
            recordForm.value.notes
          )

          // 如果使用资金池，执行资金转换
          if (recordForm.value.fundSource === 'cash_pool') {
            await fundTransferStore.performTransfer({
              fromType: 'cash_pool',
              toType: 'lent_money',
              amount: recordForm.value.amount,
              description: `借出资金给: ${recordForm.value.borrower}`,
              relatedRecordId: recordId
            })
          }

          ElMessage.success('借出记录添加成功')
        }

        showAddDialog.value = false
        resetForm()
      } catch (error) {
        console.error('表单验证失败:', error)
        ElMessage.error('保存失败，请重试')
      }
    }

    const editRecord = (record) => {
      recordForm.value = {
        id: record.id,
        borrower: record.borrower,
        amount: record.amount,
        lendDate: record.lendDate,
        expectedReturnDate: record.expectedReturnDate,
        notes: record.notes,
        fundSource: record.fundSource || 'cash_pool'
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
        notes: '',
        fundSource: 'cash_pool'
      }
      isEditing.value = false
    }

    onMounted(() => {
      lentMoneyStore.loadFromLocalStorage()
    })

    // 收回相关的响应式数据和方法
    const showReturnDialogFlag = ref(false)
    const selectedRecord = ref(null)
    const returnForm = ref({
      returnType: 'full',
      actualAmount: 0,
      interestIncome: 0,
      returnDate: new Date().toISOString().split('T')[0],
      notes: ''
    })

    // 计算总收回金额
    const totalReturnAmount = computed(() => {
      return (returnForm.value.actualAmount || 0) + (returnForm.value.interestIncome || 0)
    })

    // 显示收回对话框
    const showReturnDialog = (record) => {
      selectedRecord.value = record
      returnForm.value = {
        returnType: 'full',
        actualAmount: record.amount,
        interestIncome: 0,
        returnDate: new Date().toISOString().split('T')[0],
        notes: ''
      }
      showReturnDialogFlag.value = true
    }

    // 关闭收回对话框
    const closeReturnDialog = () => {
      showReturnDialogFlag.value = false
      selectedRecord.value = null
      returnForm.value = {
        returnType: 'full',
        actualAmount: 0,
        interestIncome: 0,
        returnDate: new Date().toISOString().split('T')[0],
        notes: ''
      }
    }

    // 处理借款收回
    const processReturn = async () => {
      try {
        if (!selectedRecord.value) return

        const record = selectedRecord.value
        const totalAmount = totalReturnAmount.value

        // 执行资金转换（借出资金收回转入资金池）
        await fundTransferStore.performTransfer({
          fromType: 'lent_money',
          toType: 'cash_pool',
          amount: totalAmount,
          description: `借款收回: ${record.borrower} (本金¥${returnForm.value.actualAmount.toLocaleString()}${returnForm.value.interestIncome > 0 ? ` + 利息¥${returnForm.value.interestIncome.toLocaleString()}` : ''})`,
          relatedRecordId: record.id,
          transferType: 'return'
        })

        if (returnForm.value.returnType === 'full') {
          // 全部收回，标记为已还款
          lentMoneyStore.markAsReturned(record.id, returnForm.value.returnDate)
          ElMessage.success(`借款全部收回成功，¥${totalAmount.toLocaleString()} 已转入资金池`)
        } else {
          // 部分收回，更新借出金额
          const remainingAmount = record.amount - returnForm.value.actualAmount
          lentMoneyStore.updateLentRecord(
            record.id,
            record.borrower,
            remainingAmount,
            record.lendDate,
            record.expectedReturnDate,
            record.notes + `\n部分收回: ¥${returnForm.value.actualAmount.toLocaleString()} (${returnForm.value.returnDate})`
          )
          ElMessage.success(`借款部分收回成功，¥${totalAmount.toLocaleString()} 已转入资金池`)
        }

        closeReturnDialog()
      } catch (error) {
        console.error('收回失败:', error)
        ElMessage.error('收回失败，请重试')
      }
    }

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
      formatAmount,
      getStatusClass,
      saveRecord,
      editRecord,
      markAsReturned,
      deleteRecord,
      clearAllRecords,
      resetForm,
      showReturnDialogFlag,
      selectedRecord,
      returnForm,
      totalReturnAmount,
      showReturnDialog,
      closeReturnDialog,
      processReturn,
      availableCash
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