import { defineStore } from 'pinia'
import Transaction from '../models/Transaction.js'
import Category from '../models/Category.js'
import MonthlyFinance from '../models/MonthlyFinance.js'

export const useFinanceStore = defineStore('finance', {
  state: () => ({
    transactions: [],
    categories: Category.getDefaultCategories(),
    monthlyFinances: [], // 月度财务记录
    currentMonth: MonthlyFinance.getCurrentMonth()
  }),

  getters: {
    // 获取所有收入
    incomeTransactions: (state) => state.transactions.filter(t => t.type === 'income'),
    // 获取所有支出
    expenseTransactions: (state) => state.transactions.filter(t => t.type === 'expense'),
    // 计算总收入
    totalIncome: (state) => state.transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0),
    // 计算总支出
    totalExpense: (state) => state.transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0),
    // 计算净收入
    netIncome: (state) => state.getters.totalIncome - state.getters.totalExpense,
    // 按分类分组的交易
    transactionsByCategory: (state) => {
      const result = {}
      state.categories.forEach(category => {
        result[category.id] = state.transactions.filter(t => t.category === category.id)
      })
      return result
    },

    // 月度财务相关
    currentMonthFinance: (state) => {
      return state.monthlyFinances.find(mf => mf.month === state.currentMonth) ||
             new MonthlyFinance(state.currentMonth, 0, 0, 0)
    },

    monthlyFinancesByMonth: (state) => {
      return [...state.monthlyFinances].sort((a, b) => b.month.localeCompare(a.month))
    },

    totalCumulativeNet: (state) => {
      const sorted = [...state.monthlyFinances].sort((a, b) => a.month.localeCompare(b.month))
      return sorted.length > 0 ? sorted[sorted.length - 1].cumulativeNet : 0
    }
  },

  actions: {
    // 添加交易
    addTransaction(type, amount, category, description) {
      const transaction = Transaction.create(type, amount, category, description)
      this.transactions.push(transaction)
      this.saveToLocalStorage()
    },

    // 删除交易
    removeTransaction(id) {
      const index = this.transactions.findIndex(t => t.id === id)
      if (index > -1) {
        this.transactions.splice(index, 1)
        this.saveToLocalStorage()
      }
    },

    // 添加分类
    addCategory(name, type, color) {
      const category = Category.create(name, type, color)
      this.categories.push(category)
      this.saveToLocalStorage()
    },

    // 删除分类
    removeCategory(id) {
      const index = this.categories.findIndex(c => c.id === id)
      if (index > -1) {
        this.categories.splice(index, 1)
        this.saveToLocalStorage()
      }
    },

    // 月度财务管理
    updateMonthlyFinance(month, income, expense) {
      const existingIndex = this.monthlyFinances.findIndex(mf => mf.month === month)
      const previousCumulative = this.getPreviousCumulative(month)

      if (existingIndex >= 0) {
        // 更新现有记录
        this.monthlyFinances[existingIndex].update(income, expense)
        this.monthlyFinances[existingIndex].calculateCumulative(previousCumulative)
      } else {
        // 创建新记录
        const monthlyFinance = new MonthlyFinance(month, income, expense, previousCumulative)
        monthlyFinance.calculateCumulative(previousCumulative)
        this.monthlyFinances.push(monthlyFinance)
      }

      this.saveToLocalStorage()
    },

    getPreviousCumulative(month) {
      const previousMonth = MonthlyFinance.getPreviousMonth(month)
      const previousFinance = this.monthlyFinances.find(mf => mf.month === previousMonth)
      return previousFinance ? previousFinance.cumulativeNet : 0
    },

    // 从本地存储加载数据
    loadFromLocalStorage() {
      const data = localStorage.getItem('finance-data')
      if (data) {
        const parsed = JSON.parse(data)
        this.transactions = parsed.transactions || []
        this.categories = parsed.categories || Category.getDefaultCategories()
        this.monthlyFinances = parsed.monthlyFinances || []
        this.currentMonth = parsed.currentMonth || MonthlyFinance.getCurrentMonth()
      }
    },

    // 保存到本地存储
    saveToLocalStorage() {
      const data = {
        transactions: this.transactions,
        categories: this.categories,
        monthlyFinances: this.monthlyFinances,
        currentMonth: this.currentMonth
      }
      localStorage.setItem('finance-data', JSON.stringify(data))
    }
  }
})