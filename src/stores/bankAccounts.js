import { defineStore } from 'pinia'
import {
  BANKS,
  createEmptyBankAccounts,
  createId,
  isValidBankId,
  isValidCreditCardId,
  getCreditCardName,
  normalizeBankAccounts,
  normalizeTimeDeposit
} from '../constants/banks.js'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
import TimeDeposit from '../models/TimeDeposit.js'
import { roundMoney, addMoney } from '../utils/money.js'

/**
 * 银行域：四户活期 + 定期多笔（可用现金 / 银行存款 的存量真源）
 */
export const useBankAccountsStore = defineStore('bankAccounts', {
  state: () => ({
    accounts: createEmptyBankAccounts(),
    movements: []
  }),

  getters: {
    /** 四行活期合计 = 可用现金 */
    totalDemand: (state) =>
      state.accounts.reduce((sum, a) => sum + (Number(a.demandBalance) || 0), 0),

    /** 全部定期产品本金合计 = 银行存款分项 */
    totalTimeDeposit: (state) =>
      state.accounts.reduce((sum, a) => {
        const list = a.timeDeposits || []
        return sum + list.reduce((s, d) => s + (Number(d.principal) || 0), 0)
      }, 0),

    /** 银行侧合计（活期+定期，便于页脚展示；总资产请用 assets store） */
    totalBankSide() {
      return this.totalDemand + this.totalTimeDeposit
    },

    accountById: (state) => (bankId) =>
      state.accounts.find(a => a.id === bankId) || null,

    allTimeDeposits: (state) => {
      const list = []
      for (const a of state.accounts) {
        for (const d of a.timeDeposits || []) {
          list.push({ ...d, bankName: a.name })
        }
      }
      return list
    },

    maturingTimeDeposits() {
      return this.allTimeDeposits.filter(d => {
        const td = TimeDeposit.fromJSON(d.bankId, d)
        return td.isMaturingSoon(30)
      })
    },

    maturedTimeDeposits() {
      return this.allTimeDeposits.filter(d => {
        const td = TimeDeposit.fromJSON(d.bankId, d)
        return td.isMatured()
      })
    },

    bankMeta: () => BANKS
  },

  actions: {
    _findAccount(bankId) {
      if (!isValidBankId(bankId)) {
        throw new Error(`无效银行 id: ${bankId}`)
      }
      const account = this.accounts.find(a => a.id === bankId)
      if (!account) {
        throw new Error(`未找到银行账户: ${bankId}`)
      }
      return account
    },

    _recordMovement({ month, bankId, type, amount, channel = null, note = '' }) {
      this.movements.push({
        id: createId(),
        month: month || currentMonthKey(),
        bankId,
        type,
        amount: Number(amount) || 0,
        channel,
        note: note || '',
        createdAt: new Date().toISOString()
      })
    },

    /**
     * 设置活期余额（绝对值，期初/手工校正）
     */
    setDemandBalance(bankId, amount, { note = '', record = true } = {}) {
      const account = this._findAccount(bankId)
      const next = roundMoney(amount)
      const prev = roundMoney(account.demandBalance)
      account.demandBalance = next
      if (record && next !== prev) {
        this._recordMovement({
          bankId,
          type: 'demand_set',
          amount: roundMoney(next - prev),
          note: note || `活期校正 ${prev} → ${next}`
        })
      }
      this.persist()
    },

    /**
     * 增减活期（收入/支出/投入/撤回/借出 统一入口）
     * @returns {number} 变更后余额
     */
    adjustDemandBalance(bankId, delta, { type = 'demand_adjust', channel = null, note = '', month = null } = {}) {
      const account = this._findAccount(bankId)
      const d = roundMoney(delta)
      account.demandBalance = addMoney(account.demandBalance, d)
      this._recordMovement({
        month,
        bankId,
        type,
        amount: d,
        channel,
        note
      })
      this.persist()
      return account.demandBalance
    },

    /**
     * 新增定期产品（不自动扣活期；划转请用 transferDemandToTime）
     */
    addTimeDeposit(bankId, fields = {}) {
      const account = this._findAccount(bankId)
      const deposit = normalizeTimeDeposit(bankId, {
        ...fields,
        id: fields.id || createId()
      })
      account.timeDeposits.push(deposit)
      this._recordMovement({
        bankId,
        type: 'time_add',
        amount: deposit.principal,
        note: fields.note || `新增定期 ${deposit.name}`
      })
      this.persist()
      return deposit.id
    },

    updateTimeDeposit(bankId, depositId, updates = {}) {
      const account = this._findAccount(bankId)
      const idx = account.timeDeposits.findIndex(d => d.id === depositId)
      if (idx < 0) throw new Error(`未找到定期产品: ${depositId}`)
      const prev = account.timeDeposits[idx]
      const nextPrincipal =
        updates.principal !== undefined ? Number(updates.principal) || 0 : prev.principal
      account.timeDeposits[idx] = {
        ...prev,
        ...updates,
        id: prev.id,
        bankId,
        principal: nextPrincipal
      }
      this.persist()
    },

    removeTimeDeposit(bankId, depositId, { returnToDemand = false } = {}) {
      const account = this._findAccount(bankId)
      const idx = account.timeDeposits.findIndex(d => d.id === depositId)
      if (idx < 0) throw new Error(`未找到定期产品: ${depositId}`)
      const [removed] = account.timeDeposits.splice(idx, 1)
      if (returnToDemand) {
        account.demandBalance = (Number(account.demandBalance) || 0) + (Number(removed.principal) || 0)
        this._recordMovement({
          bankId,
          type: 'time_to_demand',
          amount: removed.principal,
          note: `删除并转回活期 ${removed.name}`
        })
      } else {
        this._recordMovement({
          bankId,
          type: 'time_remove',
          amount: -(Number(removed.principal) || 0),
          note: `删除定期 ${removed.name}`
        })
      }
      this.persist()
      return removed
    },

    /**
     * 银行间活期转账（总资产不变）
     * @param {string} fromBankId
     * @param {string} toBankId
     * @param {number} amount
     * @param {{ note?: string, month?: string }} [opts]
     */
    transferBetweenBanks(fromBankId, toBankId, amount, opts = {}) {
      if (fromBankId === toBankId) {
        throw new Error('转出与转入银行不能相同')
      }
      const from = this._findAccount(fromBankId)
      const to = this._findAccount(toBankId)
      const amt = roundMoney(amount)
      if (amt <= 0) throw new Error('转账金额须大于 0')
      const fromBal = roundMoney(from.demandBalance)
      if (fromBal < amt) {
        throw new Error(
          `活期不足：${from.name} 当前 ¥${fromBal}，需要 ¥${amt}`
        )
      }
      from.demandBalance = roundMoney(fromBal - amt)
      to.demandBalance = addMoney(to.demandBalance, amt)
      const note =
        opts.note ||
        `${from.name} → ${to.name}`
      this._recordMovement({
        month: opts.month || null,
        bankId: fromBankId,
        type: 'bank_transfer_out',
        amount: -amt,
        note: `转出 ${note}`
      })
      this._recordMovement({
        month: opts.month || null,
        bankId: toBankId,
        type: 'bank_transfer_in',
        amount: amt,
        note: `转入 ${note}`
      })
      this.persist()
      return { fromBankId, toBankId, amount: amt }
    },

    /**
     * 银行活期 → 还信用卡（钱离开家当，总资产↓）
     * 与「月度信用卡小计入账」二选一，勿对同一笔重复记
     * @param {string} bankId 扣款银行活期
     * @param {string} cardId 信用卡 id
     * @param {number} amount
     * @param {{ note?: string, month?: string }} [opts]
     */
    repayCreditCard(bankId, cardId, amount, opts = {}) {
      if (!isValidCreditCardId(cardId)) {
        throw new Error(`无效信用卡: ${cardId}`)
      }
      const account = this._findAccount(bankId)
      const amt = roundMoney(amount)
      if (amt <= 0) throw new Error('还款金额须大于 0')
      const bal = roundMoney(account.demandBalance)
      if (bal < amt) {
        throw new Error(
          `活期不足：${account.name} 当前 ¥${bal}，需要 ¥${amt}`
        )
      }
      account.demandBalance = roundMoney(bal - amt)
      const cardName = getCreditCardName(cardId)
      this._recordMovement({
        month: opts.month || null,
        bankId,
        type: 'credit_repay',
        amount: -amt,
        channel: cardId,
        note: opts.note || `还信用卡 ${cardName}`
      })
      this.persist()
      return { bankId, cardId, amount: amt }
    },

    /**
     * 活期 → 定期（总额不变）
     */
    transferDemandToTime(bankId, amount, depositFields = {}) {
      const account = this._findAccount(bankId)
      const amt = roundMoney(amount)
      if (amt <= 0) throw new Error('划转金额须大于 0')
      const demand = roundMoney(account.demandBalance)
      if (demand < amt) {
        throw new Error(
          `活期不足：当前 ¥${demand}，需要 ¥${amt}`
        )
      }
      account.demandBalance = roundMoney(demand - amt)
      const deposit = normalizeTimeDeposit(bankId, {
        ...depositFields,
        id: depositFields.id || createId(),
        principal: amt
      })
      account.timeDeposits.push(deposit)
      this._recordMovement({
        bankId,
        type: 'demand_to_time',
        amount: amt,
        note: depositFields.note || `活期→定期 ${deposit.name}`
      })
      this.persist()
      return deposit.id
    },

    /**
     * 定期 → 活期（全部或部分；部分则减本金）
     */
    transferTimeToDemand(bankId, depositId, amount = null) {
      const account = this._findAccount(bankId)
      const idx = account.timeDeposits.findIndex(d => d.id === depositId)
      if (idx < 0) throw new Error(`未找到定期产品: ${depositId}`)
      const deposit = account.timeDeposits[idx]
      const principal = roundMoney(deposit.principal)
      const amt = amount == null ? principal : roundMoney(amount)
      if (amt <= 0) throw new Error('划转金额须大于 0')
      if (amt > principal) throw new Error(`支取金额超过本金 ¥${principal}`)

      account.demandBalance = addMoney(account.demandBalance, amt)
      if (amt >= principal) {
        account.timeDeposits.splice(idx, 1)
      } else {
        deposit.principal = roundMoney(principal - amt)
      }
      this._recordMovement({
        bankId,
        type: 'time_to_demand',
        amount: amt,
        note: `定期→活期 ${deposit.name}`
      })
      this.persist()
    },

    /**
     * 期初批量写入（不写逐笔异动，或只写一条 opening）
     * @param {Array<{ id: string, demandBalance?: number, timeDeposits?: Array }>} rows
     */
    applyOpeningSnapshot(rows = [], { date = null, resetMovements = false } = {}) {
      if (resetMovements) {
        this.movements = []
      }
      const next = createEmptyBankAccounts()
      for (const row of rows) {
        if (!isValidBankId(row.id)) continue
        const target = next.find(a => a.id === row.id)
        if (!target) continue
        target.demandBalance = roundMoney(row.demandBalance)
        target.timeDeposits = (row.timeDeposits || []).map(d =>
          normalizeTimeDeposit(row.id, {
            ...d,
            principal: roundMoney(d.principal)
          })
        )
      }
      this.accounts = next
      this._recordMovement({
        bankId: BANKS[0].id,
        type: 'opening',
        amount: this.totalDemand + this.totalTimeDeposit,
        note: date ? `期初建账 ${date}` : '期初建账'
      })
      this.persist()
    },

    loadFromLocalStorage() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.BANK_ACCOUNTS)
        if (raw) {
          this.accounts = normalizeBankAccounts(JSON.parse(raw))
        } else {
          this.accounts = createEmptyBankAccounts()
        }
      } catch (e) {
        console.error('加载银行账户失败', e)
        this.accounts = createEmptyBankAccounts()
      }

      try {
        const mov = localStorage.getItem(STORAGE_KEYS.BANK_MOVEMENTS)
        this.movements = mov ? JSON.parse(mov) : []
        if (!Array.isArray(this.movements)) this.movements = []
      } catch (e) {
        this.movements = []
      }
    },

    saveToLocalStorage() {
      try {
        localStorage.setItem(
          STORAGE_KEYS.BANK_ACCOUNTS,
          JSON.stringify(this.accounts)
        )
        localStorage.setItem(
          STORAGE_KEYS.BANK_MOVEMENTS,
          JSON.stringify(this.movements)
        )
      } catch (e) {
        console.error('保存银行账户失败', e)
      }
    },

    persist() {
      this.saveToLocalStorage()
    },

    clearAll() {
      this.accounts = createEmptyBankAccounts()
      this.movements = []
      this.persist()
    }
  }
})

function currentMonthKey() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${d.getFullYear()}-${m}`
}
