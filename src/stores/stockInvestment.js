import { defineStore } from 'pinia'
import StockInvestment from '../models/StockInvestment.js'

export const useStockInvestmentStore = defineStore('stockInvestment', {
  state: () => ({
    stocks: []
  }),

  getters: {
    // 总市值
    totalMarketValue: (state) => state.stocks.reduce((sum, stock) => sum + stock.currentValue, 0),

    // 总账户余额
    totalAccountBalance: (state) => state.stocks.reduce((sum, stock) => sum + stock.accountBalance, 0),

    // 总投资资产
    totalInvestmentAssets: (state) => state.stocks.reduce((sum, stock) => sum + stock.getTotalAssets(), 0),

    // 股票数量
    stockCount: (state) => state.stocks.length,

    // 按市值排序
    stocksByValue: (state) => {
      return [...state.stocks].sort((a, b) => b.currentValue - a.currentValue)
    },

    // 市值占比
    stockValueDistribution: (state) => {
      const total = state.getters.totalMarketValue;
      if (total === 0) return [];

      return state.stocks.map(stock => ({
        name: stock.name,
        value: stock.currentValue,
        percentage: ((stock.currentValue / total) * 100).toFixed(1)
      })).sort((a, b) => b.value - a.value);
    }
  },

  actions: {
    // 添加股票投资
    addStock(name, currentValue, accountBalance, shares = null) {
      const stock = StockInvestment.create(name, currentValue, accountBalance, shares);
      this.stocks.push(stock);
      this.saveToLocalStorage();
    },

    // 更新股票投资
    updateStock(id, currentValue, accountBalance, shares = null) {
      const index = this.stocks.findIndex(s => s.id === id);
      if (index > -1) {
        this.stocks[index].update(currentValue, accountBalance, shares);
        this.saveToLocalStorage();
      }
    },

    // 删除股票投资
    removeStock(id) {
      const index = this.stocks.findIndex(s => s.id === id);
      if (index > -1) {
        this.stocks.splice(index, 1);
        this.saveToLocalStorage();
      }
    },

    // 从本地存储加载数据
    loadFromLocalStorage() {
      const stocks = localStorage.getItem('stock-investments');
      if (stocks) {
        const parsed = JSON.parse(stocks);
        // 重新创建StockInvestment对象以恢复方法
        this.stocks = parsed.map(s => Object.assign(new StockInvestment(), s));
      }
    },

    // 保存到本地存储
    saveToLocalStorage() {
      localStorage.setItem('stock-investments', JSON.stringify(this.stocks));
    },

    // 清空所有股票投资
    clearAllStocks() {
      this.stocks = [];
      this.saveToLocalStorage();
    }
  }
});