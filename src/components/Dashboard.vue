<template>
  <div class="dashboard">
    <!-- 顶部统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <!-- 月度收支统计 -->
      <el-col :span="24" :sm="12" :md="8" :lg="6" :xl="4">
        <el-card class="stat-card income-card">
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

      <el-col :span="24" :sm="12" :md="8" :lg="6" :xl="4">
        <el-card class="stat-card expense-card">
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

      <el-col :span="24" :sm="12" :md="8" :lg="6" :xl="4">
        <el-card class="stat-card balance-card">
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
      <el-col :span="24" :sm="12" :md="8" :lg="6" :xl="4">
        <el-card class="stat-card deposit-card">
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

      <el-col :span="24" :sm="12" :md="8" :lg="6" :xl="4">
        <el-card class="stat-card investment-card">
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

      <el-col :span="24" :sm="12" :md="8" :lg="6" :xl="4">
        <el-card class="stat-card total-card">
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

    <!-- 详细信息和图表区域 -->
    <el-row :gutter="20" class="content-row">
      <el-col :span="24" :lg="20" :xl="20">
        <el-card class="main-card" title="资产构成分析">
          <div class="asset-chart">
            <div class="chart-header">
              <h4>资产分布概览</h4>
              <div class="total-display">
                总资产: <span class="total-amount" :class="totalAssets >= 0 ? 'positive' : 'negative'">
                  ¥{{ totalAssets.toLocaleString() }}
                </span>
              </div>
            </div>
            
            <div class="asset-breakdown">
              <div class="asset-item">
                <div class="asset-info">
                  <span class="asset-label">月度净收入</span>
                  <span class="asset-value" :class="totalCumulativeNet >= 0 ? 'positive' : 'negative'">
                    ¥{{ totalCumulativeNet.toLocaleString() }}
                  </span>
                </div>
                <div class="asset-progress-bar">
                  <div class="progress-bg">
                    <div 
                      class="progress-fill net-income" 
                      :style="{ width: (totalAssets > 0 ? Math.abs(totalCumulativeNet / totalAssets * 100) : 0) + '%' }"
                    ></div>
                  </div>
                  <span class="percentage">{{ totalAssets > 0 ? (totalCumulativeNet / totalAssets * 100).toFixed(1) : '0.0' }}%</span>
                </div>
              </div>

              <div class="asset-item">
                <div class="asset-info">
                  <span class="asset-label">银行存款</span>
                  <span class="asset-value">¥{{ totalDepositAmount.toLocaleString() }}</span>
                </div>
                <div class="asset-progress-bar">
                  <div class="progress-bg">
                    <div 
                      class="progress-fill deposits" 
                      :style="{ width: (totalAssets > 0 ? (totalDepositAmount / totalAssets * 100) : 0) + '%' }"
                    ></div>
                  </div>
                  <span class="percentage">{{ totalAssets > 0 ? (totalDepositAmount / totalAssets * 100).toFixed(1) : '0.0' }}%</span>
                </div>
              </div>

              <div class="asset-item">
                <div class="asset-info">
                  <span class="asset-label">股票投资</span>
                  <span class="asset-value">¥{{ totalInvestmentAssets.toLocaleString() }}</span>
                </div>
                <div class="asset-progress-bar">
                  <div class="progress-bg">
                    <div 
                      class="progress-fill investments" 
                      :style="{ width: (totalAssets > 0 ? (totalInvestmentAssets / totalAssets * 100) : 0) + '%' }"
                    ></div>
                  </div>
                  <span class="percentage">{{ totalAssets > 0 ? (totalInvestmentAssets / totalAssets * 100).toFixed(1) : '0.0' }}%</span>
                </div>
              </div>

              <div class="asset-item">
                <div class="asset-info">
                  <span class="asset-label">待还款资金</span>
                  <span class="asset-value">¥{{ pendingAmount.toLocaleString() }}</span>
                </div>
                <div class="asset-progress-bar">
                  <div class="progress-bg">
                    <div 
                      class="progress-fill pending" 
                      :style="{ width: (totalAssets > 0 ? (pendingAmount / totalAssets * 100) : 0) + '%' }"
                    ></div>
                  </div>
                  <span class="percentage">{{ totalAssets > 0 ? (pendingAmount / totalAssets * 100).toFixed(1) : '0.0' }}%</span>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="24" :lg="4" :xl="4">
        <el-card class="side-card">
          <template #header>
            <div class="card-header">
              <span>快捷操作</span>
            </div>
          </template>
          
          <div class="quick-actions">
            <el-button 
              type="primary" 
              size="large" 
              @click="$emit('openDialog', 'monthlyFinance')" 
              class="quick-action-btn"
            >
              <el-icon><Plus /></el-icon>
              <span>月度收支</span>
            </el-button>
            
            <el-button 
              type="success" 
              size="large" 
              @click="$emit('openDialog', 'bankDeposit')" 
              class="quick-action-btn"
            >
              <el-icon><Coin /></el-icon>
              <span>新增存款</span>
            </el-button>
            
            <el-button 
              type="warning" 
              size="large" 
              @click="$emit('openDialog', 'stockInvestment')" 
              class="quick-action-btn"
            >
              <el-icon><TrendCharts /></el-icon>
              <span>股票投资</span>
            </el-button>
            
            <el-button 
              type="info" 
              size="large" 
              @click="$emit('openDialog', 'lentMoney')" 
              class="quick-action-btn"
            >
              <el-icon><Money /></el-icon>
              <span>借贷记录</span>
            </el-button>
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
import { Plus, Minus, Money, List, Coin, TrendCharts } from '@element-plus/icons-vue'

export default {
  name: 'FinanceDashboard',
  components: {
    Plus,
    Minus,
    Money,
    List,
    Coin,
    TrendCharts
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
      totalAssets
    }
  }
}
</script>

<style scoped>
.dashboard {
  padding: 0;
  background-color: #f5f7fa;
  min-height: calc(100vh - 120px);
}

/* 统计卡片行 */
.stats-row {
  margin-bottom: 24px;
}

.stat-card {
  height: 100px;
  margin-bottom: 16px;
  border: none;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  overflow: hidden;
  position: relative;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #409EFF 0%, #67C23A 100%);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

/* 不同类型卡片的主题色 */
.income-card::before {
  background: linear-gradient(90deg, #67C23A 0%, #85ce61 100%);
}

.expense-card::before {
  background: linear-gradient(90deg, #F56C6C 0%, #f78989 100%);
}

.balance-card::before {
  background: linear-gradient(90deg, #409EFF 0%, #66b1ff 100%);
}

.deposit-card::before {
  background: linear-gradient(90deg, #409EFF 0%, #4F9AFF 100%);
}

.investment-card::before {
  background: linear-gradient(90deg, #E6A23C 0%, #ebb563 100%);
}

.total-card::before {
  background: linear-gradient(90deg, #9C27B0 0%, #BA68C8 100%);
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 16px 20px;
}

.stat-icon {
  width: 55px;
  height: 55px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.income-icon {
  background: linear-gradient(135deg, #67C23A 0%, #85ce61 100%);
  color: white;
}

.expense-icon {
  background: linear-gradient(135deg, #F56C6C 0%, #f78989 100%);
  color: white;
}

.balance-icon {
  background: linear-gradient(135deg, #409EFF 0%, #66b1ff 100%);
  color: white;
}

.deposit-icon {
  background: linear-gradient(135deg, #409EFF 0%, #4F9AFF 100%);
  color: white;
}

.stock-icon {
  background: linear-gradient(135deg, #E6A23C 0%, #ebb563 100%);
  color: white;
}

.total-icon {
  background: linear-gradient(135deg, #9C27B0 0%, #BA68C8 100%);
  color: white;
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
  margin-bottom: 4px;
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
  font-weight: 500;
}

/* 内容区域行 */
.content-row {
  margin-bottom: 24px;
}

/* 主卡片 */
.main-card {
  border: none;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  min-height: 400px;
}

.main-card .el-card__header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 16px 16px 0 0;
  padding: 20px 24px;
  border-bottom: none;
}

.asset-chart {
  padding: 24px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f0f2f5;
}

.chart-header h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.total-display {
  font-size: 16px;
  font-weight: 600;
  color: #606266;
}

.total-amount {
  font-size: 20px;
  font-weight: 700;
  margin-left: 8px;
}

.asset-item {
  margin-bottom: 20px;
}

.asset-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.asset-label {
  font-size: 15px;
  color: #606266;
  font-weight: 500;
}

.asset-value {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.asset-value.positive {
  color: #67C23A;
}

.asset-value.negative {
  color: #F56C6C;
}

.asset-progress-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bg {
  flex: 1;
  height: 8px;
  background-color: #f0f2f5;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.6s ease;
}

.progress-fill.net-income {
  background: linear-gradient(90deg, #67C23A 0%, #85ce61 100%);
}

.progress-fill.deposits {
  background: linear-gradient(90deg, #409EFF 0%, #66b1ff 100%);
}

.progress-fill.investments {
  background: linear-gradient(90deg, #E6A23C 0%, #ebb563 100%);
}

.progress-fill.pending {
  background: linear-gradient(90deg, #F56C6C 0%, #f78989 100%);
}

.percentage {
  font-size: 14px;
  font-weight: 600;
  color: #606266;
  min-width: 45px;
  text-align: right;
}

/* 侧边卡片 */
.side-card {
  border: none;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  min-height: 400px;
  height: 100%;
}

.side-card .el-card__header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 16px 16px 0 0;
  padding: 20px 24px;
  border-bottom: none;
}

.side-card .el-card__body {
  padding: 24px;
  height: calc(100% - 70px);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.card-header {
  font-size: 18px;
  font-weight: 600;
}

/* 快捷操作 */
.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
}

.quick-action-btn {
  height: 58px !important;
  border-radius: 14px !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  border: none !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
  width: 140px !important;
  min-width: 140px !important;
  max-width: 140px !important;
  position: relative !important;
  overflow: hidden !important;
  letter-spacing: 0.5px !important;
  margin: 0 !important;
  padding: 12px 19px !important;
  box-sizing: border-box !important;
  flex-shrink: 0 !important;
}

.quick-action-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.quick-action-btn:hover::before {
  left: 100%;
}

.quick-action-btn:hover {
  transform: translateY(-3px) scale(1.02) !important;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.18) !important;
}

.quick-action-btn:active {
  transform: translateY(-1px) scale(0.98) !important;
  transition: all 0.1s ease !important;
}

.quick-action-btn .el-icon {
  margin-right: 10px !important;
  font-size: 19px !important;
  transition: transform 0.3s ease !important;
}

.quick-action-btn:hover .el-icon {
  transform: scale(1.1) !important;
}

.quick-action-btn span {
  font-weight: 600 !important;
  position: relative !important;
  z-index: 1 !important;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .dashboard {
    padding: 0;
    background-color: #fafafa;
  }
  
  .stats-row {
    margin-bottom: 16px;
  }
  
  .stat-card {
    height: 80px;
    margin-bottom: 12px;
    border-radius: 8px;
  }
  
  .stat-content {
    padding: 12px 16px;
  }
  
  .stat-icon {
    width: 40px;
    height: 40px;
    margin-right: 12px;
    font-size: 18px;
    border-radius: 8px;
  }
  
  .stat-value {
    font-size: 16px;
  }
  
  .stat-label {
    font-size: 12px;
  }
  
  .content-row {
    margin-bottom: 16px;
  }
  
  .main-card,
  .side-card {
    border-radius: 12px;
    min-height: auto;
    margin-bottom: 16px;
  }
  
  .asset-chart {
    padding: 16px;
  }
  
  .chart-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 16px;
  }
  
  .chart-header h4 {
    font-size: 16px;
  }
  
  .total-display {
    font-size: 14px;
  }
  
  .total-amount {
    font-size: 16px;
  }
  
  .asset-item {
    margin-bottom: 16px;
  }
  
  .asset-label,
  .asset-value {
    font-size: 13px;
  }
  
  .progress-bg {
    height: 6px;
  }
  
  .percentage {
    font-size: 12px;
    min-width: 35px;
  }
  
  .reminders-section h4,
  .quick-actions-section h4 {
    font-size: 14px;
    margin-bottom: 12px;
  }
  
  .reminder-item {
    padding: 10px 12px;
    font-size: 13px;
    margin-bottom: 6px;
  }
  
  .action-buttons .el-button {
    height: 36px;
    font-size: 13px;
  }
}

/* 小屏幕手机适配 */
@media (max-width: 480px) {
  .stat-card {
    height: 70px;
  }
  
  .stat-content {
    padding: 10px 12px;
  }
  
  .stat-icon {
    width: 35px;
    height: 35px;
    margin-right: 10px;
    font-size: 16px;
  }
  
  .stat-value {
    font-size: 14px;
  }
  
  .stat-label {
    font-size: 11px;
  }
  
  .asset-chart {
    padding: 12px;
  }
}

/* 卡片间距调整 */
.el-row {
  margin-left: -10px !important;
  margin-right: -10px !important;
}

.el-col {
  padding-left: 10px !important;
  padding-right: 10px !important;
}

/* 桌面端布局优化 */
@media (min-width: 1200px) {
  .dashboard {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 20px;
  }
  
  .stats-row .el-col {
    margin-bottom: 0;
  }
  
  .stat-card {
    margin-bottom: 0;
  }
}
</style>