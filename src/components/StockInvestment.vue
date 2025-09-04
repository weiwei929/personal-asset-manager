<template>
  <el-card class="stock-investment">
    <template #header>
      <div class="card-header">
        <span>股票投资管理</span>
        <div class="header-actions">
          <el-button type="success" size="small" @click="showAddDialog = true">
            新增股票
          </el-button>
          <el-button type="danger" size="small" @click="clearAllStocks" v-if="stocks.length > 0">
            清空数据
          </el-button>
        </div>
      </div>
    </template>

    <!-- 投资统计卡片 -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon market-icon">
                <el-icon><TrendCharts /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">¥{{ totalMarketValue.toLocaleString() }}</div>
                <div class="stat-label">总市值</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon balance-icon">
                <el-icon><Money /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">¥{{ totalAccountBalance.toLocaleString() }}</div>
                <div class="stat-label">账户余额</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon total-icon">
                <el-icon><Coin /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">¥{{ totalInvestmentAssets.toLocaleString() }}</div>
                <div class="stat-label">总投资资产</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon count-icon">
                <el-icon><List /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stockCount }}</div>
                <div class="stat-label">股票数量</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 股票列表 -->
    <div v-if="stocks.length === 0" class="empty-state">
      <el-empty description="暂无股票投资数据">
        <template #image>
          <el-button type="primary" @click="showAddDialog = true">添加第一只股票</el-button>
        </template>
      </el-empty>
    </div>

    <div v-else>
      <el-table :data="stocksByValue" style="width: 100%" stripe>
        <el-table-column prop="name" label="股票名称" width="150" />
        <el-table-column prop="currentValue" label="当月市值" width="150">
          <template #default="scope">
            ¥{{ scope.row.currentValue.toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column prop="accountBalance" label="账户余额" width="150">
          <template #default="scope">
            ¥{{ scope.row.accountBalance.toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="总资产" width="150">
          <template #default="scope">
            ¥{{ scope.row.getTotalAssets().toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column prop="shares" label="持股数量" width="120" v-if="hasSharesData">
          <template #default="scope">
            {{ scope.row.shares ? scope.row.shares.toLocaleString() : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="市值占比" width="100">
          <template #default="scope">
            {{ getValuePercentage(scope.row.currentValue) }}%
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="editStock(scope.row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteStock(scope.row.id)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 新增/编辑股票对话框 -->
    <el-dialog :v-model="showAddDialog" :title="isEditing ? '编辑股票' : '新增股票'" width="600px">
      <el-form :model="stockForm" :rules="stockRules" ref="stockFormRef" label-width="100px">
        <el-form-item label="股票名称" prop="name">
          <el-input v-model="stockForm.name" placeholder="例如：平安银行" />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="当月市值" prop="currentValue">
              <el-input-number
                v-model="stockForm.currentValue"
                :precision="2"
                :min="0"
                :max="99999999.99"
                controls-position="right"
                placeholder="请输入当月市值"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="账户余额" prop="accountBalance">
              <el-input-number
                v-model="stockForm.accountBalance"
                :precision="2"
                :min="0"
                :max="99999999.99"
                controls-position="right"
                placeholder="请输入账户余额"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="持股数量" prop="shares">
          <el-input-number
            v-model="stockForm.shares"
            :precision="0"
            :min="0"
            controls-position="right"
            placeholder="可选，持股数量"
            style="width: 100%;"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="saveStock">
          {{ isEditing ? '更新' : '保存' }}
        </el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { TrendCharts, Money, Coin, List } from '@element-plus/icons-vue'
import { useStockInvestmentStore } from '../stores/stockInvestment.js'

export default {
  name: 'StockInvestment',
  components: {
    TrendCharts,
    Money,
    Coin,
    List
  },
  setup() {
    const stockStore = useStockInvestmentStore()
    const showAddDialog = ref(false)
    const isEditing = ref(false)
    const stockFormRef = ref(null)

    const stockForm = ref({
      id: null,
      name: '',
      currentValue: null,
      accountBalance: null,
      shares: null
    })

    const stockRules = {
      name: [{ required: true, message: '请输入股票名称', trigger: 'blur' }],
      currentValue: [{ required: true, message: '请输入当月市值', trigger: 'blur' }],
      accountBalance: [{ required: true, message: '请输入账户余额', trigger: 'blur' }]
    }

    // 计算属性
    const stocks = computed(() => stockStore.stocks)
    const stocksByValue = computed(() => stockStore.stocksByValue)
    const totalMarketValue = computed(() => stockStore.totalMarketValue)
    const totalAccountBalance = computed(() => stockStore.totalAccountBalance)
    const totalInvestmentAssets = computed(() => stockStore.totalInvestmentAssets)
    const stockCount = computed(() => stockStore.stockCount)

    const hasSharesData = computed(() => stocks.value.some(stock => stock.shares))

    const getValuePercentage = (value) => {
      if (totalMarketValue.value === 0) return '0.0'
      return ((value / totalMarketValue.value) * 100).toFixed(1)
    }

    const saveStock = async () => {
      if (!stockFormRef.value) return

      try {
        await stockFormRef.value.validate()

        if (isEditing.value) {
          stockStore.updateStock(
            stockForm.value.id,
            stockForm.value.currentValue,
            stockForm.value.accountBalance,
            stockForm.value.shares
          )
          ElMessage.success('股票信息更新成功')
        } else {
          stockStore.addStock(
            stockForm.value.name,
            stockForm.value.currentValue,
            stockForm.value.accountBalance,
            stockForm.value.shares
          )
          ElMessage.success('股票添加成功')
        }

        showAddDialog.value = false
        resetForm()
      } catch (error) {
        console.error('表单验证失败:', error)
      }
    }

    const editStock = (stock) => {
      stockForm.value = { ...stock }
      isEditing.value = true
      showAddDialog.value = true
    }

    const deleteStock = async (id) => {
      try {
        await ElMessageBox.confirm('确定要删除这只股票吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })

        stockStore.removeStock(id)
        ElMessage.success('股票删除成功')
      } catch {
        // 用户取消删除
      }
    }

    const clearAllStocks = async () => {
      try {
        await ElMessageBox.confirm('确定要清空所有股票投资记录吗？此操作不可恢复！', '警告', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })

        stockStore.clearAllStocks()
        ElMessage.success('所有股票投资记录已清空')
      } catch {
        // 用户取消操作
      }
    }

    const resetForm = () => {
      stockForm.value = {
        id: null,
        name: '',
        currentValue: null,
        accountBalance: null,
        shares: null
      }
      isEditing.value = false
      if (stockFormRef.value) {
        stockFormRef.value.clearValidate()
      }
    }

    onMounted(() => {
      stockStore.loadFromLocalStorage()
    })

    return {
      stocks,
      stocksByValue,
      totalMarketValue,
      totalAccountBalance,
      totalInvestmentAssets,
      stockCount,
      hasSharesData,
      showAddDialog,
      isEditing,
      stockForm,
      stockRules,
      stockFormRef,
      getValuePercentage,
      saveStock,
      editStock,
      deleteStock,
      clearAllStocks,
      resetForm
    }
  }
}
</script>

<style scoped>
.stock-investment {
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

.market-icon {
  background-color: #f0f9ff;
  color: #67C23A;
}

.balance-icon {
  background-color: #fef0f0;
  color: #409EFF;
}

.total-icon {
  background-color: #f5f7fa;
  color: #E6A23C;
}

.count-icon {
  background-color: #fdf6ec;
  color: #F56C6C;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
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