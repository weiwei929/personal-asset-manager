/**
 * 定期产品（挂在银行活期账户下）
 */
import { createId, normalizeTimeDeposit } from '../constants/banks.js'

export default class TimeDeposit {
  constructor({
    id,
    bankId,
    name,
    principal,
    startDate = null,
    maturityDate = null,
    note = '',
    createdAt
  }) {
    this.id = id || createId()
    this.bankId = bankId
    this.name = name || '定期产品'
    this.principal = Number(principal) || 0
    this.startDate = startDate || null
    this.maturityDate = maturityDate || null
    this.note = note || ''
    this.createdAt = createdAt || new Date().toISOString()
  }

  static create(bankId, { name, principal, startDate, maturityDate, note } = {}) {
    return new TimeDeposit({
      bankId,
      name,
      principal,
      startDate,
      maturityDate,
      note
    })
  }

  static fromJSON(bankId, raw) {
    const n = normalizeTimeDeposit(bankId, raw)
    return new TimeDeposit(n)
  }

  getDaysUntilMaturity() {
    if (!this.maturityDate) return null
    const today = new Date()
    const maturity = new Date(this.maturityDate)
    const diffTime = maturity - today
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  isMaturingSoon(withinDays = 30) {
    const days = this.getDaysUntilMaturity()
    if (days == null) return false
    return days >= 0 && days <= withinDays
  }

  isMatured() {
    const days = this.getDaysUntilMaturity()
    if (days == null) return false
    return days < 0
  }

  toJSON() {
    return {
      id: this.id,
      bankId: this.bankId,
      name: this.name,
      principal: this.principal,
      startDate: this.startDate,
      maturityDate: this.maturityDate,
      note: this.note,
      createdAt: this.createdAt
    }
  }
}
