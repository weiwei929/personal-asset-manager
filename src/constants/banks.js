/**
 * 四银行常量（一期定稿 · id 稳定勿改）
 * 口径：notes/2026-07-20-框架定稿-确认点.md
 */

export const BANK_IDS = Object.freeze({
  CMB: 'cmb',
  CSCB: 'cscb',
  CCB: 'ccb',
  CEB: 'ceb'
})

/**
 * @typedef {{ id: string, name: string, role?: string, roleLabel?: string, note?: string }} BankDef
 * role: general | hpf（公积金）
 */

/** @type {ReadonlyArray<BankDef>} */
export const BANKS = Object.freeze([
  { id: BANK_IDS.CMB, name: '招商银行', role: 'general' },
  { id: BANK_IDS.CSCB, name: '长沙银行', role: 'general' },
  { id: BANK_IDS.CCB, name: '建设银行', role: 'general' },
  {
    id: BANK_IDS.CEB,
    name: '光大银行',
    role: 'hpf',
    roleLabel: '住房公积金',
    note: '仅承担住房公积金存款，按月定期'
  }
])

/**
 * 信用卡（还款从银行活期出；不建独立资产桶）
 * autoBankId: 约定自动扣款的银行（招行信用卡→招行）
 */
export const CREDIT_CARDS = Object.freeze([
  {
    id: 'cmb_cc',
    name: '招商信用卡',
    autoBankId: BANK_IDS.CMB,
    note: '与招商银行已建立自动扣款'
  },
  {
    id: 'cgb_cc',
    name: '广发信用卡',
    autoBankId: null,
    note: '需从招商/长沙等活期转账还款'
  },
  {
    id: 'spdb_cc',
    name: '浦发信用卡',
    autoBankId: null,
    note: '需从招商/长沙等活期转账还款'
  }
])

export const BANK_ID_LIST = Object.freeze(BANKS.map(b => b.id))
export const CREDIT_CARD_ID_LIST = Object.freeze(CREDIT_CARDS.map(c => c.id))

const bankNameMap = Object.fromEntries(BANKS.map(b => [b.id, b.name]))
const bankMetaMap = Object.fromEntries(BANKS.map(b => [b.id, b]))
const cardNameMap = Object.fromEntries(CREDIT_CARDS.map(c => [c.id, c.name]))
const cardMetaMap = Object.fromEntries(CREDIT_CARDS.map(c => [c.id, c]))

export function isValidBankId(bankId) {
  return BANK_ID_LIST.includes(bankId)
}

export function isValidCreditCardId(cardId) {
  return CREDIT_CARD_ID_LIST.includes(cardId)
}

export function getBankName(bankId) {
  return bankNameMap[bankId] || bankId
}

export function getBankMeta(bankId) {
  return bankMetaMap[bankId] || null
}

export function getCreditCardName(cardId) {
  return cardNameMap[cardId] || cardId
}

export function getCreditCardMeta(cardId) {
  return cardMetaMap[cardId] || null
}

/**
 * 创建空的四户结构（期初/重置用）
 * @returns {Array<{ id: string, name: string, demandBalance: number, timeDeposits: Array }>}
 */
export function createEmptyBankAccounts() {
  return BANKS.map(b => ({
    id: b.id,
    name: b.name,
    demandBalance: 0,
    timeDeposits: []
  }))
}

/**
 * 确保 accounts 含且仅含四户（顺序按 BANKS），缺则补、多余丢弃
 * @param {Array} accounts
 */
export function normalizeBankAccounts(accounts) {
  const byId = new Map()
  if (Array.isArray(accounts)) {
    for (const a of accounts) {
      if (a && isValidBankId(a.id)) {
        byId.set(a.id, a)
      }
    }
  }

  return BANKS.map(b => {
    const existing = byId.get(b.id)
    if (!existing) {
      return {
        id: b.id,
        name: b.name,
        demandBalance: 0,
        timeDeposits: []
      }
    }
    return {
      id: b.id,
      name: b.name,
      demandBalance: Number(existing.demandBalance) || 0,
      timeDeposits: Array.isArray(existing.timeDeposits)
        ? existing.timeDeposits.map(normalizeTimeDeposit.bind(null, b.id))
        : []
    }
  })
}

/**
 * @param {string} bankId
 * @param {object} d
 */
export function normalizeTimeDeposit(bankId, d = {}) {
  return {
    id: d.id || createId(),
    bankId: d.bankId || bankId,
    name: d.name || '定期产品',
    principal: Number(d.principal) || 0,
    startDate: d.startDate || null,
    maturityDate: d.maturityDate || null,
    note: d.note || '',
    createdAt: d.createdAt || new Date().toISOString()
  }
}

export function createId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}
