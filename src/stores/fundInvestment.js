import { defineStore } from 'pinia'
import FundProduct from '../models/FundProduct.js'
import { useBankAccountsStore } from './bankAccounts.js'
import { planInvest, planWithdraw } from '../utils/investmentOps.js'
import { isValidBankId } from '../constants/banks.js'
import { STORAGE_KEYS } from '../constants/storageKeys.js'

export const useFundInvestmentStore = defineStore('fundInvestment', {
  state: () => ({
    funds: []
  }),

  getters: {
    totalMarketValue: (state) =>
      state.funds.reduce((sum, f) => sum + (Number(f.currentValue) || 0), 0),

    totalAccountBalance: (state) =>
      state.funds.reduce((sum, f) => sum + (Number(f.accountBalance) || 0), 0),

    totalInvestedPrincipal: (state) =>
      state.funds.reduce((sum, f) => sum + (Number(f.investedPrincipal) || 0), 0),

    totalUnrealizedPnl() {
      return this.totalMarketValue - this.totalInvestedPrincipal
    },

    totalInvestmentAssets: (state) =>
      state.funds.reduce((sum, f) => {
        const total =
          typeof f.getTotalAssets === 'function'
            ? f.getTotalAssets()
            : (Number(f.currentValue) || 0) + (Number(f.accountBalance) || 0)
        return sum + total
      }, 0),

    fundCount: (state) => state.funds.length,

    fundsByValue: (state) =>
      [...state.funds].sort(
        (a, b) => (Number(b.currentValue) || 0) - (Number(a.currentValue) || 0)
      ),

    fundsByPrincipal: (state) =>
      [...state.funds].sort(
        (a, b) => (Number(b.investedPrincipal) || 0) - (Number(a.investedPrincipal) || 0)
      )
  },

  actions: {
    _find(id) {
      const fund = this.funds.find(f => f.id === id)
      if (!fund) throw new Error('未找到该基金')
      return fund
    },

    _requireBank(bankId) {
      if (!isValidBankId(bankId)) throw new Error('请选择银行活期')
    },

    investNew({ name, amount, bankId, currentValue = null, units = null }) {
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
        type: 'invest_fund',
        note: `基金投入 ${n}`
      })

      const mv = currentValue == null ? amt : Number(currentValue) || 0
      const fund = FundProduct.create(n, mv, amt, units, nextPrincipal)
      this.funds.push(fund)
      this.saveToLocalStorage()
      return fund.id
    },

    addPrincipal(id, amount, bankId) {
      this._requireBank(bankId)
      const fund = this._find(id)
      const { amount: amt, nextPrincipal } = planInvest(fund.investedPrincipal, amount)

      const bank = useBankAccountsStore()
      const acc = bank.accountById(bankId)
      if ((Number(acc?.demandBalance) || 0) < amt) {
        throw new Error(`活期不足：${acc?.name || bankId} 当前 ¥${acc?.demandBalance ?? 0}`)
      }

      bank.adjustDemandBalance(bankId, -amt, {
        type: 'invest_fund_add',
        note: `基金追加 ${fund.name}`
      })

      fund.investedPrincipal = nextPrincipal
      fund.updatedAt = new Date().toISOString()
      this.saveToLocalStorage()
      return { nextPrincipal, amount: amt }
    },

    updateMarketValue(id, currentValue, units = null) {
      const fund = this._find(id)
      if (typeof fund.updateMarketValue === 'function') {
        fund.updateMarketValue(currentValue, units)
      } else {
        fund.currentValue = Number(currentValue) || 0
        if (units !== null) fund.units = units
        fund.updatedAt = new Date().toISOString()
      }
      this.saveToLocalStorage()
    },

    withdrawToBank(id, withdrawAmount, bankId, reducePrincipal = null) {
      this._requireBank(bankId)
      const fund = this._find(id)
      const plan = planWithdraw(fund.investedPrincipal, withdrawAmount, reducePrincipal)

      const bank = useBankAccountsStore()
      bank.adjustDemandBalance(bankId, plan.withdrawAmount, {
        type: 'withdraw_fund',
        note: `基金撤回 ${fund.name} · 冲减本金 ${plan.reducePrincipal} · 盈亏 ${plan.realizedPnl}`
      })

      fund.investedPrincipal = plan.nextPrincipal
      if (plan.nextPrincipal <= 0) {
        fund.currentValue = 0
      }
      fund.updatedAt = new Date().toISOString()
      this.saveToLocalStorage()
      return plan
    },

    rename(id, name) {
      const fund = this._find(id)
      const n = String(name || '').trim()
      if (!n) throw new Error('名称不能为空')
      fund.name = n
      fund.updatedAt = new Date().toISOString()
      this.saveToLocalStorage()
    },

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
      const raw = localStorage.getItem(STORAGE_KEYS.FUND_INVESTMENTS)
      if (raw) {
        try {
          const parsed = JSON.parse(raw)
          this.funds = parsed.map(item => Object.assign(new FundProduct(), item))
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('加载基金数据失败', e)
          this.funds = []
        }
      }
    },

    saveToLocalStorage() {
      localStorage.setItem(
        STORAGE_KEYS.FUND_INVESTMENTS,
        JSON.stringify(this.funds)
      )
    },

    clearAllFunds() {
      this.funds = []
      this.saveToLocalStorage()
    },

    replaceFromOpening(items = []) {
      const list = Array.isArray(items) ? items : []
      this.funds = list
        .filter(item => item && String(item.name || '').trim())
        .map(item => {
          const principal = Number(item.investedPrincipal) || 0
          const mv = Number(item.currentValue) || 0
          return FundProduct.create(
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
