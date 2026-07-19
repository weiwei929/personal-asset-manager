import { defineStore } from 'pinia'
import FundProduct from '../models/FundProduct.js'

export const useFundInvestmentStore = defineStore('fundInvestment', {
  state: () => ({
    funds: []
  }),

  getters: {
    totalMarketValue: (state) =>
      state.funds.reduce((sum, f) => sum + (Number(f.currentValue) || 0), 0),

    totalAccountBalance: (state) =>
      state.funds.reduce((sum, f) => sum + (Number(f.accountBalance) || 0), 0),

    totalInvestmentAssets: (state) =>
      state.funds.reduce((sum, f) => {
        const total = typeof f.getTotalAssets === 'function'
          ? f.getTotalAssets()
          : (Number(f.currentValue) || 0) + (Number(f.accountBalance) || 0)
        return sum + total
      }, 0),

    fundCount: (state) => state.funds.length,

    fundsByValue: (state) => {
      return [...state.funds].sort(
        (a, b) => (Number(b.currentValue) || 0) - (Number(a.currentValue) || 0)
      )
    }
  },

  actions: {
    addFund(name, currentValue, accountBalance, units = null) {
      const fund = FundProduct.create(name, currentValue, accountBalance, units)
      this.funds.push(fund)
      this.saveToLocalStorage()
      return fund.id
    },

    updateFund(id, currentValue, accountBalance, units = null) {
      const index = this.funds.findIndex(f => f.id === id)
      if (index > -1) {
        if (typeof this.funds[index].update === 'function') {
          this.funds[index].update(currentValue, accountBalance, units)
        } else {
          this.funds[index].currentValue = currentValue
          this.funds[index].accountBalance = accountBalance
          if (units !== null) this.funds[index].units = units
        }
        this.saveToLocalStorage()
      }
    },

    removeFund(id) {
      const index = this.funds.findIndex(f => f.id === id)
      if (index > -1) {
        this.funds.splice(index, 1)
        this.saveToLocalStorage()
      }
    },

    loadFromLocalStorage() {
      const raw = localStorage.getItem('fund-investments')
      if (raw) {
        try {
          const parsed = JSON.parse(raw)
          this.funds = parsed.map(item => Object.assign(new FundProduct(), item))
        } catch (e) {
          console.error('加载基金数据失败', e)
          this.funds = []
        }
      }
    },

    saveToLocalStorage() {
      localStorage.setItem('fund-investments', JSON.stringify(this.funds))
    },

    clearAllFunds() {
      this.funds = []
      this.saveToLocalStorage()
    }
  }
})
