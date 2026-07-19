/**
 * 资金转换状态管理
 * 使用 Pinia 管理资金转换相关的数据和操作
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import FundTransfer from '../models/FundTransfer.js'
import { useFinanceStore } from './finance.js'

export const useFundTransferStore = defineStore('fundTransfer', () => {
  // 状态
  const transfers = ref([])
  const loading = ref(false)

  // 计算属性
  const transferHistory = computed(() => {
    return transfers.value
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(transfer => ({
        ...transfer,
        fromLabel: transfer.getAssetTypeLabel(transfer.fromType),
        toLabel: transfer.getAssetTypeLabel(transfer.toType),
        typeLabel: transfer.getTransferTypeLabel()
      }))
  })

  const totalTransferAmount = computed(() => {
    return transfers.value.reduce((sum, transfer) => sum + transfer.amount, 0)
  })

  // 方法
  const loadTransfers = () => {
    try {
      const stored = localStorage.getItem('fundTransfers')
      if (stored) {
        const data = JSON.parse(stored)
        transfers.value = data.map(item => FundTransfer.fromJSON(item))
      }
    } catch (error) {
      console.error('加载资金转换记录失败:', error)
      transfers.value = []
    }
  }

  const saveTransfers = () => {
    try {
      const data = transfers.value.map(transfer => transfer.toJSON())
      localStorage.setItem('fundTransfers', JSON.stringify(data))
    } catch (error) {
      console.error('保存资金转换记录失败:', error)
      throw error
    }
  }

  const addTransfer = (transferData) => {
    try {
      const transfer = new FundTransfer(transferData)
      const validation = transfer.validate()
      
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '))
      }

      transfers.value.push(transfer)
      saveTransfers()
      
      console.log('✅ 资金转换记录已添加:', transfer)
      return transfer
    } catch (error) {
      console.error('添加资金转换记录失败:', error)
      throw error
    }
  }

  const performTransfer = async (transferData) => {
    loading.value = true
    let ledgerApplied = null // 'allocate' | 'deallocate' | null

    try {
      const financeStore = useFinanceStore()
      const payload = {
        fromType: transferData.fromType,
        toType: transferData.toType,
        amount: transferData.amount,
        description: transferData.description || '',
        transferType: transferData.transferType || 'manual',
        relatedRecordId: transferData.relatedRecordId,
        date: transferData.date || new Date().toISOString()
      }

      // 1. 先校验记录结构，避免账本已改但历史写入失败
      const preview = new FundTransfer(payload)
      const validation = preview.validate()
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '))
      }

      // 2. 资金池余额
      if (payload.fromType === 'cash_pool') {
        const balanceCheck = financeStore.checkCashPoolBalance(payload.amount)
        if (!balanceCheck.sufficient) {
          throw new Error(
            `资金池余额不足，当前余额：¥${balanceCheck.available.toFixed(2)}，需要：¥${balanceCheck.required.toFixed(2)}`
          )
        }
      }

      // 3. 更新已分配账本
      if (payload.fromType === 'cash_pool') {
        financeStore.allocateFunds(payload.toType, payload.amount)
        ledgerApplied = 'allocate'
      } else if (payload.toType === 'cash_pool') {
        financeStore.deallocateFunds(payload.fromType, payload.amount)
        ledgerApplied = 'deallocate'
      }

      // 4. 写入转换历史
      let transfer
      try {
        transfer = addTransfer(payload)
      } catch (historyError) {
        // 回滚账本，避免「扣了池子却没有流水」
        if (ledgerApplied === 'allocate') {
          financeStore.deallocateFunds(payload.toType, payload.amount)
        } else if (ledgerApplied === 'deallocate') {
          financeStore.allocateFunds(payload.fromType, payload.amount)
        }
        throw historyError
      }

      return {
        success: true,
        transfer,
        message: '资金转换成功'
      }
    } catch (error) {
      console.error('资金转换失败:', error)
      return {
        success: false,
        error: error.message,
        message: error.message || '资金转换失败'
      }
    } finally {
      loading.value = false
    }
  }

  const getTransfersByAsset = (assetType, recordId = null) => {
    return transfers.value.filter(transfer => {
      const matchesType = transfer.fromType === assetType || transfer.toType === assetType
      const matchesRecord = recordId ? transfer.relatedRecordId === recordId : true
      return matchesType && matchesRecord
    })
  }

  const deleteTransfer = (transferId) => {
    try {
      const index = transfers.value.findIndex(t => t.id === transferId)
      if (index > -1) {
        transfers.value.splice(index, 1)
        saveTransfers()
        console.log('✅ 资金转换记录已删除:', transferId)
        return true
      }
      return false
    } catch (error) {
      console.error('删除资金转换记录失败:', error)
      throw error
    }
  }

  const clearAllTransfers = () => {
    transfers.value = []
    localStorage.removeItem('fundTransfers')
    console.log('✅ 所有资金转换记录已清除')
  }

  // 初始化
  loadTransfers()

  // 兼容别名：保持旧组件 executeTransfer(...) 可用
  const executeTransfer = (transferData) => {
    return performTransfer(transferData)
  }

  return {
    // 状态
    transfers,
    loading,
    
    // 计算属性
    transferHistory,
    totalTransferAmount,
    
    // 方法
    loadTransfers,
    saveTransfers,
    addTransfer,
    performTransfer,
    executeTransfer,
    getTransfersByAsset,
    deleteTransfer,
    clearAllTransfers
  }
})
