/**
 * 月度入账纯函数：由收入/三通道推导活期增减
 *
 * 收入 → 指定银行活期 +
 * 微信/支付宝/信用卡月小计 → 指定银行活期 −
 */

import { CHANNEL_IDS } from '../constants/channels.js'
import { isValidBankId } from '../constants/banks.js'

/**
 * @param {{ amount?: number, bankId?: string }[]} incomes
 * @param {Record<string, { amount?: number, bankId?: string }>} channels
 * @returns {Record<string, number>} bankId → 净变动（正=活期增加）
 */
export function computePostedEffects(incomes = [], channels = {}) {
  const map = {}

  const add = (bankId, amount) => {
    const n = Number(amount) || 0
    if (!bankId || !isValidBankId(bankId) || Math.abs(n) < 1e-9) return
    map[bankId] = (map[bankId] || 0) + n
  }

  for (const row of incomes || []) {
    add(row.bankId, Number(row.amount) || 0)
  }

  for (const ch of CHANNEL_IDS) {
    const c = channels[ch]
    if (!c) continue
    add(c.bankId, -(Number(c.amount) || 0))
  }

  // 去掉近似 0
  for (const k of Object.keys(map)) {
    if (Math.abs(map[k]) < 1e-9) delete map[k]
  }
  return map
}

/**
 * 新旧 postedEffects 差额 → 应对活期施加的调整
 * @returns {Array<{ bankId: string, delta: number }>}
 */
export function diffPostedEffects(oldMap = {}, newMap = {}) {
  const keys = new Set([
    ...Object.keys(oldMap || {}),
    ...Object.keys(newMap || {})
  ])
  const out = []
  for (const bankId of keys) {
    const delta = (Number(newMap[bankId]) || 0) - (Number(oldMap[bankId]) || 0)
    if (Math.abs(delta) >= 1e-9) {
      out.push({ bankId, delta })
    }
  }
  return out
}

/**
 * 从明细汇总收入/支出/净额
 */
export function deriveMonthTotals(incomes = [], channels = {}) {
  const income = (incomes || []).reduce((s, r) => s + (Number(r.amount) || 0), 0)
  let expense = 0
  for (const ch of CHANNEL_IDS) {
    const c = channels[ch]
    if (c) expense += Number(c.amount) || 0
  }
  // 兼容旧数据：无明细时由调用方传入 income/expense
  return {
    income,
    expense,
    netIncome: income - expense
  }
}

/**
 * 规范化一月数据结构
 *
 * 重要：只要调用方显式传了 incomes 数组或 channels 对象（含全 0），
 * 就视为「有明细结构」，**禁止**用旧的 income/expense 总数再合成通道。
 * 否则「支出改 0 再保存」会被旧 expense 写回，表现为保存不生效。
 */
export function normalizeMonthRecord(raw = {}, month) {
  const m = month || raw.month || raw.id
  const hasIncomesKey = Array.isArray(raw.incomes)
  const hasChannelsKey =
    raw.channels != null && typeof raw.channels === 'object'

  let incomes = hasIncomesKey
    ? raw.incomes.map(normalizeIncomeRow)
    : []
  let channels = hasChannelsKey
    ? normalizeChannels(raw.channels)
    : emptyChannelMap(0)

  const legacyIncome = Number(raw.income) || 0
  const legacyExpense = Number(raw.expense) || 0
  /** 是否带明细结构（即使金额全 0 也算显式清空） */
  const hasDetailStructure = hasIncomesKey || hasChannelsKey
  const hasDetailAmounts =
    incomes.length > 0 ||
    CHANNEL_IDS.some(ch => (Number(channels[ch]?.amount) || 0) > 0)

  // 仅纯旧数据（无 incomes/channels 键）才用总数合成占位
  if (!hasDetailStructure && (legacyIncome > 0 || legacyExpense > 0)) {
    if (legacyIncome > 0) {
      incomes = [
        {
          id: `legacy-income-${m}`,
          amount: legacyIncome,
          category: 'other',
          bankId: null,
          note: '历史总数（未挂银行，保存时请指定入账银行）'
        }
      ]
    }
    if (legacyExpense > 0) {
      channels = emptyChannelMap(legacyExpense)
    }
  }

  const totals = deriveMonthTotals(incomes, channels)
  // 有明细结构时一律以明细为准（允许全 0）；否则才回落旧总数
  const income = hasDetailStructure
    ? totals.income
    : hasDetailAmounts
      ? totals.income
      : legacyIncome
  const expense = hasDetailStructure
    ? totals.expense
    : hasDetailAmounts
      ? totals.expense
      : legacyExpense

  // flowOnly：显式标记优先；勿因「入账后改成全 0、postedEffects 为空」误判为对照
  const flowOnly = raw.flowOnly === true

  return {
    id: m,
    month: m,
    incomes,
    channels,
    income,
    expense,
    netIncome: income - expense,
    postedEffects: raw.postedEffects && typeof raw.postedEffects === 'object'
      ? { ...raw.postedEffects }
      : {},
    flowOnly,
    allocated_amounts:
      raw.allocated_amounts && typeof raw.allocated_amounts === 'object'
        ? { ...raw.allocated_amounts }
        : {},
    transfers: Array.isArray(raw.transfers) ? raw.transfers : [],
    isArchived: Boolean(raw.isArchived),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString()
  }
}

function normalizeIncomeRow(row = {}) {
  return {
    id: row.id || `inc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    amount: Number(row.amount) || 0,
    category: row.category || 'other',
    bankId: row.bankId || null,
    note: row.note || ''
  }
}

function emptyChannelMap(wechatAmount = 0) {
  const base = {}
  for (const ch of CHANNEL_IDS) {
    base[ch] = {
      amount: ch === 'wechat' ? (Number(wechatAmount) || 0) : 0,
      bankId: null
    }
  }
  return base
}

function normalizeChannels(raw) {
  const base = emptyChannelMap(0)
  if (!raw || typeof raw !== 'object') return base
  for (const ch of CHANNEL_IDS) {
    const c = raw[ch]
    if (!c) continue
    base[ch] = {
      amount: Number(c.amount) || 0,
      bankId: c.bankId || null
    }
  }
  return base
}

/**
 * 校验可入账（金额>0 的行必须有 bankId）
 * @returns {string[]} 错误信息
 */
export function validateMonthForPosting(incomes = [], channels = {}) {
  const errors = []
  for (const row of incomes || []) {
    const amt = Number(row.amount) || 0
    if (amt > 0 && !isValidBankId(row.bankId)) {
      errors.push(`收入 ¥${amt} 未选择入账银行`)
    }
  }
  for (const ch of CHANNEL_IDS) {
    const c = channels[ch]
    if (!c) continue
    const amt = Number(c.amount) || 0
    if (amt > 0 && !isValidBankId(c.bankId)) {
      const labels = {
        wechat: '微信',
        alipay: '支付宝',
        credit: '信用卡',
        transfer: '转账支出'
      }
      errors.push(`${labels[ch] || ch} 支出 ¥${amt} 未选择归属银行`)
    }
  }
  return errors
}
