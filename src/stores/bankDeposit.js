import { defineStore } from 'pinia'
import BankDeposit from '../models/BankDeposit.js'

export const useBankDepositStore = defineStore('bankDeposit', {
  state: () => ({
    deposits: []
  }),

  getters: {
    // 总存款金额
    totalDepositAmount: (state) => state.deposits.reduce((sum, deposit) => sum + deposit.amount, 0),

    // 总预期利息
    totalExpectedInterest: (state) => state.deposits.reduce((sum, deposit) => sum + deposit.maturityInterest, 0),

    // 即将到期的存款（30天内）
    maturingDeposits: (state) => state.deposits.filter(deposit => deposit.isMaturingSoon()),

    // 已到期的存款
    maturedDeposits: (state) => state.deposits.filter(deposit => deposit.isMatured()),

    // 按到期时间排序的存款
    depositsByMaturity: (state) => {
      return [...state.deposits].sort((a, b) => new Date(a.maturityDate) - new Date(b.maturityDate))
    },

    // 按银行分组的存款
    depositsByBank: (state) => {
      const result = {}
      state.deposits.forEach(deposit => {
        const bank = deposit.productName.split(/[0-9]/)[0] // 提取银行名称
        if (!result[bank]) result[bank] = []
        result[bank].push(deposit)
      })
      return result
    }
  },

  actions: {
    // 添加存款
    addDeposit(productName, maturityDate, amount, interestRate, term, maturityInterest, notes) {
      const deposit = BankDeposit.create(productName, maturityDate, amount, interestRate, term, maturityInterest, notes)
      this.deposits.push(deposit)
      this.saveToLocalStorage()
      return deposit.id // 返回存款ID
    },

    // 更新存款
    updateDeposit(id, updates) {
      const index = this.deposits.findIndex(d => d.id === id)
      if (index > -1) {
        Object.assign(this.deposits[index], updates)
        this.saveToLocalStorage()
      }
    },

    // 删除存款
    removeDeposit(id) {
      const index = this.deposits.findIndex(d => d.id === id)
      if (index > -1) {
        this.deposits.splice(index, 1)
        this.saveToLocalStorage()
      }
    },

    // 从CSV导入存款
    importFromCSV(csvContent) {
      try {
        const lines = csvContent.trim().split('\n')

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line) continue

          const values = this.parseCSVLine(line)
          if (values.length >= 8) {
            const deposit = BankDeposit.fromCSV(values)
            // 检查是否已存在（通过产品名称和到期时间判断）
            const existingIndex = this.deposits.findIndex(d =>
              d.productName === deposit.productName &&
              d.maturityDate === deposit.maturityDate
            )

            if (existingIndex === -1) {
              this.deposits.push(deposit)
            } else {
              // 更新现有记录
              Object.assign(this.deposits[existingIndex], deposit)
            }
          }
        }

        this.saveToLocalStorage()
        return { success: true, imported: this.deposits.length }
      } catch (error) {
        console.error('CSV导入失败:', error)
        return { success: false, error: error.message }
      }
    },

    // 更健壮的CSV行解析方法
    parseCSVLine(line) {
      const result = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }

      // 添加最后一个字段
      result.push(current.trim());

      return result;
    },

    // 从本地存储加载数据
    loadFromLocalStorage() {
      const deposits = localStorage.getItem('bank-deposits')
      if (deposits) {
        const parsed = JSON.parse(deposits)
        // 重新创建BankDeposit对象以恢复方法
        this.deposits = parsed.map(d => Object.assign(new BankDeposit(), d))
      }
    },

    // 保存到本地存储
    saveToLocalStorage() {
      localStorage.setItem('bank-deposits', JSON.stringify(this.deposits))
    },

    // 清空所有存款
    clearAllDeposits() {
      this.deposits = []
      this.saveToLocalStorage()
    }
  }
})
