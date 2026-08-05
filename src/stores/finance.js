import { defineStore } from 'pinia'
import MonthlyFinance from '../models/MonthlyFinance.js'
import { useBankAccountsStore } from './bankAccounts.js'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
import {
  computePostedEffects,
  diffPostedEffects,
  validateMonthForPosting,
  normalizeMonthRecord
} from '../utils/monthlyLedger.js'

/**
 * 月度财务（当前账 · 流量层）
 * - 收入明细 + 微信/支付宝/信用卡月小计
 * - 默认保存即入账：差额调整四行活期（bankAccounts）→ 总资产即时变
 * - postToDemand=false 仅作高级「补录对照」，正式路径不用
 * - 月度账单（结转报表）见 monthlyStatements store，不在此切割
 */
export const useFinanceStore = defineStore('finance', {
  state: () => ({
    monthlyFinances: [],
    loading: false,
    error: null
  }),

  getters: {
    totalCumulativeNet: (state) => {
      return state.monthlyFinances.reduce((sum, mf) => {
        const net =
          typeof mf.netIncome === 'number'
            ? mf.netIncome
            : (Number(mf.income) || 0) - (Number(mf.expense) || 0)
        return sum + net
      }, 0)
    },

    /**
     * @deprecated 旧「已分配」合计；一期主路径不读。总资产见 `useAssetsStore` / `assetTotals`。
     */
    totalAllocatedAmount: (state) => {
      return state.monthlyFinances.reduce((sum, mf) => {
        const allocated = mf.allocated_amounts || {}
        return (
          sum +
          Object.values(allocated).reduce((a, b) => a + (Number(b) || 0), 0)
        )
      }, 0)
    },

    /**
     * @deprecated 旧「资金池」= 累计净收入 − 已分配。
     * **不是**总资产，**不是**四行活期。UI 禁止展示为本期总资产。
     * 主路径可用现金 = `useAssetsStore().totalDemand`。
     */
    cashPool() {
      const totalNet = this.totalCumulativeNet
      const allocated = this.totalAllocatedAmount
      const pool = totalNet - allocated
      return Number.isFinite(pool) ? Math.max(0, pool) : 0
    },

    currentMonthNet: (state) => {
      const currentMonth = MonthlyFinance.getCurrentMonth()
      const current = state.monthlyFinances.find(mf => mf.month === currentMonth)
      const amount = current
        ? typeof current.netIncome === 'number'
          ? current.netIncome
          : (Number(current.income) || 0) - (Number(current.expense) || 0)
        : 0
      return {
        amount,
        month: currentMonth,
        displayMonth: MonthlyFinance.formatMonth(currentMonth)
      }
    },

    currentMonthLabel() {
      const monthData = this.currentMonthNet
      return `${monthData.displayMonth}净收入`
    },

    /**
     * @deprecated 依赖旧 cashPool；一期主路径不使用。
     */
    transferReminder() {
      const pool = this.cashPool
      const remaining = 50000 - pool
      return {
        canTransfer: pool >= 50000,
        remaining: Math.max(0, remaining),
        progress: Math.min(100, (pool / 50000) * 100)
      }
    },

    monthById: (state) => (month) =>
      state.monthlyFinances.find(mf => mf.month === month) || null
  },

  actions: {
    /**
     * 旧 API：只改总数，不联动活期（避免静默误入账）
     */
    updateMonthlyFinance(month, income, expense) {
      const incomeNum = Number(income) || 0
      const expenseNum = Number(expense) || 0
      const existingIndex = this.monthlyFinances.findIndex(mf => mf.month === month)

      if (existingIndex >= 0) {
        const row = this.monthlyFinances[existingIndex]
        if (typeof row.update === 'function') {
          row.update(incomeNum, expenseNum)
        } else {
          row.income = incomeNum
          row.expense = expenseNum
          row.netIncome = incomeNum - expenseNum
          row.updatedAt = new Date().toISOString()
        }
        if (!row.allocated_amounts) row.allocated_amounts = {}
      } else {
        this.monthlyFinances.push(new MonthlyFinance(month, incomeNum, expenseNum))
      }

      this.saveToLocalStorage()
    },

    /**
     * T4 主路径：保存明细；默认差额入账活期
     * @param {string} month YYYY-MM
     * @param {{
     *   incomes: Array,
     *   channels: object,
     *   postToDemand?: boolean  // false=仅记流量不改活期（补历史、钱已在期初里）
     * }} detail
     * @returns {{ effects: object, applied: Array, totals: object, postToDemand: boolean }}
     */
    saveMonthWithLedger(month, detail = {}) {
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        throw new Error('月份格式应为 YYYY-MM')
      }

      const incomes = Array.isArray(detail.incomes) ? detail.incomes : []
      const channels = detail.channels || {}
      // 默认 true：建账后增量；补历史传 false
      // 注意：必须用 === true / === false，避免字符串等真值误判
      const postToDemand = detail.postToDemand === true
        ? true
        : detail.postToDemand === false
          ? false
          : true

      if (postToDemand) {
        const errors = validateMonthForPosting(incomes, channels)
        if (errors.length) {
          throw new Error(errors[0])
        }
      }

      const idx = this.monthlyFinances.findIndex(mf => mf.month === month)
      const prev = idx >= 0 ? this.monthlyFinances[idx] : null
      const oldEffects = (prev && prev.postedEffects) || {}

      let newEffects = {}
      let applied = []

      if (postToDemand) {
        // 入账活期：按差额调整
        newEffects = computePostedEffects(incomes, channels)
        applied = diffPostedEffects(oldEffects, newEffects)
        const bankStore = useBankAccountsStore()
        for (const { bankId, delta } of applied) {
          bankStore.adjustDemandBalance(bankId, delta, {
            type: 'monthly_ledger',
            month,
            note: `${month} 月度入账调整`
          })
        }
      } else {
        // 仅流量：绝对不碰活期（避免与「手工校正活期」叠加二次回滚）
        // postedEffects 清空，只保留流水；若曾入账过，活期请自行与实卡对齐
        newEffects = {}
        applied = []
      }

      // 勿展开 prev 的 income/expense：否则明细全 0 时会被 normalize 当成「旧总数」写回
      const record = normalizeMonthRecord(
        {
          month,
          incomes,
          channels,
          postedEffects: newEffects,
          flowOnly: !postToDemand,
          createdAt: prev?.createdAt,
          allocated_amounts: prev?.allocated_amounts,
          transfers: prev?.transfers,
          isArchived: prev?.isArchived
        },
        month
      )
      record.updatedAt = new Date().toISOString()
      if (!record.createdAt) record.createdAt = record.updatedAt
      record.flowOnly = !postToDemand
      record.postedEffects = { ...newEffects }

      const instance = MonthlyFinance.fromJSON(record)
      instance.flowOnly = !postToDemand
      instance.postedEffects = { ...newEffects }

      if (idx >= 0) {
        this.monthlyFinances[idx] = instance
      } else {
        this.monthlyFinances.push(instance)
      }

      this.saveToLocalStorage()

      return {
        effects: newEffects,
        applied,
        postToDemand,
        hadPriorPosting: Object.keys(oldEffects).length > 0,
        totals: {
          income: instance.income,
          expense: instance.expense,
          netIncome: instance.netIncome
        }
      }
    },

    /**
     * 显式回滚某月已入账的活期差额（与「仅流量」分离，避免误触）
     */
    unpostMonthFromDemand(month) {
      const idx = this.monthlyFinances.findIndex(mf => mf.month === month)
      if (idx < 0) throw new Error('没有该月记录')
      const row = this.monthlyFinances[idx]
      const oldEffects = row.postedEffects || {}
      const applied = diffPostedEffects(oldEffects, {})
      const bankStore = useBankAccountsStore()
      for (const { bankId, delta } of applied) {
        bankStore.adjustDemandBalance(bankId, delta, {
          type: 'monthly_ledger_unpost',
          month,
          note: `${month} 显式回滚月度入账`
        })
      }
      row.postedEffects = {}
      row.flowOnly = true
      row.updatedAt = new Date().toISOString()
      this.saveToLocalStorage()
      return { applied }
    },

    /**
     * 删除整月并回滚已入账活期
     */
    removeMonthWithLedger(month) {
      const idx = this.monthlyFinances.findIndex(mf => mf.month === month)
      if (idx < 0) return

      const row = this.monthlyFinances[idx]
      const oldEffects = row.postedEffects || {}
      const applied = diffPostedEffects(oldEffects, {})
      const bankStore = useBankAccountsStore()

      for (const { bankId, delta } of applied) {
        bankStore.adjustDemandBalance(bankId, delta, {
          type: 'monthly_ledger_revert',
          month,
          note: `${month} 删除月度记录回滚`
        })
      }

      this.monthlyFinances.splice(idx, 1)
      this.saveToLocalStorage()
    },

    loadFromLocalStorage() {
      try {
        const data = localStorage.getItem(STORAGE_KEYS.MONTHLY_FINANCES)
        if (data) {
          const parsed = JSON.parse(data)
          this.monthlyFinances = parsed.map(item =>
            MonthlyFinance.fromJSON(item)
          )
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('加载月度财务数据失败:', error)
        this.monthlyFinances = []
      }
    },

    saveToLocalStorage() {
      try {
        localStorage.setItem(
          STORAGE_KEYS.MONTHLY_FINANCES,
          JSON.stringify(this.monthlyFinances)
        )
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('保存月度财务数据失败:', error)
      }
    },

    clearAllData() {
      this.monthlyFinances = []
      this.saveToLocalStorage()
    },

    allocateFundsToMonth(targetType, amount) {
      const amountNum = Number(amount) || 0
      if (amountNum <= 0) return

      const currentMonth = MonthlyFinance.getCurrentMonth()
      let monthlyFinance = this.monthlyFinances.find(mf => mf.month === currentMonth)

      if (!monthlyFinance) {
        monthlyFinance = new MonthlyFinance(currentMonth, 0, 0)
        this.monthlyFinances.push(monthlyFinance)
      }

      if (!monthlyFinance.allocated_amounts) {
        monthlyFinance.allocated_amounts = {}
      }

      monthlyFinance.allocated_amounts[targetType] =
        (Number(monthlyFinance.allocated_amounts[targetType]) || 0) + amountNum
      monthlyFinance.updatedAt = new Date().toISOString()

      this.saveToLocalStorage()
    },

    deallocateFundsFromMonth(sourceType, amount) {
      let remaining = Number(amount) || 0
      if (remaining <= 0) return

      const currentMonth = MonthlyFinance.getCurrentMonth()
      const ordered = [...this.monthlyFinances].sort((a, b) => {
        if (a.month === currentMonth) return -1
        if (b.month === currentMonth) return 1
        return String(b.month).localeCompare(String(a.month))
      })

      for (const monthlyFinance of ordered) {
        if (remaining <= 0) break
        if (!monthlyFinance.allocated_amounts) continue

        const currentAllocated =
          Number(monthlyFinance.allocated_amounts[sourceType]) || 0
        if (currentAllocated <= 0) continue

        const deduct = Math.min(currentAllocated, remaining)
        monthlyFinance.allocated_amounts[sourceType] = currentAllocated - deduct
        remaining -= deduct

        if (monthlyFinance.allocated_amounts[sourceType] <= 0) {
          delete monthlyFinance.allocated_amounts[sourceType]
        }
        monthlyFinance.updatedAt = new Date().toISOString()
      }

      this.saveToLocalStorage()
    },

    /**
     * @deprecated 旧资金池分配；主路径已禁用（见 fundTransfer.performTransfer）。
     */
    allocateFunds(assetType, amount) {
      const amountNum = Number(amount) || 0
      const currentPool = this.cashPool
      if (currentPool < amountNum) {
        throw new Error(
          `可用账本余额不足，当前：¥${currentPool.toFixed(2)}，需要：¥${amountNum.toFixed(2)}`
        )
      }

      this.allocateFundsToMonth(assetType, amountNum)
      return true
    },

    /**
     * @deprecated 旧资金池回收；主路径已禁用。
     */
    deallocateFunds(assetType, amount) {
      const amountNum = Number(amount) || 0
      this.deallocateFundsFromMonth(assetType, amountNum)
      return true
    },

    getAssetTypeLabel(type) {
      const labels = {
        cash_pool: '可用现金(旧账本)',
        bank_deposit: '银行存款',
        stock_investment: '股票投资',
        fund_investment: '基金投资',
        lent_money: '借出资金'
      }
      return labels[type] || '未知类型'
    },

    /**
     * @deprecated 校验旧 cashPool；非四行活期。
     */
    checkCashPoolBalance(requiredAmount) {
      const available = this.cashPool
      const required = Number(requiredAmount) || 0
      return {
        sufficient: available >= required,
        available,
        required,
        shortage: Math.max(0, required - available)
      }
    }
  }
})
