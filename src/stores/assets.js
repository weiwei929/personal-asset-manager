import { defineStore } from 'pinia'
import { useBankAccountsStore } from './bankAccounts.js'
import { useStockInvestmentStore } from './stockInvestment.js'
import { useFundInvestmentStore } from './fundInvestment.js'
import { useLentMoneyStore } from './lentMoney.js'
import { calcAssetBreakdown } from '../utils/assetTotals.js'

/**
 * 总资产单一计算源（D1 · G1）
 *
 * - 纯函数：`utils/assetTotals.js` → `calcAssetBreakdown`
 * - 各页只读本 store 的 totalAssets / structureRows / totalDemand 等
 * - 禁止用 finance.cashPool 或本地 sum 拼「总资产」
 *
 * totalAssets = Σ活期 + Σ定期 + Σ股基投入本金 + Σ借出未还
 */
export const useAssetsStore = defineStore('assets', {
  getters: {
    _parts() {
      const banks = useBankAccountsStore()
      const stocks = useStockInvestmentStore()
      const funds = useFundInvestmentStore()
      const lent = useLentMoneyStore()
      return {
        accounts: banks.accounts,
        stocks: stocks.stocks,
        funds: funds.funds,
        lentRecords: lent.lentRecords
      }
    },

    breakdown() {
      return calcAssetBreakdown(this._parts)
    },

    totalDemand() {
      return this.breakdown.totalDemand
    },

    totalTimeDeposit() {
      return this.breakdown.totalTimeDeposit
    },

    /** 可用现金 = 四行活期 */
    totalAvailableCash() {
      return this.totalDemand
    },

    /** 银行存款分项 = 仅定期 */
    totalBankDeposits() {
      return this.totalTimeDeposit
    },

    totalInvestedPrincipal() {
      return this.breakdown.totalInvestedPrincipal
    },

    totalLent() {
      return this.breakdown.totalLent
    },

    /** 市值仅观察 */
    totalMarketValue() {
      return this.breakdown.totalMarketValue
    },

    totalAssets() {
      return this.breakdown.totalAssets
    },

    /**
     * 总览结构四块（+ 可选市值注释）
     */
    structureRows() {
      const b = this.breakdown
      const total = b.totalAssets
      const rows = [
        {
          key: 'demand',
          label: '可用现金',
          sublabel: '四行活期',
          amount: b.totalDemand
        },
        {
          key: 'time',
          label: '银行存款',
          sublabel: '定期产品',
          amount: b.totalTimeDeposit
        },
        {
          key: 'invest',
          label: '股/基投入本金',
          sublabel: '市值仅观察',
          amount: b.totalInvestedPrincipal
        },
        {
          key: 'lent',
          label: '个人借贷',
          sublabel: '未还本金',
          amount: b.totalLent
        }
      ]
      return rows.map(r => ({
        ...r,
        pct: total > 0 ? (r.amount / total) * 100 : 0
      }))
    }
  }
})
