import { defineStore } from 'pinia'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
import {
  currentMonthKey,
  prevMonthKey,
  monthKeysInclusive,
  formatMonthLabel
} from '../utils/monthKeys.js'
import {
  buildMonthlyStatement,
  normalizeBreakdown,
  reconstructClosingFromNet
} from '../utils/monthlyStatement.js'
import { calcAssetBreakdown } from '../utils/assetTotals.js'
import { useOpeningBalanceStore } from './openingBalance.js'
import { useFinanceStore } from './finance.js'
import { useBankAccountsStore } from './bankAccounts.js'
import { useStockInvestmentStore } from './stockInvestment.js'
import { useFundInvestmentStore } from './fundInvestment.js'
import { useLentMoneyStore } from './lentMoney.js'

/**
 * 月度账单（报表层）
 *
 * - 不切割当前账：月中入账立刻改活期/总资产
 * - 进入新自然月后（1 号及之后、或下次打开 App），为「上一完整自然月」及此前缺失月生成只读账单
 */
export const useMonthlyStatementsStore = defineStore('monthlyStatements', {
  state: () => ({
    /** @type {Array<object>} */
    statements: [],
    /** 最近一次结转说明（UI 可提示） */
    lastCatchUpNote: null
  }),

  getters: {
    sorted: (state) =>
      [...state.statements].sort((a, b) => b.month.localeCompare(a.month)),

    byMonth: (state) => (month) =>
      state.statements.find(s => s.month === month) || null,

    /** 上一自然月账单（若已生成） */
    previousMonthStatement() {
      const prev = prevMonthKey(currentMonthKey())
      return this.byMonth(prev)
    },

    latestStatement() {
      return this.sorted[0] || null
    },

    hasStatement: (state) => (month) =>
      state.statements.some(s => s.month === month)
  },

  actions: {
    loadFromLocalStorage() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.MONTHLY_STATEMENTS)
        if (!raw) {
          this.statements = []
          return
        }
        const parsed = JSON.parse(raw)
        this.statements = Array.isArray(parsed)
          ? parsed.map(normalizeStoredStatement)
          : []
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('加载月度账单失败', e)
        this.statements = []
      }
    },

    saveToLocalStorage() {
      try {
        localStorage.setItem(
          STORAGE_KEYS.MONTHLY_STATEMENTS,
          JSON.stringify(this.statements)
        )
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('保存月度账单失败', e)
      }
    },

    clearAll() {
      this.statements = []
      this.lastCatchUpNote = null
      this.saveToLocalStorage()
    },

    /**
     * 启动 / 进入总览时调用：按自然月补齐缺失账单（不改当前账数字）
     * @param {{ now?: Date }} [opts]
     * @returns {{ created: string[], skipped: string }}
     */
    ensureCatchUp(opts = {}) {
      const now = opts.now instanceof Date ? opts.now : new Date()
      const openingStore = useOpeningBalanceStore()
      openingStore.loadFromLocalStorage()

      if (!openingStore.hasOpenedBooks || !openingStore.date) {
        this.lastCatchUpNote = null
        return { created: [], skipped: '未建账' }
      }

      const openingMonth = String(openingStore.date).slice(0, 7)
      if (!/^\d{4}-\d{2}$/.test(openingMonth)) {
        return { created: [], skipped: '建账日期无效' }
      }

      const cur = currentMonthKey(now)
      const lastSealable = prevMonthKey(cur)
      // 建账所在月及之后、且已完整结束的自然月
      if (lastSealable < openingMonth) {
        this.lastCatchUpNote = null
        return { created: [], skipped: '尚无完整可结转月' }
      }

      const financeStore = useFinanceStore()
      const months = monthKeysInclusive(openingMonth, lastSealable)
      const created = []
      let runningOpening = openingStore.openingSnapshot
        ? normalizeBreakdown(openingStore.openingSnapshot)
        : null

      // 若已有更早账单，用其 closing 接龙
      const existingBefore = this.statements
        .filter(s => s.month < openingMonth)
        .sort((a, b) => a.month.localeCompare(b.month))
      void existingBefore

      for (const month of months) {
        const existing = this.byMonth(month)
        if (existing) {
          runningOpening = existing.closing
            ? normalizeBreakdown(existing.closing)
            : runningOpening
          continue
        }

        const financeRow = financeStore.monthById(month)
        const flowNet =
          financeRow != null
            ? Number(financeRow.netIncome) ||
              (Number(financeRow.income) || 0) - (Number(financeRow.expense) || 0)
            : 0

        const isLatest = month === lastSealable
        let closing
        let assetMode
        let note = ''

        if (isLatest) {
          closing = this._liveBreakdown()
          assetMode = 'snapshot'
          const day = now.getDate()
          if (day > 1 || this._currentMonthHasActivity(cur, financeStore)) {
            note =
              '结存为生成时点的当前账快照；若本月已有操作，期末数可能含本月变动。收支仍为该自然月流量。'
          }
        } else if (runningOpening) {
          closing = reconstructClosingFromNet(runningOpening, flowNet)
          assetMode = 'reconstructed'
          note =
            '补历史月结存：仅按外部净流入推算活期/总资产，未还原内部划转结构。'
        } else {
          closing = this._liveBreakdown()
          assetMode = 'snapshot'
          note = '缺少期初快照，结存暂用生成时点当前账（仅供参考）。'
        }

        const statement = buildMonthlyStatement({
          month,
          financeRow,
          opening: runningOpening,
          closing,
          assetMode,
          closedAt: now.toISOString(),
          note
        })

        this.statements.push(statement)
        created.push(month)
        runningOpening = normalizeBreakdown(statement.closing)
      }

      if (created.length) {
        this.saveToLocalStorage()
        this.lastCatchUpNote = `已生成月度账单：${created
          .map(formatMonthLabel)
          .join('、')}`
      } else {
        this.lastCatchUpNote = null
      }

      return { created, skipped: created.length ? '' : '已是最新' }
    },

    _liveBreakdown() {
      const banks = useBankAccountsStore()
      const stocks = useStockInvestmentStore()
      const funds = useFundInvestmentStore()
      const lent = useLentMoneyStore()
      return calcAssetBreakdown({
        accounts: banks.accounts,
        stocks: stocks.stocks,
        funds: funds.funds,
        lentRecords: lent.lentRecords
      })
    },

    _currentMonthHasActivity(cur, financeStore) {
      const row = financeStore.monthById(cur)
      if (!row) return false
      return (
        (Number(row.income) || 0) > 0 ||
        (Number(row.expense) || 0) > 0 ||
        (Array.isArray(row.incomes) && row.incomes.length > 0)
      )
    },

    /**
     * 手动重生成某月账单（覆盖；仍不改当前账）
     */
    regenerateMonth(month) {
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        throw new Error('月份格式应为 YYYY-MM')
      }
      const financeStore = useFinanceStore()
      const financeRow = financeStore.monthById(month)
      const prev = prevMonthKey(month)
      const prevStmt = this.byMonth(prev)
      const openingStore = useOpeningBalanceStore()
      let opening = prevStmt?.closing
        ? normalizeBreakdown(prevStmt.closing)
        : null
      if (!opening && openingStore.date && String(openingStore.date).slice(0, 7) === month) {
        opening = openingStore.openingSnapshot
          ? normalizeBreakdown(openingStore.openingSnapshot)
          : null
      }
      if (!opening && openingStore.openingSnapshot) {
        opening = normalizeBreakdown(openingStore.openingSnapshot)
      }

      const cur = currentMonthKey()
      const isPastOrPrev = month < cur
      if (!isPastOrPrev) {
        throw new Error('仅可为已结束的自然月生成账单')
      }

      const isLatest = month === prevMonthKey(cur)
      const flowNet =
        financeRow != null
          ? Number(financeRow.netIncome) ||
            (Number(financeRow.income) || 0) - (Number(financeRow.expense) || 0)
          : 0

      const closing = isLatest
        ? this._liveBreakdown()
        : opening
          ? reconstructClosingFromNet(opening, flowNet)
          : this._liveBreakdown()

      const statement = buildMonthlyStatement({
        month,
        financeRow,
        opening,
        closing,
        assetMode: isLatest ? 'snapshot' : 'reconstructed',
        note: isLatest ? '手动重生成' : '手动重生成（结构推算）'
      })

      const idx = this.statements.findIndex(s => s.month === month)
      if (idx >= 0) this.statements[idx] = statement
      else this.statements.push(statement)
      this.saveToLocalStorage()
      return statement
    }
  }
})

function normalizeStoredStatement(raw) {
  if (!raw || !raw.month) return raw
  return {
    ...raw,
    opening: raw.opening ? normalizeBreakdown(raw.opening) : null,
    closing: raw.closing ? normalizeBreakdown(raw.closing) : normalizeBreakdown({}),
    income: Number(raw.income) || 0,
    expense: Number(raw.expense) || 0,
    netIncome: Number(raw.netIncome) || 0
  }
}
