<template>
  <div class="p-6 space-y-6">
    <!-- 页面头部 -->
    <div class="bg-card-light dark:bg-card-dark rounded-xl p-4 sm:p-6 shadow-sm border border-border-light dark:border-border-dark">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 class="text-xl sm:text-2xl font-bold text-text-light dark:text-text-dark">股票投资管理</h1>
        <div class="flex flex-wrap gap-2">
          <button 
            @click="showAddDialog = true"
            class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
          >
            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            新增股票
          </button>
          <button 
            v-if="stocks.length > 0"
            @click="clearAllStocks"
            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
          >
            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
            清空数据
          </button>
        </div>
      </div>
    </div>

    <!-- 投资统计卡片 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-card-light dark:bg-card-dark rounded-xl p-4 sm:p-6 shadow-sm border border-border-light dark:border-border-dark">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">总市值</p>
            <p class="text-2xl font-semibold text-text-light dark:text-text-dark">¥{{ totalMarketValue.toLocaleString() }}</p>
          </div>
        </div>
      </div>

      <div class="bg-card-light dark:bg-card-dark rounded-xl p-4 sm:p-6 shadow-sm border border-border-light dark:border-border-dark">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">账户余额</p>
            <p class="text-2xl font-semibold text-text-light dark:text-text-dark">¥{{ totalAccountBalance.toLocaleString() }}</p>
          </div>
        </div>
      </div>

      <div class="bg-card-light dark:bg-card-dark rounded-xl p-4 sm:p-6 shadow-sm border border-border-light dark:border-border-dark">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">总投资资产</p>
            <p class="text-2xl font-semibold text-text-light dark:text-text-dark">¥{{ totalInvestmentAssets.toLocaleString() }}</p>
          </div>
        </div>
      </div>

      <div class="bg-card-light dark:bg-card-dark rounded-xl p-4 sm:p-6 shadow-sm border border-border-light dark:border-border-dark">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-orange-100 dark:bg-orange-900/50 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">股票数量</p>
            <p class="text-2xl font-semibold text-text-light dark:text-text-dark">{{ stockCount }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 股票列表 -->
    <div class="bg-card-light dark:bg-card-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark">
      <div v-if="stocks.length === 0" class="unified-empty-state">
        <div class="empty-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
          </svg>
        </div>
        <h3 class="empty-title">暂无股票数据</h3>
        <p class="empty-description">开始添加您的第一支股票投资记录</p>
        <button class="empty-action" @click="showAddDialog = true">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14"/>
          </svg>
          添加第一支股票
        </button>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">股票名称</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">当月市值</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">账户余额</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">总资产</th>
              <th v-if="hasSharesData" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">持股数量</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">市值占比</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="stock in stocksByValue" :key="stock.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-text-light dark:text-text-dark">{{ stock.name }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-text-light dark:text-text-dark">¥{{ stock.currentValue.toLocaleString() }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-text-light dark:text-text-dark">¥{{ stock.accountBalance.toLocaleString() }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-text-light dark:text-text-dark">¥{{ stock.getTotalAssets().toLocaleString() }}</div>
              </td>
              <td v-if="hasSharesData" class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-text-light dark:text-text-dark">{{ stock.shares ? stock.shares.toLocaleString() : '-' }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                  {{ getValuePercentage(stock.currentValue) }}%
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex justify-end gap-2">
                  <button 
                    @click="editStock(stock)"
                    class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  >
                    编辑
                  </button>
                  <button 
                    @click="deleteStock(stock.id)"
                    class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                  >
                    删除
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 新增/编辑股票对话框 -->
    <div v-if="showAddDialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-card-light dark:bg-card-dark rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-text-light dark:text-text-dark">
              {{ isEditing ? '编辑股票' : '新增股票' }}
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

          <form @submit.prevent="saveStock" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                股票名称 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="stockForm.name"
                type="text"
                placeholder="例如：平安银行"
                class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                  当月市值 <span class="text-red-500">*</span>
                </label>
                <input
                  v-model.number="stockForm.currentValue"
                  type="number"
                  step="0.01"
                  min="0"
                  max="99999999.99"
                  placeholder="请输入当月市值"
                  class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  required
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                  账户余额 <span class="text-red-500">*</span>
                </label>
                <input
                  v-model.number="stockForm.accountBalance"
                  type="number"
                  step="0.01"
                  min="0"
                  max="99999999.99"
                  placeholder="请输入账户余额"
                  class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                持股数量
              </label>
              <input
                v-model.number="stockForm.shares"
                type="number"
                min="0"
                placeholder="可选，持股数量"
                class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
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
import { useStockInvestmentStore } from '../stores/stockInvestment.js'

export default {
  name: 'StockInvestment',
  setup() {
    const stockStore = useStockInvestmentStore()
    const showAddDialog = ref(false)
    const isEditing = ref(false)

    const stockForm = ref({
      id: null,
      name: '',
      currentValue: null,
      accountBalance: null,
      shares: null
    })

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
      try {
        // 简单的表单验证
        if (!stockForm.value.name || !stockForm.value.currentValue || !stockForm.value.accountBalance) {
          ElMessage.error('请填写所有必填字段')
          return
        }

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
        console.error('保存失败:', error)
        ElMessage.error('保存失败，请重试')
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