/**
 * localStorage / sessionStorage 键名表（G3 · D2 单一真源）
 *
 * 规则：
 * 1. 业务 store 读写只引用本文件常量，禁止魔法字符串
 * 2. 重置业务数据只清 ALL_CLEARABLE_KEYS（含旧键兼容）
 * 3. AUTH / THEME / 会话 不随「重置账本」清除
 * 4. 新模型优先 pam-*；旧键仅兼容清除或遗留模块，不新开业务写路径
 */

/** 现行键（含仍用旧字符串的过渡键） */
export const STORAGE_KEYS = Object.freeze({
  /** 四银行：活期 + 定期多笔 */
  BANK_ACCOUNTS: 'pam-bank-accounts',
  /** 银行异动简表 */
  BANK_MOVEMENTS: 'pam-bank-movements',
  /** 期初建账 { date, completedAt, openingSnapshot? } */
  OPENING_BALANCE: 'pam-opening-balance',
  /** 月度账单（只读结转，不切割当前账） */
  MONTHLY_STATEMENTS: 'pam-monthly-statements',
  /** 月度收支当前账（过渡键名，勿改字符串以免丢本地数据） */
  MONTHLY_FINANCES: 'monthlyFinances',
  /** 股票 */
  STOCK_INVESTMENTS: 'stock-investments',
  /** 基金 */
  FUND_INVESTMENTS: 'fund-investments',
  /** 借出 */
  LENT_MONEY: 'lent-money-records',
  /** 旧资金池划转历史（D3 已停写；重置仍清） */
  FUND_TRANSFERS: 'fundTransfers',
  /** 分类（若有；重置后可写回默认） */
  FINANCE_CATEGORIES: 'finance-categories',
  /**
   * 登录凭证 { salt, hash, createdAt }
   * 不在「重置业务数据」时清除
   */
  AUTH: 'pam-auth',
  /** 主题偏好（非账本；重置账本时保留） */
  THEME: 'theme-settings',
  /**
   * 曾绑定云端账本的轻量标记（B2 / P0-2(c)）
   * 值建议 { lastVersion, lastSyncedAt }，可选 email 哈希；不含账本正文。
   * 写入时机与普通/安全退出差异 → S4'（C2）；本常量仅登记归属。
   * 不进 ALL_CLEARABLE_KEYS / 同步 payload / dirty 白名单；resetSyncState 不得清除。
   */
  CLOUD_BOUND: 'pam-cloud-bound'
})

/**
 * 仅清除兼容的历史键（store 已不再主写，或旧模块）
 */
export const LEGACY_STORAGE_KEYS = Object.freeze({
  BANK_DEPOSITS: 'bank-deposits',
  BANK_DEPOSITS_CAMEL: 'bankDeposits',
  STOCK_INVESTMENTS_CAMEL: 'stockInvestments',
  LENT_MONEYS: 'lentMoneys'
})

/** 会话标记（sessionStorage，关标签页失效） */
export const SESSION_AUTH_KEY = 'pam-auth-session'

/**
 * 重置业务账本时清除的键（不含 AUTH / THEME / 会话）
 * = 现行业务键 + 旧键兼容
 */
export const ALL_CLEARABLE_KEYS = Object.freeze([
  STORAGE_KEYS.BANK_ACCOUNTS,
  STORAGE_KEYS.BANK_MOVEMENTS,
  STORAGE_KEYS.OPENING_BALANCE,
  STORAGE_KEYS.MONTHLY_STATEMENTS,
  STORAGE_KEYS.MONTHLY_FINANCES,
  STORAGE_KEYS.STOCK_INVESTMENTS,
  STORAGE_KEYS.FUND_INVESTMENTS,
  STORAGE_KEYS.LENT_MONEY,
  STORAGE_KEYS.FUND_TRANSFERS,
  STORAGE_KEYS.FINANCE_CATEGORIES,
  LEGACY_STORAGE_KEYS.BANK_DEPOSITS,
  LEGACY_STORAGE_KEYS.BANK_DEPOSITS_CAMEL,
  LEGACY_STORAGE_KEYS.STOCK_INVESTMENTS_CAMEL,
  LEGACY_STORAGE_KEYS.LENT_MONEYS
])

/** 重置时明确保留（文档用，供检查） */
export const PRESERVED_ON_RESET_KEYS = Object.freeze([
  STORAGE_KEYS.AUTH,
  STORAGE_KEYS.THEME,
  STORAGE_KEYS.CLOUD_BOUND
])
