/**
 * 资金转换记录模型
 * 用于追踪不同资产类型之间的资金流转
 */

class FundTransfer {
  constructor(data = {}) {
    this.id = data.id || this.generateId()
    this.fromType = data.fromType || '' // 'net-income' | 'bank-deposit' | 'stock' | 'lent-money'
    this.toType = data.toType || ''     // 'bank-deposit' | 'stock' | 'lent-money'
    this.amount = data.amount || 0
    this.date = data.date ? new Date(data.date) : new Date()
    this.month = data.month || this.formatMonth(this.date)
    this.year = data.year || this.date.getFullYear()
    this.description = data.description || ''
    this.status = data.status || 'completed' // 'completed' | 'cancelled'
    this.relatedRecordId = data.relatedRecordId || null // 关联的具体记录ID
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return 'transfer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  /**
   * 格式化月份为 YYYY-MM 格式
   */
  formatMonth(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  }

  /**
   * 获取转换类型的显示名称
   */
  static getTypeDisplayName(type) {
    const typeNames = {
      'net-income': '月度净收入',
      'bank-deposit': '银行存款',
      'stock': '股票投资',
      'lent-money': '借出资金'
    }
    return typeNames[type] || type
  }

  /**
   * 获取转换的显示描述
   */
  getDisplayDescription() {
    const fromName = FundTransfer.getTypeDisplayName(this.fromType)
    const toName = FundTransfer.getTypeDisplayName(this.toType)
    return `从 ${fromName} 转入 ${toName}`
  }

  /**
   * 验证转换数据的有效性
   */
  validate() {
    const errors = []
    
    if (!this.fromType) {
      errors.push('来源资金类型不能为空')
    }
    
    if (!this.toType) {
      errors.push('目标资金类型不能为空')
    }
    
    if (this.fromType === this.toType) {
      errors.push('来源和目标资金类型不能相同')
    }
    
    if (!this.amount || this.amount <= 0) {
      errors.push('转换金额必须大于0')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 转换为存储格式
   */
  toJSON() {
    return {
      id: this.id,
      fromType: this.fromType,
      toType: this.toType,
      amount: this.amount,
      date: this.date.toISOString(),
      month: this.month,
      year: this.year,
      description: this.description,
      status: this.status,
      relatedRecordId: this.relatedRecordId
    }
  }

  /**
   * 从JSON数据创建实例
   */
  static fromJSON(data) {
    return new FundTransfer(data)
  }
}

export default FundTransfer
