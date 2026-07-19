/**
 * 资金转换数据模型
 * 用于记录不同资产类型之间的资金流转
 */
class FundTransfer {
  constructor({
    id = null,
    fromType,
    toType,
    amount,
    description,
    transferType = 'manual',
    relatedRecordId = null,
    date = new Date().toISOString(),
    createdAt = null
  }) {
    // 反序列化时保留原 id，避免刷新后历史记录 ID 全变
    this.id = id || (Date.now().toString() + Math.random().toString(36).substr(2, 9))
    this.fromType = fromType // cash_pool, bank_deposit, stock_investment, lent_money
    this.toType = toType
    this.amount = parseFloat(amount) || 0
    this.description = description || ''
    this.transferType = transferType // manual, maturity, sell, return, reverse
    this.relatedRecordId = relatedRecordId // 关联的资产记录ID
    this.date = date
    this.createdAt = createdAt || new Date().toISOString()
  }

  /**
   * 验证数据完整性
   */
  validate() {
    const errors = []
    
    if (!this.fromType) errors.push('转出类型不能为空')
    if (!this.toType) errors.push('转入类型不能为空')
    if (this.amount <= 0) errors.push('转换金额必须大于0')
    if (!this.description) errors.push('转换描述不能为空')
    
    const validTypes = ['cash_pool', 'bank_deposit', 'stock_investment', 'fund_investment', 'lent_money']
    if (!validTypes.includes(this.fromType)) errors.push('无效的转出类型')
    if (!validTypes.includes(this.toType)) errors.push('无效的转入类型')
    
    const validTransferTypes = ['manual', 'maturity', 'sell', 'return', 'reverse', 'redeem']
    if (!validTransferTypes.includes(this.transferType)) errors.push('无效的转换类型')
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 获取转换类型的中文描述
   */
  getTransferTypeLabel() {
    const labels = {
      manual: '手动转换',
      maturity: '到期变现',
      sell: '卖出变现',
      redeem: '基金赎回',
      return: '借款收回',
      reverse: '撤销操作'
    }
    return labels[this.transferType] || '未知类型'
  }

  /**
   * 获取资产类型的中文描述
   */
  getAssetTypeLabel(type) {
    const labels = {
      cash_pool: '资金池',
      bank_deposit: '银行存款',
      stock_investment: '股票投资',
      fund_investment: '基金投资',
      lent_money: '借出资金'
    }
    return labels[type] || '未知类型'
  }

  /**
   * 序列化为JSON
   */
  toJSON() {
    return {
      id: this.id,
      fromType: this.fromType,
      toType: this.toType,
      amount: this.amount,
      description: this.description,
      transferType: this.transferType,
      relatedRecordId: this.relatedRecordId,
      date: this.date,
      createdAt: this.createdAt
    }
  }

  /**
   * 从JSON数据创建实例
   */
  static fromJSON(data) {
    return new FundTransfer(data)
  }

  /**
   * 创建资金分配转换记录
   */
  static createAllocation(toType, amount, description, relatedRecordId) {
    return new FundTransfer({
      fromType: 'cash_pool',
      toType,
      amount,
      description,
      transferType: 'manual',
      relatedRecordId
    })
  }

  /**
   * 创建资金回收转换记录
   */
  static createDeallocation(fromType, amount, description, transferType = 'manual', relatedRecordId) {
    return new FundTransfer({
      fromType,
      toType: 'cash_pool',
      amount,
      description,
      transferType,
      relatedRecordId
    })
  }
}

export default FundTransfer
