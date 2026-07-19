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
        v-if="funds.length > 0"
        type="button"
        class="btn-line-muted"
        @click="clearAllFunds"
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
        <p class="stat-cell-value">{{ fundCount }}</p>
      </div>
    </div>

    <div class="panel">
      <div v-if="funds.length === 0" class="empty-panel">
        <svg class="w-10 h-10 text-subtext-light dark:text-subtext-dark opacity-40" fill="none" stroke="currentColor" stroke-width="1.25" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 17l6-6 4 4 8-8"/>
          <path stroke-linecap="round" stroke-linejoin="round" d="M14 7h7v7"/>
        </svg>
        <p class="empty-panel-title">暂无基金记录</p>
        <p class="empty-panel-desc">添加基金标的；账户余额可从资金池划入或记为外部</p>
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
              <th v-if="hasUnitsData">份额</th>
              <th>占比</th>
              <th class="text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="stock in fundsByValue" :key="stock.id">
              <td class="font-medium whitespace-nowrap">{{ stock.name }}</td>
              <td>¥{{ formatAmount(stock.currentValue) }}</td>
              <td>¥{{ formatAmount(stock.accountBalance) }}</td>
              <td class="font-medium">¥{{ formatAmount(stock.getTotalAssets()) }}</td>
              <td v-if="hasUnitsData">{{ stock.units != null ? stock.units.toLocaleString() : '—' }}</td>
              <td class="text-subtext-light dark:text-subtext-dark">{{ getValuePercentage(stock.currentValue) }}%</td>
              <td class="text-right whitespace-nowrap space-x-3">
                <button type="button" class="link-action" @click="editFund(stock)">编辑</button>
                <button type="button" class="link-action" @click="showRedeemDialog(stock)">赎回</button>
                <button type="button" class="link-danger" @click="deleteFund(stock.id)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 新增/编辑基金对话框 -->
    <div v-if="showAddDialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" tabindex="-1" @keydown.escape="showAddDialog = false">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[70vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="add-fund-title">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 id="add-fund-title" class="text-lg font-semibold text-text-light dark:text-text-dark">
              {{ isEditing ? '编辑基金' : '新增基金' }}
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

          <form @submit.prevent="saveFund" class="space-y-4">
            <!-- 资金来源选择 -->
            <div v-if="!isEditing" class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                  资金来源 <span class="text-red-500">*</span>
                </label>
                <p class="text-xs text-subtext-light dark:text-subtext-dark leading-relaxed mb-3">
                  <strong class="font-medium text-text-light dark:text-text-dark">资金池</strong>
                  是本系统里已记账的可分配现金（各月净收入累计 − 已划出部分），不是某张银行卡。
                </p>
              </div>
              <div class="space-y-2.5">
                <label
                  class="flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors"
                  :class="fundForm.fundSource === 'cash_pool'
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border-light dark:border-border-dark'"
                >
                  <input
                    v-model="fundForm.fundSource"
                    type="radio"
                    value="cash_pool"
                    class="mt-0.5"
                  />
                  <span class="min-w-0">
                    <span class="block text-sm text-text-light dark:text-text-dark">从资金池买入</span>
                    <span class="block text-xs text-subtext-light dark:text-subtext-dark mt-0.5 leading-relaxed">
                      用账本里已有的可分配现金申购/转入本基金。提交后会从资金池扣减（当前可用
                      ¥{{ formatAmount(availableCash) }}），总资产不变，只是结构从「现金」变为「基金」。
                    </span>
                  </span>
                </label>
                <label
                  class="flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors"
                  :class="fundForm.fundSource === 'external'
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border-light dark:border-border-dark'"
                >
                  <input
                    v-model="fundForm.fundSource"
                    type="radio"
                    value="external"
                    class="mt-0.5"
                  />
                  <span class="min-w-0">
                    <span class="block text-sm text-text-light dark:text-text-dark">外部新资金买入</span>
                    <span class="block text-xs text-subtext-light dark:text-subtext-dark mt-0.5 leading-relaxed">
                      用尚未记入资金池的钱购买（如工资直购、银行卡另付）。不扣资金池，总资产会增加。
                      注意：若同一笔钱已在「收支」里记过收入，请勿再选外部，以免总资产双计。
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <!-- 基金名称 -->
            <div>
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                基金名称 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="fundForm.name"
                type="text"
                placeholder="例如：易方达蓝筹精选"
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
                v-model.number="fundForm.currentValue"
                type="number"
                step="0.01"
                :min="0"
                placeholder="请输入当前市值"
                class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
            </div>

            <!-- 账户余额 / 投入金额 -->
            <div>
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                {{ fundForm.fundSource === 'cash_pool' ? '从资金池划入金额' : '本次投入金额' }}
                <span class="text-red-500">*</span>
              </label>
              <input
                v-model.number="fundForm.accountBalance"
                type="number"
                step="0.01"
                :min="0"
                :max="fundForm.fundSource === 'cash_pool' ? availableCash : undefined"
                :placeholder="fundForm.fundSource === 'cash_pool' ? '将从资金池扣除的金额' : '外部投入金额'"
                class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
              <p class="text-xs text-subtext-light dark:text-subtext-dark mt-1 leading-relaxed">
                <template v-if="fundForm.fundSource === 'cash_pool'">
                  此项会从资金池扣减，上限 ¥{{ formatAmount(availableCash) }}。通常可与「当前市值」相同（刚买入时）。
                </template>
                <template v-else>
                  记录这笔外部资金投入；不扣资金池。市值可与投入额相同或按最新估值填写。
                </template>
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                份额数量
              </label>
              <input
                v-model.number="fundForm.units"
                type="number"
                min="0"
                placeholder="可选，份额数量"
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

    <!-- 基金赎回对话框 -->
    <div v-if="showRedeemDialogFlag" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" tabindex="-1" @keydown.escape="closeRedeemDialog">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[70vh] overflow-y-auto mx-4" role="dialog" aria-modal="true" aria-labelledby="sell-stock-title">
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 id="sell-stock-title" class="text-lg font-semibold text-text-light dark:text-text-dark">
              基金赎回
            </h3>
            <button @click="closeRedeemDialog" aria-label="关闭对话框" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <form @submit.prevent="processRedeem" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                基金名称
              </label>
              <input
                :value="selectedFund?.name"
                readonly
                class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-gray-100 dark:bg-gray-700 text-text-light dark:text-text-dark"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                赎回类型
              </label>
              <div class="space-y-2">
                <label class="flex items-center">
                  <input
                    v-model="redeemForm.redeemType"
                    type="radio"
                    value="partial"
                    class="mr-2"
                  />
                  <span>部分赎回</span>
                </label>
                <label class="flex items-center">
                  <input
                    v-model="redeemForm.redeemType"
                    type="radio"
                    value="full"
                    class="mr-2"
                  />
                  <span>全部赎回</span>
                </label>
              </div>
            </div>

            <div v-if="redeemForm.redeemType === 'partial'">
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                赎回金额
              </label>
              <input
                v-model.number="redeemForm.redeemAmount"
                type="number"
                step="0.01"
                :min="0.01"
                :max="selectedFund?.getTotalAssets()"
                placeholder="请输入赎回金额"
                class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                最大可赎回: ¥{{ formatAmount(selectedFund?.getTotalAssets() || 0) }}
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                实际到账金额
              </label>
              <input
                v-model.number="redeemForm.actualAmount"
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
                赎回日期
              </label>
              <input
                v-model="redeemForm.sellDate"
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
                v-model="redeemForm.notes"
                placeholder="赎回说明（可选）"
                rows="3"
                class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              ></textarea>
            </div>

            <div class="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
              <p class="text-sm text-orange-700 dark:text-orange-300">
                <strong>到账金额：</strong>¥{{ formatAmount(redeemForm.actualAmount || 0) }}
              </p>
              <p class="text-xs text-orange-600 dark:text-orange-400 mt-1">
                {{ redeemForm.redeemType === 'full' ? '全部赎回后基金记录将被删除' : '部分赎回后将更新基金信息' }}
              </p>
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <button
                type="button"
                @click="closeRedeemDialog"
                class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                确认赎回
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
import { useFundInvestmentStore } from '../stores/fundInvestment.js'
import { useFinanceStore } from '../stores/finance.js'
import { useFundTransferStore } from '../stores/fundTransfer.js'
import { formatAmount } from '../utils/format.js'

export default {
  name: 'FundInvestment',
  setup() {
    const fundStore = useFundInvestmentStore()
    const financeStore = useFinanceStore()
    const fundTransferStore = useFundTransferStore()
    
    const showAddDialog = ref(false)
    const isEditing = ref(false)

    const fundForm = ref({
      id: null,
      name: '',
      currentValue: null,
      accountBalance: null,
      units: null,
      fundSource: 'cash_pool' // 新增字段
    })

    // 计算属性
    const funds = computed(() => fundStore.funds)
    const fundsByValue = computed(() => fundStore.fundsByValue)
    const totalMarketValue = computed(() => fundStore.totalMarketValue)
    const totalAccountBalance = computed(() => fundStore.totalAccountBalance)
    const totalInvestmentAssets = computed(() => fundStore.totalInvestmentAssets)
    const fundCount = computed(() => fundStore.fundCount)

    const hasUnitsData = computed(() => funds.value.some(stock => stock.units))

    const getValuePercentage = (value) => {
      if (totalMarketValue.value === 0) return '0.0'
      return ((value / totalMarketValue.value) * 100).toFixed(1)
    }

    // 计算可用现金
    const availableCash = computed(() => financeStore.cashPool)

    // 格式化金额显示
    // 统一使用 src/utils/format.js 的 formatAmount 工具

    const saveFund = async () => {
      try {
        // 简单的表单验证
        if (!fundForm.value.name || !fundForm.value.currentValue || !fundForm.value.accountBalance) {
          ElMessage.error('请填写所有必填字段')
          return
        }

        // 验证资金来源
        if (!isEditing.value && fundForm.value.fundSource === 'cash_pool') {
          if (fundForm.value.accountBalance > availableCash.value) {
            ElMessage.error('账户余额超过资金池可用余额')
            return
          }
        }

        if (isEditing.value) {
          fundStore.updateFund(
            fundForm.value.id,
            fundForm.value.currentValue,
            fundForm.value.accountBalance,
            fundForm.value.units
          )
          ElMessage.success('基金信息更新成功')
        } else {
          // 创建基金记录
          const stockId = fundStore.addFund(
            fundForm.value.name,
            fundForm.value.currentValue,
            fundForm.value.accountBalance,
            fundForm.value.units
          )

          // 如果使用资金池，执行资金转换
          // 新增基金后执行资金转换
          if (fundForm.value.fundSource === 'cash_pool') {
            await fundTransferStore.performTransfer({
              fromType: 'cash_pool',
              toType: 'fund_investment',
              amount: fundForm.value.accountBalance,
              description: `新增基金投资: ${fundForm.value.name}`,
              relatedRecordId: stockId
            })
          }

          ElMessage.success('基金添加成功')
        }

        showAddDialog.value = false
        resetForm()
      } catch (error) {
        console.error('保存失败:', error)
        ElMessage.error('保存失败，请重试')
      }
    }

    const editFund = (stock) => {
      fundForm.value = { ...stock }
      isEditing.value = true
      showAddDialog.value = true
    }

    const deleteFund = async (id) => {
      try {
        await ElMessageBox.confirm('确定要删除这只基金吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })

        fundStore.removeFund(id)
        ElMessage.success('基金删除成功')
      } catch {
        // 用户取消删除
      }
    }

    const clearAllFunds = async () => {
      try {
        await ElMessageBox.confirm('确定要清空所有基金投资记录吗？此操作不可恢复！', '警告', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })

        fundStore.clearAllFunds()
        ElMessage.success('所有基金投资记录已清空')
      } catch {
        // 用户取消操作
      }
    }

    const resetForm = () => {
      fundForm.value = {
        id: null,
        name: '',
        currentValue: null,
        accountBalance: null,
        units: null,
        fundSource: 'cash_pool'
      }
      isEditing.value = false
    }

    // 赎回相关的响应式数据和方法
    const showRedeemDialogFlag = ref(false)
    const selectedFund = ref(null)
    const redeemForm = ref({
      redeemType: 'partial',
      redeemAmount: 0,
      actualAmount: 0,
      sellDate: new Date().toISOString().split('T')[0],
      notes: ''
    })

    // 显示赎回对话框
    const showRedeemDialog = (stock) => {
      selectedFund.value = stock
      redeemForm.value = {
        redeemType: 'partial',
        redeemAmount: 0,
        actualAmount: 0,
        sellDate: new Date().toISOString().split('T')[0],
        notes: ''
      }
      showRedeemDialogFlag.value = true
    }

    // 关闭赎回对话框
    const closeRedeemDialog = () => {
      showRedeemDialogFlag.value = false
      selectedFund.value = null
      redeemForm.value = {
        redeemType: 'partial',
        redeemAmount: 0,
        actualAmount: 0,
        sellDate: new Date().toISOString().split('T')[0],
        notes: ''
      }
    }

    // 方法：processRedeem（基金赎回）
    const processRedeem = async () => {
    try {
      if (!selectedFund.value) return

    const stock = selectedFund.value
    const actualAmount = redeemForm.value.actualAmount

    // 执行资金转换（基金变现转回资金池）
    await fundTransferStore.performTransfer({
        fromType: 'fund_investment',
        toType: 'cash_pool',
        amount: actualAmount,
        description: `基金赎回: ${stock.name} (${redeemForm.value.redeemType === 'full' ? '全部' : '部分'}赎回)`,
        relatedRecordId: stock.id,
        transferType: 'redeem'
    })

    if (redeemForm.value.redeemType === 'full') {
      // 全部赎回，删除基金记录
      fundStore.removeFund(stock.id)
      ElMessage.success(`基金全部赎回成功，¥${actualAmount.toLocaleString()} 已转入资金池`)
    } else {
      // 部分赎回，更新基金信息
      const redeemAmount = redeemForm.value.redeemAmount
      const newCurrentValue = Math.max(0, stock.currentValue - redeemAmount)
      const newAccountBalance = stock.accountBalance + actualAmount - redeemAmount
      
      fundStore.updateFund(stock.id, newCurrentValue, newAccountBalance, stock.units)
      ElMessage.success(`基金部分赎回成功，¥${actualAmount.toLocaleString()} 已转入资金池`)
    }

    closeRedeemDialog()
    } catch (error) {
    console.error('赎回失败:', error)
    ElMessage.error('赎回失败，请重试')
    }
    }

    onMounted(() => {
      fundStore.loadFromLocalStorage()
    })

    return {
      funds,
      fundsByValue,
      totalMarketValue,
      totalAccountBalance,
      totalInvestmentAssets,
      fundCount,
      hasUnitsData,
      showAddDialog,
      isEditing,
      fundForm,
      getValuePercentage,
      saveFund,
      editFund,
      deleteFund,
      clearAllFunds,
      resetForm,
      availableCash,
      formatAmount,
      showRedeemDialogFlag,
      selectedFund,
      redeemForm,
      showRedeemDialog,
      closeRedeemDialog,
      processRedeem
    }
  }
}
</script>
