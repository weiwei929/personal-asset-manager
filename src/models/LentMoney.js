// 借出款项：活期 ↔ 应收；利息归还可进活期
export default class LentMoney {
  constructor(
    id,
    borrower,
    amount,
    lendDate,
    expectedReturnDate,
    actualReturnDate = null,
    notes = '',
    extras = {}
  ) {
    this.id = id
    this.borrower = borrower
    this.amount = Number(amount) || 0 // 原始借出本金
    this.remainingAmount =
      extras.remainingAmount != null
        ? Number(extras.remainingAmount) || 0
        : this.amount // 未还本金
    this.lendDate = lendDate
    this.expectedReturnDate = expectedReturnDate
    this.actualReturnDate = actualReturnDate
    this.notes = notes || ''
    this.bankId = extras.bankId || null // 借出时扣款银行
    this.returnedPrincipal = Number(extras.returnedPrincipal) || 0
    this.interestReceived = Number(extras.interestReceived) || 0
    this.status =
      extras.status ||
      (actualReturnDate || this.remainingAmount <= 0 ? 'returned' : 'pending')
    this.createdAt = extras.createdAt || new Date().toISOString()
    this.updatedAt = extras.updatedAt || new Date().toISOString()
  }

  static create(
    borrower,
    amount,
    lendDate,
    expectedReturnDate,
    notes = '',
    extras = {}
  ) {
    const id =
      extras.id ||
      `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const amt = Number(amount) || 0
    return new LentMoney(
      id,
      borrower,
      amt,
      lendDate,
      expectedReturnDate,
      null,
      notes,
      {
        ...extras,
        remainingAmount: extras.remainingAmount != null ? extras.remainingAmount : amt,
        status: 'pending'
      }
    )
  }

  get isReturned() {
    return this.status === 'returned' || (Number(this.remainingAmount) || 0) <= 0
  }

  get pendingPrincipal() {
    if (this.isReturned) return 0
    const r = Number(this.remainingAmount)
    if (Number.isFinite(r)) return Math.max(0, r)
    return Number(this.amount) || 0
  }

  getDaysUntilExpectedReturn() {
    if (!this.expectedReturnDate) return null
    const today = new Date()
    const expected = new Date(this.expectedReturnDate)
    const diffTime = expected - today
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  isMaturingSoon() {
    if (this.isReturned) return false
    const days = this.getDaysUntilExpectedReturn()
    if (days == null) return false
    return days >= 0 && days <= 30
  }

  isOverdue() {
    if (this.isReturned) return false
    const days = this.getDaysUntilExpectedReturn()
    if (days == null) return false
    return days < 0
  }

  getStatusText() {
    if (this.isReturned) return '已还清'
    const days = this.getDaysUntilExpectedReturn()
    if (days == null) return '待还'
    if (days < 0) return `逾期 ${Math.abs(days)} 天`
    if (days === 0) return '今日到期'
    if (days <= 7) return `${days} 天后到期`
    if (days <= 30) return `${days} 天后到期`
    return '待还'
  }

  getStatusColor() {
    if (this.isReturned) return '#67C23A'
    const days = this.getDaysUntilExpectedReturn()
    if (days == null) return '#909399'
    if (days < 0) return '#F56C6C'
    if (days === 0) return '#E6A23C'
    if (days <= 7) return '#F56C6C'
    if (days <= 30) return '#E6A23C'
    return '#909399'
  }

  /**
   * 归还本金（可部分）
   * @returns {number} 实际冲减的本金
   */
  applyPrincipalReturn(principalAmount, actualReturnDate = null) {
    const pay = Math.max(0, Number(principalAmount) || 0)
    const pending = this.pendingPrincipal
    const applied = Math.min(pay, pending)
    this.remainingAmount = pending - applied
    this.returnedPrincipal = (Number(this.returnedPrincipal) || 0) + applied
    if (this.remainingAmount <= 1e-9) {
      this.remainingAmount = 0
      this.status = 'returned'
      this.actualReturnDate =
        actualReturnDate || new Date().toISOString().split('T')[0]
    }
    this.updatedAt = new Date().toISOString()
    return applied
  }

  addInterest(amount) {
    this.interestReceived =
      (Number(this.interestReceived) || 0) + (Number(amount) || 0)
    this.updatedAt = new Date().toISOString()
  }

  markAsReturned(actualReturnDate = null) {
    this.remainingAmount = 0
    this.actualReturnDate =
      actualReturnDate || new Date().toISOString().split('T')[0]
    this.status = 'returned'
    this.updatedAt = new Date().toISOString()
  }

  update(borrower, amount, lendDate, expectedReturnDate, notes) {
    this.borrower = borrower
    // 金额字段：仅编辑备注/日期时不改 remaining；全量编辑由 store 控制
    if (amount != null) this.amount = Number(amount) || 0
    this.lendDate = lendDate
    this.expectedReturnDate = expectedReturnDate
    this.notes = notes
    this.updatedAt = new Date().toISOString()
  }
}
