import { defineStore } from 'pinia'
import LentMoney from '../models/LentMoney.js'
import { useBankAccountsStore } from './bankAccounts.js'
import { isValidBankId } from '../constants/banks.js'
import { STORAGE_KEYS } from '../constants/storageKeys.js'

/**
 * 借出：活期↓ 应收↑（总资产不变）
 * 归还：应收↓ 活期↑；利息另计进活期（总资产↑）
 */
export const useLentMoneyStore = defineStore('lentMoney', {
  state: () => ({
    lentRecords: []
  }),

  getters: {
    totalLentAmount: (state) =>
      state.lentRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),

    /** 未还本金合计（进总资产） */
    pendingAmount: (state) =>
      state.lentRecords
        .filter(r => !isReturned(r))
        .reduce((sum, r) => sum + pendingOf(r), 0),

    returnedAmount: (state) =>
      state.lentRecords.reduce(
        (sum, r) => sum + (Number(r.returnedPrincipal) || 0),
        0
      ),

    maturingRecords: (state) =>
      state.lentRecords.filter(r =>
        typeof r.isMaturingSoon === 'function' ? r.isMaturingSoon() : false
      ),

    overdueRecords: (state) =>
      state.lentRecords.filter(r =>
        typeof r.isOverdue === 'function' ? r.isOverdue() : false
      ),

    recordsByDueDate: (state) => {
      return [...state.lentRecords].sort((a, b) => {
        const ar = isReturned(a)
        const br = isReturned(b)
        if (ar && br) return 0
        if (ar) return 1
        if (br) return -1
        return (
          new Date(a.expectedReturnDate || 0) -
          new Date(b.expectedReturnDate || 0)
        )
      })
    },

    recordsByBorrower: (state) => {
      const result = {}
      state.lentRecords.forEach(record => {
        if (!result[record.borrower]) result[record.borrower] = []
        result[record.borrower].push(record)
      })
      return result
    },

    statistics: (state) => {
      const pending = state.lentRecords.filter(r => !isReturned(r))
      const returned = state.lentRecords.filter(r => isReturned(r))
      const maturing = state.lentRecords.filter(r =>
        typeof r.isMaturingSoon === 'function' ? r.isMaturingSoon() : false
      )
      const overdue = state.lentRecords.filter(r =>
        typeof r.isOverdue === 'function' ? r.isOverdue() : false
      )
      return {
        totalRecords: state.lentRecords.length,
        pendingRecords: pending.length,
        returnedRecords: returned.length,
        maturingRecords: maturing.length,
        overdueRecords: overdue.length
      }
    }
  },

  actions: {
    _find(id) {
      const r = this.lentRecords.find(x => x.id === id)
      if (!r) throw new Error('未找到该借出记录')
      return r
    },

    _requireBank(bankId) {
      if (!isValidBankId(bankId)) throw new Error('请选择银行活期')
    },

    /**
     * 从银行活期借出
     * 活期↓ 应收↑，总资产不变
     */
    lendFromBank({
      borrower,
      amount,
      bankId,
      lendDate,
      expectedReturnDate,
      notes = ''
    }) {
      const name = String(borrower || '').trim()
      if (!name) throw new Error('请填写对方')
      const amt = Number(amount) || 0
      if (amt <= 0) throw new Error('借出金额须大于 0')
      this._requireBank(bankId)

      const bank = useBankAccountsStore()
      const acc = bank.accountById(bankId)
      if ((Number(acc?.demandBalance) || 0) < amt) {
        throw new Error(
          `活期不足：${acc?.name || bankId} 当前 ¥${acc?.demandBalance ?? 0}`
        )
      }

      bank.adjustDemandBalance(bankId, -amt, {
        type: 'lend',
        note: `借出给 ${name}`
      })

      const date = lendDate || todayISO()
      const due = expectedReturnDate || addOneYear(date)
      const record = LentMoney.create(name, amt, date, due, notes, {
        bankId,
        remainingAmount: amt
      })
      this.lentRecords.push(record)
      this.saveToLocalStorage()
      return record.id
    },

    /**
     * 归还到银行活期
     * @param {string} id
     * @param {{
     *   principalAmount?: number,  // 还本；默认全部未还
     *   interestAmount?: number,   // 利息 → 活期↑，总资产↑
     *   bankId: string,
     *   actualReturnDate?: string
     * }} opts
     */
    repayToBank(id, opts = {}) {
      const record = this._find(id)
      if (isReturned(record)) throw new Error('该笔已还清')

      const bankId = opts.bankId
      this._requireBank(bankId)

      const pending = pendingOf(record)
      let principal =
        opts.principalAmount == null || opts.principalAmount === ''
          ? pending
          : Number(opts.principalAmount) || 0
      if (principal < 0) throw new Error('还本金额不能为负')
      if (principal > pending + 1e-9) {
        throw new Error(`还本不能超过未还 ¥${pending}`)
      }

      const interest = Math.max(0, Number(opts.interestAmount) || 0)
      const credit = principal + interest
      if (credit <= 0) throw new Error('请填写还本或利息')

      const bank = useBankAccountsStore()
      bank.adjustDemandBalance(bankId, credit, {
        type: interest > 0 && principal > 0 ? 'lend_repay' : interest > 0 ? 'lend_interest' : 'lend_repay',
        note: `收回 ${record.borrower} · 本金 ${principal} · 利息 ${interest}`
      })

      if (typeof record.applyPrincipalReturn === 'function') {
        record.applyPrincipalReturn(principal, opts.actualReturnDate || null)
      } else {
        // 兼容裸对象
        const rem = pending - principal
        record.remainingAmount = Math.max(0, rem)
        record.returnedPrincipal =
          (Number(record.returnedPrincipal) || 0) + principal
        if (record.remainingAmount <= 1e-9) {
          record.remainingAmount = 0
          record.status = 'returned'
          record.actualReturnDate =
            opts.actualReturnDate || todayISO()
        }
        record.updatedAt = new Date().toISOString()
      }

      if (interest > 0) {
        if (typeof record.addInterest === 'function') {
          record.addInterest(interest)
        } else {
          record.interestReceived =
            (Number(record.interestReceived) || 0) + interest
        }
      }

      this.saveToLocalStorage()
      return {
        principal,
        interest,
        remaining: pendingOf(record),
        status: record.status
      }
    },

    // —— 旧 API 兼容（不自动动活期，避免静默双计）——
    addLentRecord(borrower, amount, lendDate, expectedReturnDate, notes = '') {
      const record = LentMoney.create(
        borrower,
        amount,
        lendDate,
        expectedReturnDate,
        notes
      )
      this.lentRecords.push(record)
      this.saveToLocalStorage()
      return record.id
    },

    updateLentRecord(id, borrower, amount, lendDate, expectedReturnDate, notes) {
      const index = this.lentRecords.findIndex(r => r.id === id)
      if (index > -1) {
        this.lentRecords[index].update(
          borrower,
          amount,
          lendDate,
          expectedReturnDate,
          notes
        )
        this.saveToLocalStorage()
      }
    },

    markAsReturned(id, actualReturnDate = null) {
      const index = this.lentRecords.findIndex(r => r.id === id)
      if (index > -1) {
        this.lentRecords[index].markAsReturned(actualReturnDate)
        this.saveToLocalStorage()
      }
    },

    /**
     * 删除记录
     * @param {string} id
     * @param {{ restoreDemand?: boolean, bankId?: string }} opts
     *   restoreDemand：未还清时是否把剩余本金退回活期（默认 true 且需 bankId）
     */
    removeLentRecord(id, opts = {}) {
      const index = this.lentRecords.findIndex(r => r.id === id)
      if (index < 0) return

      const record = this.lentRecords[index]
      const pending = pendingOf(record)
      const restore =
        opts.restoreDemand !== false && pending > 0 && !isReturned(record)

      if (restore) {
        const bankId = opts.bankId || record.bankId
        if (!isValidBankId(bankId)) {
          throw new Error('删除未还清记录需指定退回银行活期')
        }
        const bank = useBankAccountsStore()
        bank.adjustDemandBalance(bankId, pending, {
          type: 'lend_delete_restore',
          note: `删除借出 ${record.borrower} · 退回未还本金`
        })
      }

      this.lentRecords.splice(index, 1)
      this.saveToLocalStorage()
    },

    loadFromLocalStorage() {
      const records = localStorage.getItem(STORAGE_KEYS.LENT_MONEY)
      if (records) {
        const parsed = JSON.parse(records)
        this.lentRecords = parsed.map(r => {
          const obj = Object.assign(new LentMoney(), r)
          // 历史数据无 remainingAmount
          if (obj.remainingAmount == null) {
            obj.remainingAmount =
              obj.status === 'returned' ? 0 : Number(obj.amount) || 0
          }
          return obj
        })
      }
    },

    saveToLocalStorage() {
      localStorage.setItem(
        STORAGE_KEYS.LENT_MONEY,
        JSON.stringify(this.lentRecords)
      )
    },

    clearAllRecords() {
      this.lentRecords = []
      this.saveToLocalStorage()
    },

    replaceFromOpening(items = [], openingDate) {
      const list = Array.isArray(items) ? items : []
      const date = openingDate || todayISO()
      const due = addOneYear(date)
      this.lentRecords = list
        .filter(
          item =>
            item &&
            String(item.borrower || '').trim() &&
            (Number(item.amount) || 0) > 0
        )
        .map(item =>
          LentMoney.create(
            String(item.borrower).trim(),
            Number(item.amount) || 0,
            date,
            due,
            item.notes || '期初建账',
            { remainingAmount: Number(item.amount) || 0 }
          )
        )
      this.saveToLocalStorage()
    }
  }
})

function isReturned(r) {
  if (!r) return true
  if (typeof r.isReturned === 'boolean') return r.isReturned
  if (typeof r.isReturned === 'function') return r.isReturned()
  return r.status === 'returned' || (Number(r.remainingAmount) || 0) <= 0
}

function pendingOf(r) {
  if (!r || isReturned(r)) return 0
  if (typeof r.pendingPrincipal === 'number') return r.pendingPrincipal
  if (r.remainingAmount != null) return Math.max(0, Number(r.remainingAmount) || 0)
  return Number(r.amount) || 0
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function addOneYear(isoDate) {
  try {
    const d = new Date(isoDate + 'T00:00:00')
    d.setFullYear(d.getFullYear() + 1)
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${m}-${day}`
  } catch {
    return isoDate
  }
}
