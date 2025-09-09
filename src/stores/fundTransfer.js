/**
 * 资金转换状态管理
 * 使用 Pinia 管理资金转换相关的数据和操作
 */

import { defineStore } from 'pinia'
import FundTransfer from '../models/FundTransfer.js'

export const useFundTransferStore = defineStore('fundTransfer', {
  state: () => ({
    transfers: [], // 所有转换记录
    loading: false,
    error: null
  }),

  getters: {
    /**
     * 获取指定月份的转换记录
     */
    getTransfersByMonth: (state) => (month) => {
      return state.transfers.filter(transfer => transfer.month === month)
    },

    /**
     * 获取指定年份的转换记录
     */
    getTransfersByYear: (state) => (year) => {
      return state.transfers.filter(transfer => transfer.year === year)
    },

    /**
     * 获取指定月份的总转换金额
     */
    getTotalTransferredByMonth: (state) => (month) => {
      return state.transfers
        .filter(transfer => transfer.month === month && transfer.status === 'completed')
        .reduce((sum, transfer) => sum + transfer.amount, 0)
    },

    /**
     * 获取按目标类型分组的转换统计
     */
    getTransferStatsByType: (state) => (month) => {
      const monthTransfers = state.transfers.filter(
        transfer => transfer.month === month && transfer.status === 'completed'
      )
      
      const stats = {}
      monthTransfers.forEach(transfer => {
        if (!stats[transfer.toType]) {
          stats[transfer.toType] = 0
        }
        stats[transfer.toType] += transfer.amount
      })
      
      return stats
    },

    /**
     * 获取最近的转换记录
     */
    getRecentTransfers: (state) => (limit = 10) => {
      return [...state.transfers]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit)
    }
  },

  actions: {
    /**
     * 从本地存储加载数据
     */
    loadFromLocalStorage() {
      try {
        const stored = localStorage.getItem('fundTransfers')
        if (stored) {
          const data = JSON.parse(stored)
          this.transfers = data.map(item => FundTransfer.fromJSON(item))
        }
      } catch (error) {
        console.error('加载资金转换数据失败:', error)
        this.error = '加载数据失败'
      }
    },

    /**
     * 保存到本地存储
     */
    saveToLocalStorage() {
      try {
        const data = this.transfers.map(transfer => transfer.toJSON())
        localStorage.setItem('fundTransfers', JSON.stringify(data))
      } catch (error) {
        console.error('保存资金转换数据失败:', error)
        this.error = '保存数据失败'
      }
    },

    /**
     * 添加新的转换记录
     */
    async addTransfer(transferData) {
      try {
        this.loading = true
        this.error = null

        // 创建转换记录
        const transfer = new FundTransfer(transferData)
        
        // 验证数据
        const validation = transfer.validate()
        if (!validation.isValid) {
          throw new Error(validation.errors.join(', '))
        }

        // 添加到列表
        this.transfers.push(transfer)
        
        // 保存到本地存储
        this.saveToLocalStorage()
        
        return transfer
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 更新转换记录
     */
    async updateTransfer(id, updateData) {
      try {
        this.loading = true
        this.error = null

        const index = this.transfers.findIndex(t => t.id === id)
        if (index === -1) {
          throw new Error('转换记录不存在')
        }

        // 更新数据
        Object.assign(this.transfers[index], updateData)
        
        // 验证更新后的数据
        const validation = this.transfers[index].validate()
        if (!validation.isValid) {
          throw new Error(validation.errors.join(', '))
        }

        // 保存到本地存储
        this.saveToLocalStorage()
        
        return this.transfers[index]
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 删除转换记录
     */
    async deleteTransfer(id) {
      try {
        this.loading = true
        this.error = null

        const index = this.transfers.findIndex(t => t.id === id)
        if (index === -1) {
          throw new Error('转换记录不存在')
        }

        // 从列表中移除
        this.transfers.splice(index, 1)
        
        // 保存到本地存储
        this.saveToLocalStorage()
        
        return true
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 取消转换记录
     */
    async cancelTransfer(id) {
      await this.updateTransfer(id, { status: 'cancelled' })
      return true
    },

    /**
     * 清除错误信息
     */
    clearError() {
      this.error = null
    }
  }
})
