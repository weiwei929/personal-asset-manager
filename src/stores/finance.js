import { defineStore } from 'pinia'
import Transaction from '../models/Transaction.js'
import Category from '../models/Category.js'

export const useFinanceStore = defineStore('finance', {
  state: () => ({
    transactions: [],
    categories: Category.getDefaultCategories(),
    monthlyFinances: [] // 添加月度财务数组
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
    netIncome: (state) => {
      const income = state.transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0)
      const expense = state.transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)
      return income - expense
    },
    // 按分类分组的交易
    transactionsByCategory: (state) => {
      const result = {}
      state.categories.forEach(category => {
        result[category.id] = state.transactions.filter(t => t.category === category.id)
      })
      return result
    },

    // 月度财务相关计算属性
    currentMonthFinance: (state) => {
      const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
      const monthlyFinance = state.monthlyFinances.find(mf => mf.month === currentMonth)
      return monthlyFinance || { income: 0, expense: 0, netIncome: 0 }
    },

    monthlyFinancesByMonth: (state) => {
      return state.monthlyFinances.sort((a, b) => b.month.localeCompare(a.month))
    },

    totalCumulativeNet: (state) => {
      return state.monthlyFinances.reduce((sum, mf) => sum + (mf.income - mf.expense), 0)
    },

    // 资金转换相关计算属性
    getCurrentMonthWithTransfers: (state) => {
      const currentMonth = new Date().toISOString().slice(0, 7)
      const monthlyFinance = state.monthlyFinances.find(mf => mf.month === currentMonth)
      if (!monthlyFinance) return null
      
      // 这里需要从fundTransferStore获取转换记录，暂时返回基础信息
      return {
        ...monthlyFinance,
        allocatedAmount: 0, // 将通过组件中调用fundTransferStore计算
        availableAmount: monthlyFinance.income - monthlyFinance.expense // 基础可用金额
      }
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

    // 更新月度财务
    updateMonthlyFinance(month, income, expense) {
      const index = this.monthlyFinances.findIndex(mf => mf.month === month)
      const monthlyFinance = {
        month,
        income,
        expense,
        netIncome: income - expense,
        cumulativeNet: 0 // 将在计算中更新
      }

      if (index > -1) {
        this.monthlyFinances[index] = monthlyFinance
      } else {
        this.monthlyFinances.push(monthlyFinance)
      }

      // 重新计算累积净收入
      this.recalculateCumulativeNet()
      this.saveToLocalStorage()
    },

    // 重新计算累积净收入
    recalculateCumulativeNet() {
      const sortedFinances = this.monthlyFinances.sort((a, b) => a.month.localeCompare(b.month))
      let cumulative = 0
      
      sortedFinances.forEach(mf => {
        cumulative += mf.netIncome
        mf.cumulativeNet = cumulative
      })
    },

    // 从本地存储加载数据
    loadFromLocalStorage() {
      const transactions = localStorage.getItem('finance-transactions')
      const categories = localStorage.getItem('finance-categories')
      const monthlyFinances = localStorage.getItem('finance-monthly')

      if (transactions) {
        this.transactions = JSON.parse(transactions)
      }
      if (categories) {
        this.categories = JSON.parse(categories)
      }
      if (monthlyFinances) {
        this.monthlyFinances = JSON.parse(monthlyFinances)
      }
    },

    // 保存到本地存储
    saveToLocalStorage() {
      localStorage.setItem('finance-transactions', JSON.stringify(this.transactions))
      localStorage.setItem('finance-categories', JSON.stringify(this.categories))
      localStorage.setItem('finance-monthly', JSON.stringify(this.monthlyFinances))
    }
  }
})