/**
 * 月度收支：收入类目 + 支出通道
 */

export const INCOME_CATEGORIES = Object.freeze([
  { id: 'salary', name: '工资' },
  { id: 'interest', name: '利息' },
  { id: 'other', name: '其它' }
])

export const EXPENSE_CHANNELS = Object.freeze([
  {
    id: 'wechat',
    name: '微信',
    hint: '本月小计 · 扣指定银行活期'
  },
  {
    id: 'alipay',
    name: '支付宝',
    hint: '本月小计 · 扣指定银行活期'
  },
  {
    id: 'credit',
    name: '信用卡',
    hint: '记在实际扣款月（多为账单次月），扣指定银行活期'
  },
  {
    id: 'transfer',
    name: '转账支出',
    hint: '转给家人、大宗购买等 · 算支出 · 归属指定银行活期'
  }
])

export const CHANNEL_IDS = Object.freeze(EXPENSE_CHANNELS.map(c => c.id))

export function incomeCategoryName(id) {
  return INCOME_CATEGORIES.find(c => c.id === id)?.name || id || '其它'
}

export function channelName(id) {
  return EXPENSE_CHANNELS.find(c => c.id === id)?.name || id
}

/**
 * 空通道结构
 * @param {string} [defaultBankId]
 */
export function emptyChannels(defaultBankId = 'cmb') {
  const base = {}
  for (const ch of CHANNEL_IDS) {
    base[ch] = { amount: 0, bankId: defaultBankId }
  }
  return base
}
