import { defineStore } from 'pinia'
import LentMoney from '../models/LentMoney.js'

export const useLentMoneyStore = defineStore('lentMoney', {
  state: () => ({
    lentRecords: []
  }),

  getters: {
    // 总借出金额
    totalLentAmount: (state) => state.lentRecords.reduce((sum, record) => sum + record.amount, 0),

    // 待还款金额
    pendingAmount: (state) => state.lentRecords
      .filter(record => record.status === 'pending')
      .reduce((sum, record) => sum + record.amount, 0),

    // 已还款金额
    returnedAmount: (state) => state.lentRecords
      .filter(record => record.status === 'returned')
      .reduce((sum, record) => sum + record.amount, 0),

    // 即将到期的借出记录（30天内）
    maturingRecords: (state) => state.lentRecords.filter(record => record.isMaturingSoon()),

    // 逾期的借出记录
    overdueRecords: (state) => state.lentRecords.filter(record => record.isOverdue()),

    // 按到期时间排序
    recordsByDueDate: (state) => {
      return [...state.lentRecords].sort((a, b) => {
        if (a.status === 'returned' && b.status === 'returned') return 0;
        if (a.status === 'returned') return 1;
        if (b.status === 'returned') return -1;
        return new Date(a.expectedReturnDate) - new Date(b.expectedReturnDate);
      });
    },

    // 按借出人分组
    recordsByBorrower: (state) => {
      const result = {};
      state.lentRecords.forEach(record => {
        if (!result[record.borrower]) {
          result[record.borrower] = [];
        }
        result[record.borrower].push(record);
      });
      return result;
    },

    // 统计信息
    statistics: (state) => ({
      totalRecords: state.lentRecords.length,
      pendingRecords: state.lentRecords.filter(r => r.status === 'pending').length,
      returnedRecords: state.lentRecords.filter(r => r.status === 'returned').length,
      maturingRecords: state.maturingRecords.length,
      overdueRecords: state.overdueRecords.length
    })
  },

  actions: {
    // 添加借出资金记录
    addLentRecord(borrower, amount, lendDate, expectedReturnDate, notes = '') {
      const record = LentMoney.create(borrower, amount, lendDate, expectedReturnDate, notes);
      this.lentRecords.push(record);
      this.saveToLocalStorage();
    },

    // 更新借出资金记录
    updateLentRecord(id, borrower, amount, lendDate, expectedReturnDate, notes) {
      const index = this.lentRecords.findIndex(r => r.id === id);
      if (index > -1) {
        this.lentRecords[index].update(borrower, amount, lendDate, expectedReturnDate, notes);
        this.saveToLocalStorage();
      }
    },

    // 标记为已还款
    markAsReturned(id, actualReturnDate = null) {
      const index = this.lentRecords.findIndex(r => r.id === id);
      if (index > -1) {
        this.lentRecords[index].markAsReturned(actualReturnDate);
        this.saveToLocalStorage();
      }
    },

    // 删除借出资金记录
    removeLentRecord(id) {
      const index = this.lentRecords.findIndex(r => r.id === id);
      if (index > -1) {
        this.lentRecords.splice(index, 1);
        this.saveToLocalStorage();
      }
    },

    // 从本地存储加载数据
    loadFromLocalStorage() {
      const records = localStorage.getItem('lent-money-records');
      if (records) {
        const parsed = JSON.parse(records);
        // 重新创建LentMoney对象以恢复方法
        this.lentRecords = parsed.map(r => Object.assign(new LentMoney(), r));
      }
    },

    // 保存到本地存储
    saveToLocalStorage() {
      localStorage.setItem('lent-money-records', JSON.stringify(this.lentRecords));
    },

    // 清空所有记录
    clearAllRecords() {
      this.lentRecords = [];
      this.saveToLocalStorage();
    }
  }
});