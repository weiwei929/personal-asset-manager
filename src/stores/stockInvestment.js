import { defineStore } from 'pinia'
import StockInvestment from '../models/StockInvestment.js'
import { useBankAccountsStore } from './bankAccounts.js'
import { planInvest, planWithdraw } from '../utils/investmentOps.js'
import { isValidBankId } from '../constants/banks.js'
import { STORAGE_KEYS } from '../constants/storageKeys.js'

export const useStockInvestmentStore = defineStore('stockInvestment', {
  state: () => ({
    stocks: []
  }),

  getters: {
    totalMarketValue: (state) =>
      state.stocks.reduce((sum, s) => sum + (Number(s.currentValue) || 0), 0),

    totalAccountBalance: (state) =>
      state.stocks.reduce((sum, s) => sum + (Number(s.accountBalance) || 0), 0),

    totalInvestedPrincipal: (state) =>
      state.stocks.reduce((sum, s) => sum + (Number(s.investedPrincipal) || 0), 0),

    totalUnrealizedPnl() {
      return this.totalMarketValue - this.totalInvestedPrincipal
    },

    totalInvestmentAssets: (state) =>
      state.stocks.reduce((sum, s) => {
        if (typeof s.getTotalAssets === 'function') return sum + s.getTotalAssets()
        return sum + (Number(s.currentValue) || 0) + (Number(s.accountBalance) || 0)
      }, 0),

    totalAssets() {
      return this.totalInvestmentAssets
    },

    stockCount: (state) => state.stocks.length,

    stocksByValue: (state) =>
      [...state.stocks].sort(
        (a, b) => (Number(b.currentValue) || 0) - (Number(a.currentValue) || 0)
      ),

    stocksByPrincipal: (state) =>
      [...state.stocks].sort(
        (a, b) => (Number(b.investedPrincipal) || 0) - (Number(a.investedPrincipal) || 0)
      ),

    stockValueDistribution: (state) => {
      const total = state.stocks.reduce(
        (sum, s) => sum + (Number(s.currentValue) || 0),
        0
      )
      if (total === 0) return []
      return state.stocks
        .map(s => ({
          name: s.name,
          value: s.currentValue,
          percentage: (((Number(s.currentValue) || 0) / total) * 100).toFixed(1)
        }))
        .sort((a, b) => b.value - a.value)
    }
  },

  actions: {
    _find(id) {
      const stock = this.stocks.find(s => s.id === id)
      if (!stock) throw new Error('未找到该股票')
      return stock
    },

    _requireBank(bankId) {
      if (!isValidBankId(bankId)) throw new Error('请选择银行活期')
    },

    /**
     * 新建标的并投入（从活期）
     * @returns {string} id
     */
    investNew({ name, amount, bankId, currentValue = null, shares = null }) {
      const n = String(name || '').trim()
      if (!n) throw new Error('请填写名称')
      this._requireBank(bankId)
      const { amount: amt, nextPrincipal } = planInvest(0, amount)

      const bank = useBankAccountsStore()
      const acc = bank.accountById(bankId)
      if ((Number(acc?.demandBalance) || 0) < amt) {
        throw new Error(`活期不足：${acc?.name || bankId} 当前 ¥${acc?.demandBalance ?? 0}`)
      }

      bank.adjustDemandBalance(bankId, -amt, {
        type: 'invest_stock',
        note: `股票投入 ${n}`
      })

      const mv = currentValue == null ? amt : Number(currentValue) || 0
      const stock = StockInvestment.create(n, mv, amt, shares, nextPrincipal)
      this.stocks.push(stock)
      this.saveToLocalStorage()
      return stock.id
    },

    /**
     * 追加投入（从活期）
     */
    addPrincipal(id, amount, bankId) {
      this._requireBank(bankId)
      const stock = this._find(id)
      const { amount: amt, nextPrincipal } = planInvest(stock.investedPrincipal, amount)

      const bank = useBankAccountsStore()
      const acc = bank.accountById(bankId)
      if ((Number(acc?.demandBalance) || 0) < amt) {
        throw new Error(`活期不足：${acc?.name || bankId} 当前 ¥${acc?.demandBalance ?? 0}`)
      }

      bank.adjustDemandBalance(bankId, -amt, {
        type: 'invest_stock_add',
        note: `股票追加 ${stock.name}`
      })

      stock.investedPrincipal = nextPrincipal
      stock.updatedAt = new Date().toISOString()
      this.saveToLocalStorage()
      return { nextPrincipal, amount: amt }
    },

    /**
     * 仅更新观察市值（不改总资产）
     */
    updateMarketValue(id, currentValue, shares = null) {
      const stock = this._find(id)
      if (typeof stock.updateMarketValue === 'function') {
        stock.updateMarketValue(currentValue, shares)
      } else {
        stock.currentValue = Number(currentValue) || 0
        if (shares !== null) stock.shares = shares
        stock.updatedAt = new Date().toISOString()
      }
      this.saveToLocalStorage()
    },

    /**
     * 撤回至银行活期
     * @param {string} id
     * @param {number} withdrawAmount 到账金额
     * @param {string} bankId
     * @param {number|null} reducePrincipal 冲减本金，默认 min(本金, 撤回额)
     */
    withdrawToBank(id, withdrawAmount, bankId, reducePrincipal = null) {
      this._requireBank(bankId)
      const stock = this._find(id)
      const plan = planWithdraw(stock.investedPrincipal, withdrawAmount, reducePrincipal)

      const bank = useBankAccountsStore()
      bank.adjustDemandBalance(bankId, plan.withdrawAmount, {
        type: 'withdraw_stock',
        note: `股票撤回 ${stock.name} · 冲减本金 ${plan.reducePrincipal} · 盈亏 ${plan.realizedPnl}`
      })

      stock.investedPrincipal = plan.nextPrincipal
      // 撤回后若本金归零，市值可顺手清零（可选）
      if (plan.nextPrincipal <= 0) {
        stock.currentValue = 0
      }
      stock.updatedAt = new Date().toISOString()
      this.saveToLocalStorage()
      return plan
    },

    rename(id, name) {
      const stock = this._find(id)
      const n = String(name || '').trim()
      if (!n) throw new Error('名称不能为空')
      stock.name = n
      stock.updatedAt = new Date().toISOString()
      this.saveToLocalStorage()
    },

    // —— 兼容旧 API ——
    addStock(name, currentValue, accountBalance, shares = null) {
      const stock = StockInvestment.create(name, currentValue, accountBalance, shares)
      this.stocks.push(stock)
      this.saveToLocalStorage()
      return stock.id
    },

    updateStock(id, currentValue, accountBalance, shares = null) {
      const index = this.stocks.findIndex(s => s.id === id)
      if (index > -1) {
        this.stocks[index].update(currentValue, accountBalance, shares)
        this.saveToLocalStorage()
      }
    },

    removeStock(id) {
      const index = this.stocks.findIndex(s => s.id === id)
      if (index > -1) {
        this.stocks.splice(index, 1)
        this.saveToLocalStorage()
      }
    },

    loadFromLocalStorage() {
      const stocks = localStorage.getItem(STORAGE_KEYS.STOCK_INVESTMENTS)
      if (stocks) {
        const parsed = JSON.parse(stocks)
        this.stocks = parsed.map(s => Object.assign(new StockInvestment(), s))
      }
    },

    saveToLocalStorage() {
      localStorage.setItem(
        STORAGE_KEYS.STOCK_INVESTMENTS,
        JSON.stringify(this.stocks)
      )
    },

    clearAllStocks() {
      this.stocks = []
      this.saveToLocalStorage()
    },

    replaceFromOpening(items = []) {
      const list = Array.isArray(items) ? items : []
      this.stocks = list
        .filter(item => item && String(item.name || '').trim())
        .map(item => {
          const principal = Number(item.investedPrincipal) || 0
          const mv = Number(item.currentValue) || 0
          return StockInvestment.create(
            String(item.name).trim(),
            mv,
            principal,
            null,
            principal
          )
        })
      this.saveToLocalStorage()
    }
  }
})
