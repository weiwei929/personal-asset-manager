<template>
  <el-card class="bank-deposit-list">
    <template #header>
      <div class="card-header">
        <span>银行存款列表</span>
        <div class="header-actions">
          <el-button type="primary" size="small" @click="showImportDialog = true">
            导入CSV
          </el-button>
          <el-button type="success" size="small" @click="showAddDialog = true">
            新增存款
          </el-button>
          <el-button type="danger" size="small" @click="clearAllDeposits" v-if="deposits.length > 0">
            清空数据
          </el-button>
        </div>
      </div>
    </template>

    <!-- 统计信息 -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="24" :sm="12" :md="6">
          <el-statistic title="总存款金额" :value="totalDepositAmount" prefix="¥" />
        </el-col>
        <el-col :span="24" :sm="12" :md="6">
          <el-statistic title="预期利息收益" :value="totalExpectedInterest" prefix="¥" />
        </el-col>
        <el-col :span="24" :sm="12" :md="6">
          <el-statistic title="即将到期" :value="maturingDeposits.length" suffix="笔" />
        </el-col>
        <el-col :span="24" :sm="12" :md="6">
          <el-statistic title="已到期" :value="maturedDeposits.length" suffix="笔" />
        </el-col>
      </el-row>
    </div>

    <!-- 到期提醒 -->
    <el-alert
      v-if="maturingDeposits.length > 0"
      title="到期提醒"
      :description="`有 ${maturingDeposits.length} 笔存款将在30天内到期，请及时处理`"
      type="warning"
      show-icon
      :closable="false"
      style="margin: 20px 0;"
    />

    <!-- 操作面板 -->
    <div class="action-panel" v-if="deposits.length > 0">
      <el-row :gutter="20">
        <el-col :span="24" :sm="12" :md="6">
          <el-button type="primary" size="large" @click="showAddDialog = true" block>
            <el-icon><Plus /></el-icon>
            新增存款
          </el-button>
        </el-col>
        <el-col :span="24" :sm="12" :md="6">
          <el-button type="success" size="large" @click="showImportDialog = true" block>
            <el-icon><Upload /></el-icon>
            导入CSV
          </el-button>
        </el-col>
        <el-col :span="24" :sm="12" :md="6">
          <el-button type="info" size="large" @click="exportData" block>
            <el-icon><Download /></el-icon>
            导出数据
          </el-button>
        </el-col>
        <el-col :span="24" :sm="12" :md="6">
          <el-button type="warning" size="large" @click="clearAllDeposits" block>
            <el-icon><Delete /></el-icon>
            清空数据
          </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 存款列表 -->
    <div v-if="deposits.length === 0" class="empty-state">
      <el-empty description="暂无存款数据">
        <template #image>
          <el-button type="primary" @click="showAddDialog = true">添加第一笔存款</el-button>
        </template>
      </el-empty>
    </div>

    <div v-else class="table-container">
      <!-- 桌面端表格 -->
      <el-table :data="depositsByMaturity" style="width: 100%" stripe class="desktop-table">
        <el-table-column prop="productName" label="产品名称" width="150" />
        <el-table-column prop="maturityDate" label="到期时间" width="120">
          <template #default="scope">
            {{ formatDate(scope.row.maturityDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="存款金额" width="120">
          <template #default="scope">
            ¥{{ scope.row.amount.toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column prop="interestRate" label="利率" width="80">
          <template #default="scope">
            {{ scope.row.interestRate }}%
          </template>
        </el-table-column>
        <el-table-column prop="term" label="存期" width="80" />
        <el-table-column prop="maturityInterest" label="到期利息" width="120">
          <template #default="scope">
            ¥{{ scope.row.maturityInterest.toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="到期状态" width="120">
          <template #default="scope">
            <el-tag :color="scope.row.getStatusColor()">
              {{ scope.row.getMaturityStatus() }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="notes" label="备注" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="editDeposit(scope.row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteDeposit(scope.row.id)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 移动端卡片列表 -->
      <div class="mobile-cards">
        <div 
          v-for="deposit in depositsByMaturity" 
          :key="deposit.id" 
          class="deposit-card"
        >
          <div class="card-header-mobile">
            <h4 class="product-name">{{ deposit.productName }}</h4>
            <el-tag :color="deposit.getStatusColor()" size="small">
              {{ deposit.getMaturityStatus() }}
            </el-tag>
          </div>
          
          <div class="card-content">
            <div class="info-row">
              <span class="label">存款金额:</span>
              <span class="value amount">¥{{ deposit.amount.toLocaleString() }}</span>
            </div>
            <div class="info-row">
              <span class="label">利率:</span>
              <span class="value">{{ deposit.interestRate }}%</span>
            </div>
            <div class="info-row">
              <span class="label">存期:</span>
              <span class="value">{{ deposit.term }}</span>
            </div>
            <div class="info-row">
              <span class="label">到期时间:</span>
              <span class="value">{{ formatDate(deposit.maturityDate) }}</span>
            </div>
            <div class="info-row">
              <span class="label">到期利息:</span>
              <span class="value">¥{{ deposit.maturityInterest.toLocaleString() }}</span>
            </div>
            <div v-if="deposit.notes" class="info-row">
              <span class="label">备注:</span>
              <span class="value">{{ deposit.notes }}</span>
            </div>
          </div>
          
          <div class="card-actions">
            <el-button size="small" @click="editDeposit(deposit)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteDeposit(deposit.id)">
              删除
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- CSV导入对话框 -->
    <el-dialog v-model="showImportDialog" title="导入CSV文件" width="600px">
      <div class="import-section">
        <p>请选择包含银行存款数据的CSV文件：</p>
        <el-upload
          ref="uploadRef"
          :on-change="handleFileChange"
          :auto-upload="false"
          accept=".csv"
          :limit="1"
        >
          <el-button type="primary">选择文件</el-button>
        </el-upload>
        <div v-if="importResult" class="import-result">
          <el-alert
            :type="importResult.success ? 'success' : 'error'"
            :title="importResult.success ? '导入成功' : '导入失败'"
            :description="importResult.message"
            show-icon
          />
        </div>
      </div>
      <template #footer>
        <el-button @click="showImportDialog = false">取消</el-button>
        <el-button type="primary" @click="importCSV" :loading="importing">
          开始导入
        </el-button>
      </template>
    </el-dialog>

    <!-- 新增/编辑存款对话框 -->
    <el-dialog v-model="showAddDialog" :title="isEditing ? '编辑存款' : '新增存款'" width="600px">
      <el-form :model="depositForm" :rules="depositRules" ref="depositFormRef" label-width="100px">
        <el-form-item label="产品名称" prop="productName">
          <el-input v-model="depositForm.productName" placeholder="例如：长财40708" />
        </el-form-item>
        <el-form-item label="到期时间" prop="maturityDate">
          <el-date-picker
            v-model="depositForm.maturityDate"
            type="date"
            placeholder="选择到期日期"
            format="YYYY年MM月DD日"
            value-format="YYYY年MM月DD日"
          />
        </el-form-item>
        <el-form-item label="存款金额" prop="amount">
          <el-input-number
            v-model="depositForm.amount"
            :precision="2"
            :min="0.01"
            :max="99999999.99"
            controls-position="right"
            placeholder="请输入存款金额"
            style="width: 100%;"
          />
        </el-form-item>
        <el-form-item label="利率" prop="interestRate">
          <el-input-number
            v-model="depositForm.interestRate"
            :precision="2"
            :min="0"
            :max="10"
            controls-position="right"
            placeholder="例如：3.5"
            style="width: 100%;"
          />
        </el-form-item>
        <el-form-item label="存期" prop="term">
          <el-input v-model="depositForm.term" placeholder="例如：3年" />
        </el-form-item>
        <el-form-item label="到期利息" prop="maturityInterest">
          <el-input-number
            v-model="depositForm.maturityInterest"
            :precision="2"
            :min="0"
            controls-position="right"
            placeholder="自动计算或手动输入"
            style="width: 100%;"
          />
        </el-form-item>
        <el-form-item label="备注" prop="notes">
          <el-input
            v-model="depositForm.notes"
            type="textarea"
            placeholder="备注信息"
            :rows="3"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="saveDeposit">
          {{ isEditing ? '更新' : '保存' }}
        </el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Upload, Download, Delete } from '@element-plus/icons-vue'
import { useBankDepositStore } from '../stores/bankDeposit.js'

export default {
  name: 'BankDepositList',
  components: {
    Plus,
    Upload,
    Download,
    Delete
  },
  setup() {
    const bankDepositStore = useBankDepositStore()
    const showImportDialog = ref(false)
    const showAddDialog = ref(false)
    const isEditing = ref(false)
    const importing = ref(false)
    const importResult = ref(null)
    const selectedFile = ref(null)
    const uploadRef = ref(null)
    const depositFormRef = ref(null)

    const depositForm = ref({
      id: null,
      productName: '',
      maturityDate: '',
      amount: null,
      interestRate: null,
      term: '',
      maturityInterest: null,
      notes: ''
    })

    const depositRules = {
      productName: [{ required: true, message: '请输入产品名称', trigger: 'blur' }],
      maturityDate: [{ required: true, message: '请选择到期时间', trigger: 'change' }],
      amount: [{ required: true, message: '请输入存款金额', trigger: 'blur' }],
      interestRate: [{ required: true, message: '请输入利率', trigger: 'blur' }],
      term: [{ required: true, message: '请输入存期', trigger: 'blur' }]
    }

    // 计算属性
    const deposits = computed(() => bankDepositStore.deposits)
    const depositsByMaturity = computed(() => bankDepositStore.depositsByMaturity)
    const totalDepositAmount = computed(() => bankDepositStore.totalDepositAmount)
    const totalExpectedInterest = computed(() => bankDepositStore.totalExpectedInterest)
    const maturingDeposits = computed(() => bankDepositStore.maturingDeposits)
    const maturedDeposits = computed(() => bankDepositStore.maturedDeposits)

    const formatDate = (dateString) => {
      return dateString
    }

    const handleFileChange = (file) => {
      selectedFile.value = file
    }

    const importCSV = async () => {
      if (!selectedFile.value) {
        ElMessage.warning('请先选择CSV文件')
        return
      }

      importing.value = true
      try {
        const text = await selectedFile.value.raw.text()
        const result = bankDepositStore.importFromCSV(text)

        if (result.success) {
          importResult.value = {
            success: true,
            message: `成功导入 ${result.imported} 条存款记录`
          }
          ElMessage.success(`成功导入 ${result.imported} 条记录`)
          showImportDialog.value = false
        } else {
          importResult.value = {
            success: false,
            message: `导入失败: ${result.error}`
          }
          ElMessage.error(`导入失败: ${result.error}`)
        }
      } catch (error) {
        importResult.value = {
          success: false,
          message: `文件读取失败: ${error.message}`
        }
        ElMessage.error(`文件读取失败: ${error.message}`)
      } finally {
        importing.value = false
      }
    }

    const saveDeposit = async () => {
      if (!depositFormRef.value) return

      try {
        await depositFormRef.value.validate()

        if (isEditing.value) {
          bankDepositStore.updateDeposit(depositForm.value.id, depositForm.value)
          ElMessage.success('存款信息更新成功')
        } else {
          bankDepositStore.addDeposit(
            depositForm.value.productName,
            depositForm.value.maturityDate,
            depositForm.value.amount,
            depositForm.value.interestRate,
            depositForm.value.term,
            depositForm.value.maturityInterest || 0,
            depositForm.value.notes
          )
          ElMessage.success('存款添加成功')
        }

        showAddDialog.value = false
        resetForm()
      } catch (error) {
        console.error('表单验证失败:', error)
      }
    }

    const editDeposit = (deposit) => {
      depositForm.value = { ...deposit }
      isEditing.value = true
      showAddDialog.value = true
    }

    const deleteDeposit = async (id) => {
      try {
        await ElMessageBox.confirm('确定要删除这条存款记录吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })

        bankDepositStore.removeDeposit(id)
        ElMessage.success('存款记录删除成功')
      } catch {
        // 用户取消删除
      }
    }

    const exportData = () => {
      if (deposits.value.length === 0) {
        ElMessage.warning('没有数据可导出')
        return
      }

      // 创建CSV内容
      const headers = ['序号', '产品名称', '到期时间', '存款数量', '利率', '存期', '到期利息', '备注']
      const csvContent = [
        headers.join(','),
        ...deposits.value.map((deposit, index) => [
          index + 1,
          deposit.productName,
          deposit.maturityDate,
          `"¥${deposit.amount.toLocaleString()}"`,
          deposit.interestRate ? `${deposit.interestRate}%` : '',
          deposit.term,
          deposit.maturityInterest ? `"¥${deposit.maturityInterest.toLocaleString()}"` : '',
          deposit.notes || ''
        ].join(','))
      ].join('\n')

      // 创建下载链接
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `银行存款数据_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      ElMessage.success('数据导出成功')
    }

    const clearAllDeposits = async () => {
      try {
        await ElMessageBox.confirm('确定要清空所有存款记录吗？此操作不可恢复！', '警告', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })

        bankDepositStore.clearAllDeposits()
        ElMessage.success('所有存款记录已清空')
      } catch {
        // 用户取消操作
      }
    }

    const resetForm = () => {
      depositForm.value = {
        id: null,
        productName: '',
        maturityDate: '',
        amount: null,
        interestRate: null,
        term: '',
        maturityInterest: null,
        notes: ''
      }
      isEditing.value = false
      if (depositFormRef.value) {
        depositFormRef.value.clearValidate()
      }
    }

    onMounted(() => {
      bankDepositStore.loadFromLocalStorage()
    })

    return {
      deposits,
      depositsByMaturity,
      totalDepositAmount,
      totalExpectedInterest,
      maturingDeposits,
      maturedDeposits,
      showImportDialog,
      showAddDialog,
      isEditing,
      importing,
      importResult,
      selectedFile,
      uploadRef,
      depositForm,
      depositRules,
      depositFormRef,
      formatDate,
      handleFileChange,
      importCSV,
      saveDeposit,
      editDeposit,
      deleteDeposit,
      exportData,
      clearAllDeposits,
      resetForm
    }
  }
}
</script>

<style scoped>
.bank-deposit-list {
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
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
}

.import-section {
  text-align: center;
}

.import-result {
  margin-top: 20px;
}

.action-panel {
  margin-bottom: 20px;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.action-panel .el-button {
  height: 48px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.3s ease;
  margin-bottom: 8px;
}

.action-panel .el-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.action-panel .el-icon {
  margin-right: 8px;
  font-size: 16px;
}

/* 表格容器 */
.table-container {
  position: relative;
}

/* 桌面端表格 */
.desktop-table {
  display: block;
}

/* 移动端卡片列表 */
.mobile-cards {
  display: none;
}

.deposit-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #e4e7ed;
  transition: box-shadow 0.3s ease;
}

.deposit-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.card-header-mobile {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.product-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.card-content {
  margin-bottom: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #f5f7fa;
}

.info-row:last-child {
  border-bottom: none;
}

.info-row .label {
  color: #909399;
  font-size: 14px;
  font-weight: 500;
}

.info-row .value {
  color: #303133;
  font-size: 14px;
  font-weight: 600;
  text-align: right;
}

.info-row .value.amount {
  color: #67C23A;
  font-size: 16px;
}

.card-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-actions {
    flex-direction: column;
    gap: 6px;
  }
  
  .header-actions .el-button {
    width: 100%;
    font-size: 12px;
  }
  
  .stats-section {
    padding: 12px;
    margin-bottom: 16px;
  }
  
  .action-panel {
    padding: 12px;
    margin-bottom: 16px;
  }
  
  .action-panel .el-button {
    height: 40px;
    font-size: 13px;
    margin-bottom: 6px;
  }
  
  /* 隐藏桌面端表格，显示移动端卡片 */
  .desktop-table {
    display: none;
  }
  
  .mobile-cards {
    display: block;
  }
  
  .deposit-card {
    padding: 12px;
    margin-bottom: 12px;
  }
  
  .card-header-mobile {
    margin-bottom: 10px;
  }
  
  .product-name {
    font-size: 15px;
  }
  
  .info-row {
    padding: 4px 0;
  }
  
  .info-row .label,
  .info-row .value {
    font-size: 13px;
  }
  
  .info-row .value.amount {
    font-size: 14px;
  }
  
  .card-actions .el-button {
    height: 32px;
    font-size: 12px;
    padding: 4px 8px;
  }
}

@media (max-width: 480px) {
  .bank-deposit-list {
    margin: 0;
  }
  
  .stats-section {
    padding: 8px;
  }
  
  .action-panel {
    padding: 8px;
  }
  
  .action-panel .el-button {
    height: 36px;
    font-size: 12px;
  }
  
  .deposit-card {
    padding: 10px;
    border-radius: 8px;
  }
  
  .product-name {
    font-size: 14px;
  }
  
  .info-row .label,
  .info-row .value {
    font-size: 12px;
  }
  
  .info-row .value.amount {
    font-size: 13px;
  }
}

/* Element Plus 统计组件响应式调整 */
@media (max-width: 768px) {
  .el-statistic {
    text-align: center;
    margin-bottom: 16px;
  }
  
  .el-statistic__content {
    justify-content: center;
  }
}
</style>