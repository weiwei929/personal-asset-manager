import { defineStore, getActivePinia } from 'pinia'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
import { useBankAccountsStore } from './bankAccounts.js'
import { useStockInvestmentStore } from './stockInvestment.js'
import { useFundInvestmentStore } from './fundInvestment.js'
import { useLentMoneyStore } from './lentMoney.js'
import { useFinanceStore } from './finance.js'
import { calcAssetBreakdown } from '../utils/assetTotals.js'

/**
 * 期初建账标记与编排
 * 完成时写入：四银行 + 股/基本金 + 借出未还 + 期初结构快照（供月度账单接龙）
 */
export const useOpeningBalanceStore = defineStore('openingBalance', {
  state: () => ({
    /** 建账基准日 YYYY-MM-DD */
    date: null,
    /** ISO 完成时间；非空即已建账 */
    completedAt: null,
    /**
     * 建账完成时的总资产结构快照
     * { totalDemand, totalTimeDeposit, totalInvestedPrincipal, totalLent, totalAssets, totalMarketValue? }
     */
    openingSnapshot: null
  }),

  getters: {
    hasOpenedBooks: (state) => Boolean(state.completedAt),

    summary() {
      return {
        date: this.date,
        completedAt: this.completedAt,
        hasOpenedBooks: this.hasOpenedBooks,
        openingSnapshot: this.openingSnapshot
      }
    }
  },

  actions: {
    loadFromLocalStorage() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.OPENING_BALANCE)
        if (!raw) {
          this.date = null
          this.completedAt = null
          this.openingSnapshot = null
          return
        }
        const data = JSON.parse(raw)
        this.date = data.date || null
        this.completedAt = data.completedAt || null
        this.openingSnapshot = data.openingSnapshot || null
      } catch (e) {
        this.date = null
        this.completedAt = null
        this.openingSnapshot = null
      }
    },

    saveToLocalStorage() {
      try {
        if (!this.completedAt) {
          localStorage.removeItem(STORAGE_KEYS.OPENING_BALANCE)
          return
        }
        localStorage.setItem(
          STORAGE_KEYS.OPENING_BALANCE,
          JSON.stringify({
            date: this.date,
            completedAt: this.completedAt,
            openingSnapshot: this.openingSnapshot
          })
        )
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('保存期初建账失败', e)
      }
    },

    /**
     * 完成期初建账（覆盖写入存量）
     * @param {{
     *   date: string,
     *   banks: Array<{ id: string, demandBalance: number, timeDeposits: Array }>,
     *   stocks?: Array<{ name: string, investedPrincipal: number, currentValue?: number }>,
     *   funds?: Array<{ name: string, investedPrincipal: number, currentValue?: number }>,
     *   lends?: Array<{ borrower: string, amount: number, notes?: string }>
     * }} payload
     */
    completeOpening(payload) {
      const date = (payload && payload.date) || todayISODate()
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error('初始日期格式应为 YYYY-MM-DD')
      }

      const banks = payload.banks || []
      const stocks = payload.stocks || []
      const funds = payload.funds || []
      const lends = payload.lends || []

      const bankStore = useBankAccountsStore()
      const stockStore = useStockInvestmentStore()
      const fundStore = useFundInvestmentStore()
      const lentStore = useLentMoneyStore()
      const financeStore = useFinanceStore()

      // 重新建账：清空旧月度流水与月度账单，避免与新存量快照叠加双计
      financeStore.clearAllData()
      clearMonthlyStatementsMemoryAndStorage()

      // 建账时清空异动再写快照
      bankStore.applyOpeningSnapshot(banks, { date, resetMovements: true })

      stockStore.replaceFromOpening(stocks)
      fundStore.replaceFromOpening(funds)
      lentStore.replaceFromOpening(lends, date)

      const totals = this.previewTotals({ banks, stocks, funds, lends })
      this.date = date
      this.completedAt = new Date().toISOString()
      this.openingSnapshot = {
        totalDemand: totals.totalDemand,
        totalTimeDeposit: totals.totalTimeDeposit,
        totalInvestedPrincipal: totals.totalInvestedPrincipal,
        totalLent: totals.totalLent,
        totalMarketValue: totals.totalMarketValue,
        totalAssets: totals.totalAssets
      }
      this.saveToLocalStorage()

      return totals
    },

    /**
     * 清除建账标记（不自动清空资产；开发重置会清全部键）
     */
    clearOpeningFlag() {
      this.date = null
      this.completedAt = null
      this.openingSnapshot = null
      this.saveToLocalStorage()
    },

    /**
     * 重新建账：清标记，由 UI 再走向导（可选先不删数据，提交时覆盖）
     */
    beginReopen() {
      this.clearOpeningFlag()
    },

    /**
     * 预览总资产（提交前手算对齐）
     */
    previewTotals({ banks, stocks, funds, lends }) {
      const accounts = (banks || []).map(b => ({
        demandBalance: Number(b.demandBalance) || 0,
        timeDeposits: (b.timeDeposits || []).map(d => ({
          principal: Number(d.principal) || 0
        }))
      }))
      const stockRows = (stocks || []).map(s => ({
        investedPrincipal: Number(s.investedPrincipal) || 0
      }))
      const fundRows = (funds || []).map(f => ({
        investedPrincipal: Number(f.investedPrincipal) || 0
      }))
      const lentRows = (lends || [])
        .filter(l => (Number(l.amount) || 0) > 0)
        .map(l => ({
          amount: Number(l.amount) || 0,
          status: 'pending'
        }))

      return calcAssetBreakdown({
        accounts,
        stocks: stockRows,
        funds: fundRows,
        lentRecords: lentRows
      })
    }
  }
})

function todayISODate() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/**
 * 清月度账单：只动 storage + 已注册的 pinia 实例，避免循环 import
 */
function clearMonthlyStatementsMemoryAndStorage() {
  try {
    localStorage.removeItem(STORAGE_KEYS.MONTHLY_STATEMENTS)
  } catch {
    /* ignore */
  }
  try {
    const pinia = getActivePinia()
    if (!pinia || !pinia._s) return
    const store = pinia._s.get('monthlyStatements')
    if (store) {
      store.statements = []
      store.lastCatchUpNote = null
    }
  } catch {
    /* ignore */
  }
}
