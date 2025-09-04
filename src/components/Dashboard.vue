<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <!-- 月度收支统计 -->
      <el-col :span="4">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon income-icon">
              <el-icon><Plus /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">¥{{ currentMonthFinance.income.toLocaleString() }}</div>
              <div class="stat-label">当月收入</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="4">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon expense-icon">
              <el-icon><Minus /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">¥{{ currentMonthFinance.expense.toLocaleString() }}</div>
              <div class="stat-label">当月支出</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="4">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon balance-icon">
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

      <!-- 资产统计 -->
      <el-col :span="4">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon deposit-icon">
              <el-icon><Coin /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">¥{{ totalDepositAmount.toLocaleString() }}</div>
              <div class="stat-label">银行存款</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="4">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon stock-icon">
              <el-icon><TrendCharts /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">¥{{ totalInvestmentAssets.toLocaleString() }}</div>
              <div class="stat-label">股票投资</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="4">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon total-icon">
              <el-icon><List /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value" :class="totalAssets >= 0 ? 'positive' : 'negative'">
                ¥{{ totalAssets.toLocaleString() }}
              </div>
              <div class="stat-label">总资产</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 资产分布图表 -->
    <el-row :gutter="20" style="margin-top: 30px;">
      <el-col :span="12">
        <el-card title="资产构成">
          <div class="asset-chart">
            <div class="asset-item">
              <span class="asset-label">月度净收入:</span>
              <span class="asset-value" :class="totalCumulativeNet >= 0 ? 'positive' : 'negative'">
                ¥{{ totalCumulativeNet.toLocaleString() }}
              </span>
            </div>
            <div class="asset-item">
              <span class="asset-label">银行存款:</span>
              <span class="asset-value">¥{{ totalDepositAmount.toLocaleString() }}</span>
            </div>
            <div class="asset-item">
              <span class="asset-label">股票投资:</span>
              <span class="asset-value">¥{{ totalInvestmentAssets.toLocaleString() }}</span>
            </div>
            <div class="asset-item">
              <span class="asset-label">待还款资金:</span>
              <span class="asset-value">¥{{ pendingAmount.toLocaleString() }}</span>
            </div>
            <el-divider />
            <div class="asset-item total">
              <span class="asset-label">总资产:</span>
              <span class="asset-value" :class="totalAssets >= 0 ? 'positive' : 'negative'">
                ¥{{ totalAssets.toLocaleString() }}
              </span>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card title="待办提醒">
          <div class="reminders">
            <!-- 存款到期提醒 -->
            <div v-if="maturingDeposits.length > 0" class="reminder-item warning">
              <el-icon><Warning /></el-icon>
              <span>{{ maturingDeposits.length }} 笔存款即将到期</span>
            </div>

            <!-- 逾期提醒 -->
            <div v-if="overdueRecords.length > 0" class="reminder-item error">
              <el-icon><Close /></el-icon>
              <span>{{ overdueRecords.length }} 笔借出资金已逾期</span>
            </div>

            <!-- 股票市值提醒 -->
            <div v-if="totalInvestmentAssets > 0" class="reminder-item info">
              <el-icon><TrendCharts /></el-icon>
              <span>当前持有 {{ stockCount }} 只股票</span>
            </div>

            <!-- 无提醒 -->
            <div v-if="maturingDeposits.length === 0 && overdueRecords.length === 0 && totalInvestmentAssets === 0" class="reminder-item success">
              <el-icon><Check /></el-icon>
              <span>暂无待办事项</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { computed, onMounted } from 'vue'
import { useFinanceStore } from '../stores/finance.js'
import { useBankDepositStore } from '../stores/bankDeposit.js'
import { useStockInvestmentStore } from '../stores/stockInvestment.js'
import { useLentMoneyStore } from '../stores/lentMoney.js'
import { Plus, Minus, Money, List, Coin, TrendCharts, Warning, Close, Check } from '@element-plus/icons-vue'

export default {
  name: 'FinanceDashboard',
  components: {
    Plus,
    Minus,
    Money,
    List,
    Coin,
    TrendCharts,
    Warning,
    Close,
    Check
  },
  setup() {
    const financeStore = useFinanceStore()
    const bankDepositStore = useBankDepositStore()
    const stockStore = useStockInvestmentStore()
    const lentMoneyStore = useLentMoneyStore()

    // 月度财务数据
    const currentMonthFinance = computed(() => financeStore.currentMonthFinance)
    const totalCumulativeNet = computed(() => financeStore.totalCumulativeNet)

    // 资产数据
    const totalDepositAmount = computed(() => bankDepositStore.totalDepositAmount)
    const totalInvestmentAssets = computed(() => stockStore.totalInvestmentAssets)
    const pendingAmount = computed(() => lentMoneyStore.pendingAmount)

    // 总资产 = 累积净收入 + 银行存款 + 股票投资 - 待还款资金
    const totalAssets = computed(() => {
      return totalCumulativeNet.value + totalDepositAmount.value + totalInvestmentAssets.value - pendingAmount.value
    })

    // 提醒数据
    const maturingDeposits = computed(() => bankDepositStore.maturingDeposits)
    const overdueRecords = computed(() => lentMoneyStore.overdueRecords)
    const stockCount = computed(() => stockStore.stockCount)

    onMounted(() => {
      financeStore.loadFromLocalStorage()
      bankDepositStore.loadFromLocalStorage()
      stockStore.loadFromLocalStorage()
      lentMoneyStore.loadFromLocalStorage()
    })

    return {
      currentMonthFinance,
      totalCumulativeNet,
      totalDepositAmount,
      totalInvestmentAssets,
      pendingAmount,
      totalAssets,
      maturingDeposits,
      overdueRecords,
      stockCount
    }
  }
}
</script>

<style scoped>
.dashboard {
  padding: 20px 0;
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

.income-icon {
  background-color: #f0f9ff;
  color: #67C23A;
}

.expense-icon {
  background-color: #fef0f0;
  color: #F56C6C;
}

.balance-icon {
  background-color: #f5f7fa;
  color: #409EFF;
}

.deposit-icon {
  background-color: #f0f9ff;
  color: #409EFF;
}

.stock-icon {
  background-color: #f0f9ff;
  color: #E6A23C;
}

.total-icon {
  background-color: #f5f7fa;
  color: #E6A23C;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 20px;
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

.asset-chart {
  padding: 20px 0;
}

.asset-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.asset-item.total {
  border-bottom: 2px solid #409EFF;
  font-weight: bold;
  font-size: 16px;
  margin-top: 10px;
  padding-top: 15px;
}

.asset-label {
  color: #606266;
}

.asset-value {
  font-weight: 500;
  color: #303133;
}

.asset-value.positive {
  color: #67C23A;
}

.asset-value.negative {
  color: #F56C6C;
}

.reminders {
  padding: 10px 0;
}

.reminder-item {
  display: flex;
  align-items: center;
  padding: 10px;
  margin-bottom: 8px;
  border-radius: 4px;
  font-size: 14px;
}

.reminder-item.warning {
  background-color: #fdf6ec;
  color: #E6A23C;
  border: 1px solid #f5dab1;
}

.reminder-item.error {
  background-color: #fef0f0;
  color: #F56C6C;
  border: 1px solid #fbc4c4;
}

.reminder-item.info {
  background-color: #f0f9ff;
  color: #409EFF;
  border: 1px solid #c6e2ff;
}

.reminder-item.success {
  background-color: #f0f9ff;
  color: #67C23A;
  border: 1px solid #b3e5b3;
}

.reminder-item .el-icon {
  margin-right: 8px;
  font-size: 16px;
}
</style>