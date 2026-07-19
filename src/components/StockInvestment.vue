<template>
  <div class="page-stack">
    <div class="page-toolbar">
      <button type="button" class="btn-line-primary" @click="showAddDialog = true">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14"/>
        </svg>
        新增
      </button>
      <button
        v-if="stocks.length > 0"
        type="button"
        class="btn-line-muted"
        @click="clearAllStocks"
      >
        清空
      </button>
    </div>

    <div class="stat-strip">
      <div class="stat-cell">
        <p class="stat-cell-label">总市值</p>
        <p class="stat-cell-value">¥{{ formatAmount(totalMarketValue) }}</p>
      </div>
      <div class="stat-cell">
        <p class="stat-cell-label">账户余额</p>
        <p class="stat-cell-value">¥{{ formatAmount(totalAccountBalance) }}</p>
      </div>
      <div class="stat-cell">
        <p class="stat-cell-label">投资合计</p>
        <p class="stat-cell-value">¥{{ formatAmount(totalInvestmentAssets) }}</p>
      </div>
      <div class="stat-cell">
        <p class="stat-cell-label">标的数量</p>
        <p class="stat-cell-value">{{ stockCount }}</p>
      </div>
    </div>

    <div class="panel">
      <div v-if="stocks.length === 0" class="empty-panel">
        <svg class="w-10 h-10 text-subtext-light dark:text-subtext-dark opacity-40" fill="none" stroke="currentColor" stroke-width="1.25" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 17l6-6 4 4 8-8"/>
          <path stroke-linecap="round" stroke-linejoin="round" d="M14 7h7v7"/>
        </svg>
        <p class="empty-panel-title">暂无投资记录</p>
        <p class="empty-panel-desc">添加股票或基金等标的，账户余额可从资金池划入或记为外部</p>
        <button type="button" class="btn-line mt-5" @click="showAddDialog = true">添加第一笔</button>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>名称</th>
              <th>市值</th>
              <th>账户余额</th>
              <th>合计</th>
              <th v-if="hasSharesData">持股</th>
              <th>占比</th>
              <th class="text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="stock in stocksByValue" :key="stock.id">
              <td class="font-medium whitespace-nowrap">{{ stock.name }}</td>
              <td>¥{{ formatAmount(stock.currentValue) }}</td>
              <td>¥{{ formatAmount(stock.accountBalance) }}</td>
              <td class="font-medium">¥{{ formatAmount(stock.getTotalAssets()) }}</td>
              <td v-if="hasSharesData">{{ stock.shares != null ? stock.shares.toLocaleString() : '—' }}</td>
              <td class="text-subtext-light dark:text-subtext-dark">{{ getValuePercentage(stock.currentValue) }}%</td>
              <td class="text-right whitespace-nowrap space-x-3">
                <button type="button" class="link-action" @click="editStock(stock)">编辑</button>
                <button type="button" class="link-action" @click="showSellDialog(stock)">卖出</button>
                <button type="button" class="link-danger" @click="deleteStock(stock.id)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 新增/编辑股票对话框 -->
    <div v-if="showAddDialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" tabindex="-1" @keydown.escape="showAddDialog = false">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[70vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="add-stock-title">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 id="add-stock-title" class="text-lg font-semibold text-text-light dark:text-text-dark">
              {{ isEditing ? '编辑股票' : '新增股票' }}
            </h3>
            <button 
              @click="showAddDialog = false"
              aria-label="关闭对话框"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <form @submit.prevent="saveStock" class="space-y-4">
            <!-- 资金来源选择 -->
            <div v-if="!isEditing">
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                资金来源 <span class="text-red-500">*</span>
              </label>
              <div class="space-y-2">
                <label class="flex items-center">
                  <input
                    v-model="stockForm.fundSource"
                    type="radio"
                    value="cash_pool"
                    class="mr-2"
                  />
                  <span>资金池 (可用余额: ¥{{ formatAmount(availableCash) }})</span>
                </label>
                <label class="flex items-center">
                  <input
                    v-model="stockForm.fundSource"
                    type="radio"
                    value="external"
                    class="mr-2"
                  />
                  <span>外部资金</span>
                </label>
              </div>
            </div>

            <!-- 股票名称 -->
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

            <!-- 当前市值 -->
            <div>
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                当前市值 <span class="text-red-500">*</span>
              </label>
              <input
                v-model.number="stockForm.currentValue"
                type="number"
                step="0.01"
                :min="0"
                placeholder="请输入当前市值"
                class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
            </div>

            <!-- 账户余额 -->
            <div>
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                账户余额 <span class="text-red-500">*</span>
              </label>
              <input
                v-model.number="stockForm.accountBalance"
                type="number"
                step="0.01"
                :min="0"
                :max="stockForm.fundSource === 'cash_pool' ? availableCash : undefined"
                placeholder="请输入账户余额"
                class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
              <div v-if="stockForm.fundSource === 'cash_pool'" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                最大可用: ¥{{ formatAmount(availableCash) }}
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

    <!-- 股票卖出对话框 -->
    <div v-if="showSellDialogFlag" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" tabindex="-1" @keydown.escape="closeSellDialog">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[70vh] overflow-y-auto mx-4" role="dialog" aria-modal="true" aria-labelledby="sell-stock-title">
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 id="sell-stock-title" class="text-lg font-semibold text-text-light dark:text-text-dark">
              股票卖出
            </h3>
            <button @click="closeSellDialog" aria-label="关闭对话框" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <form @submit.prevent="processSell" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                股票名称
              </label>
              <input
                :value="selectedStock?.name"
                readonly
                class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-gray-100 dark:bg-gray-700 text-text-light dark:text-text-dark"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                卖出类型
              </label>
              <div class="space-y-2">
                <label class="flex items-center">
                  <input
                    v-model="sellForm.sellType"
                    type="radio"
                    value="partial"
                    class="mr-2"
                  />
                  <span>部分卖出</span>
                </label>
                <label class="flex items-center">
                  <input
                    v-model="sellForm.sellType"
                    type="radio"
                    value="full"
                    class="mr-2"
                  />
                  <span>全部卖出</span>
                </label>
              </div>
            </div>

            <div v-if="sellForm.sellType === 'partial'">
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                卖出金额
              </label>
              <input
                v-model.number="sellForm.sellAmount"
                type="number"
                step="0.01"
                :min="0.01"
                :max="selectedStock?.getTotalAssets()"
                placeholder="请输入卖出金额"
                class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                最大可卖出: ¥{{ formatAmount(selectedStock?.getTotalAssets() || 0) }}
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                实际到账金额
              </label>
              <input
                v-model.number="sellForm.actualAmount"
                type="number"
                step="0.01"
                :min="0"
                placeholder="扣除手续费后的实际到账金额"
                class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                卖出日期
              </label>
              <input
                v-model="sellForm.sellDate"
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
                v-model="sellForm.notes"
                placeholder="卖出说明（可选）"
                rows="3"
                class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              ></textarea>
            </div>

            <div class="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
              <p class="text-sm text-orange-700 dark:text-orange-300">
                <strong>到账金额：</strong>¥{{ formatAmount(sellForm.actualAmount || 0) }}
              </p>
              <p class="text-xs text-orange-600 dark:text-orange-400 mt-1">
                {{ sellForm.sellType === 'full' ? '全部卖出后股票记录将被删除' : '部分卖出后将更新股票信息' }}
              </p>
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <button
                type="button"
                @click="closeSellDialog"
                class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                确认卖出
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
import { useFinanceStore } from '../stores/finance.js'
import { useFundTransferStore } from '../stores/fundTransfer.js'
import { formatAmount } from '../utils/format.js'

export default {
  name: 'StockInvestment',
  setup() {
    const stockStore = useStockInvestmentStore()
    const financeStore = useFinanceStore()
    const fundTransferStore = useFundTransferStore()
    
    const showAddDialog = ref(false)
    const isEditing = ref(false)

    const stockForm = ref({
      id: null,
      name: '',
      currentValue: null,
      accountBalance: null,
      shares: null,
      fundSource: 'cash_pool' // 新增字段
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

    // 计算可用现金
    const availableCash = computed(() => financeStore.cashPool)

    // 格式化金额显示
    // 统一使用 src/utils/format.js 的 formatAmount 工具

    const saveStock = async () => {
      try {
        // 简单的表单验证
        if (!stockForm.value.name || !stockForm.value.currentValue || !stockForm.value.accountBalance) {
          ElMessage.error('请填写所有必填字段')
          return
        }

        // 验证资金来源
        if (!isEditing.value && stockForm.value.fundSource === 'cash_pool') {
          if (stockForm.value.accountBalance > availableCash.value) {
            ElMessage.error('账户余额超过资金池可用余额')
            return
          }
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
          // 创建股票记录
          const stockId = stockStore.addStock(
            stockForm.value.name,
            stockForm.value.currentValue,
            stockForm.value.accountBalance,
            stockForm.value.shares
          )

          // 如果使用资金池，执行资金转换
          // 新增股票后执行资金转换
          if (stockForm.value.fundSource === 'cash_pool') {
            await fundTransferStore.performTransfer({
              fromType: 'cash_pool',
              toType: 'stock_investment',
              amount: stockForm.value.accountBalance,
              description: `新增股票投资: ${stockForm.value.name}`,
              relatedRecordId: stockId
            })
          }

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
        shares: null,
        fundSource: 'cash_pool'
      }
      isEditing.value = false
    }

    // 卖出相关的响应式数据和方法
    const showSellDialogFlag = ref(false)
    const selectedStock = ref(null)
    const sellForm = ref({
      sellType: 'partial',
      sellAmount: 0,
      actualAmount: 0,
      sellDate: new Date().toISOString().split('T')[0],
      notes: ''
    })

    // 显示卖出对话框
    const showSellDialog = (stock) => {
      selectedStock.value = stock
      sellForm.value = {
        sellType: 'partial',
        sellAmount: 0,
        actualAmount: 0,
        sellDate: new Date().toISOString().split('T')[0],
        notes: ''
      }
      showSellDialogFlag.value = true
    }

    // 关闭卖出对话框
    const closeSellDialog = () => {
      showSellDialogFlag.value = false
      selectedStock.value = null
      sellForm.value = {
        sellType: 'partial',
        sellAmount: 0,
        actualAmount: 0,
        sellDate: new Date().toISOString().split('T')[0],
        notes: ''
      }
    }

    // 方法：processSell（股票卖出）
    const processSell = async () => {
    try {
      if (!selectedStock.value) return

    const stock = selectedStock.value
    const actualAmount = sellForm.value.actualAmount

    // 执行资金转换（股票变现转回资金池）
    await fundTransferStore.performTransfer({
        fromType: 'stock_investment',
        toType: 'cash_pool',
        amount: actualAmount,
        description: `股票卖出: ${stock.name} (${sellForm.value.sellType === 'full' ? '全部' : '部分'}卖出)`,
        relatedRecordId: stock.id,
        transferType: 'sell'
    })

    if (sellForm.value.sellType === 'full') {
      // 全部卖出，删除股票记录
      stockStore.removeStock(stock.id)
      ElMessage.success(`股票全部卖出成功，¥${actualAmount.toLocaleString()} 已转入资金池`)
    } else {
      // 部分卖出，更新股票信息
      const sellAmount = sellForm.value.sellAmount
      const newCurrentValue = Math.max(0, stock.currentValue - sellAmount)
      const newAccountBalance = stock.accountBalance + actualAmount - sellAmount
      
      stockStore.updateStock(stock.id, newCurrentValue, newAccountBalance, stock.shares)
      ElMessage.success(`股票部分卖出成功，¥${actualAmount.toLocaleString()} 已转入资金池`)
    }

    closeSellDialog()
    } catch (error) {
    console.error('卖出失败:', error)
    ElMessage.error('卖出失败，请重试')
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
      getValuePercentage,
      saveStock,
      editStock,
      deleteStock,
      clearAllStocks,
      resetForm,
      availableCash,
      formatAmount,
      showSellDialogFlag,
      selectedStock,
      sellForm,
      showSellDialog,
      closeSellDialog,
      processSell
    }
  }
}
</script>
