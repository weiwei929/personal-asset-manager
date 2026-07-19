import { defineStore } from 'pinia'
import MonthlyFinance from '../models/MonthlyFinance.js'

/**
 * 月度财务 + 资金池。
 * 资金池公式：Σ净收入 − Σ已分配金额（跨月合计）。
 * 注意：Pinia options getter 若用箭头函数，不能通过 state.xxx 访问其它 getter。
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
        const net = typeof mf.netIncome === 'number'
          ? mf.netIncome
          : (Number(mf.income) || 0) - (Number(mf.expense) || 0)
        return sum + net
      }, 0)
    },

    totalAllocatedAmount: (state) => {
      return state.monthlyFinances.reduce((sum, mf) => {
        const allocated = mf.allocated_amounts || {}
        return sum + Object.values(allocated).reduce((a, b) => a + (Number(b) || 0), 0)
      }, 0)
    },

    // 必须用普通函数 + this，才能组合其它 getter
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
        ? (typeof current.netIncome === 'number'
          ? current.netIncome
          : (Number(current.income) || 0) - (Number(current.expense) || 0))
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

    transferReminder() {
      const pool = this.cashPool
      const remaining = 50000 - pool
      return {
        canTransfer: pool >= 50000,
        remaining: Math.max(0, remaining),
        progress: Math.min(100, (pool / 50000) * 100)
      }
    }
  },

  actions: {
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
        // 确保 allocated_amounts 存在
        if (!row.allocated_amounts) {
          row.allocated_amounts = {}
        }
      } else {
        this.monthlyFinances.push(new MonthlyFinance(month, incomeNum, expenseNum))
      }

      this.saveToLocalStorage()
    },

    loadFromLocalStorage() {
      try {
        const data = localStorage.getItem('monthlyFinances')
        if (data) {
          const parsed = JSON.parse(data)
          this.monthlyFinances = parsed.map(item => {
            const mf = Object.assign(new MonthlyFinance(item.month || item.id, 0, 0), item)
            // 纠正历史数据中 netIncome 与 income/expense 不一致
            const income = Number(mf.income) || 0
            const expense = Number(mf.expense) || 0
            mf.netIncome = income - expense
            if (!mf.allocated_amounts || typeof mf.allocated_amounts !== 'object') {
              mf.allocated_amounts = {}
            }
            return mf
          })
        }
      } catch (error) {
        console.error('加载月度财务数据失败:', error)
        this.monthlyFinances = []
      }
    },

    saveToLocalStorage() {
      try {
        localStorage.setItem('monthlyFinances', JSON.stringify(this.monthlyFinances))
      } catch (error) {
        console.error('保存月度财务数据失败:', error)
      }
    },

    clearAllData() {
      this.monthlyFinances = []
      this.saveToLocalStorage()
    },

    /**
     * 将金额记入「已分配」（优先当前月，用于资金池扣减）
     */
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

    /**
     * 从「已分配」释放金额回资金池（跨月查找该类型的分配记录）
     */
    deallocateFundsFromMonth(sourceType, amount) {
      let remaining = Number(amount) || 0
      if (remaining <= 0) return

      const currentMonth = MonthlyFinance.getCurrentMonth()
      // 优先当前月，再其它月（新→旧）
      const ordered = [...this.monthlyFinances].sort((a, b) => {
        if (a.month === currentMonth) return -1
        if (b.month === currentMonth) return 1
        return String(b.month).localeCompare(String(a.month))
      })

      for (const monthlyFinance of ordered) {
        if (remaining <= 0) break
        if (!monthlyFinance.allocated_amounts) continue

        const currentAllocated = Number(monthlyFinance.allocated_amounts[sourceType]) || 0
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
     * 从资金池分配到资产类型（更新已分配账本）
     */
    allocateFunds(assetType, amount) {
      const amountNum = Number(amount) || 0
      const currentPool = this.cashPool
      if (currentPool < amountNum) {
        throw new Error(
          `资金池余额不足，当前余额：¥${currentPool.toFixed(2)}，需要：¥${amountNum.toFixed(2)}`
        )
      }

      this.allocateFundsToMonth(assetType, amountNum)
      return true
    },

    /**
     * 从资产类型回收到资金池
     */
    deallocateFunds(assetType, amount) {
      const amountNum = Number(amount) || 0
      this.deallocateFundsFromMonth(assetType, amountNum)
      return true
    },

    getAssetTypeLabel(type) {
      const labels = {
        cash_pool: '资金池',
        bank_deposit: '银行存款',
        stock_investment: '股票投资',
        lent_money: '借出资金'
      }
      return labels[type] || '未知类型'
    },

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
