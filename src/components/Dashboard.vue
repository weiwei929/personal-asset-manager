<template>
  <div class="space-y-8">
    <!-- 总资产 · 当前账 -->
    <section>
      <p class="text-sm text-subtext-light dark:text-subtext-dark mb-1">总资产 · 当前账</p>
      <p class="text-3xl sm:text-4xl font-semibold tracking-tight text-text-light dark:text-text-dark tabular-nums">
        ¥{{ formatAmount(totalAssets) }}
      </p>
      <p class="text-xs text-subtext-light dark:text-subtext-dark mt-1">
        活期 + 定期 + 股基投入本金 + 个人借贷未还 · 月中保存即更新
        <span v-if="openingDate"> · 建账基准 {{ openingDate }}</span>
      </p>
      <p
        v-if="catchUpNote"
        class="text-xs text-emerald-700 dark:text-emerald-400 mt-2"
      >
        {{ catchUpNote }}
      </p>
    </section>

    <!-- 可用现金 + 本月外部 -->
    <section class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-5">
        <div class="flex items-start justify-between gap-3 mb-3">
          <div>
            <p class="text-sm text-subtext-light dark:text-subtext-dark">可用现金</p>
            <p class="text-2xl font-semibold text-text-light dark:text-text-dark tabular-nums mt-1">
              ¥{{ formatAmount(totalDemand) }}
            </p>
          </div>
          <LineIcon name="wallet" :size="20" class-name="text-subtext-light dark:text-subtext-dark mt-0.5" />
        </div>
        <p class="text-xs text-subtext-light dark:text-subtext-dark leading-relaxed mb-3">
          四行银行活期合计 · 日常支出唯一出口
        </p>
        <ul class="space-y-1 text-xs text-subtext-light dark:text-subtext-dark">
          <li
            v-for="b in bankDemandRows"
            :key="b.id"
            class="flex justify-between tabular-nums"
          >
            <span>{{ b.name }}</span>
            <span>¥{{ formatAmount(b.demandBalance) }}</span>
          </li>
        </ul>
      </div>

      <div class="rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-5">
        <div class="flex items-start justify-between gap-3 mb-3">
          <div>
            <p class="text-sm text-subtext-light dark:text-subtext-dark">{{ currentMonthTitle }} · 外部增减</p>
            <p class="text-xs text-subtext-light dark:text-subtext-dark mt-0.5">
              {{ getCurrentMonthStatus() }} · 已入当前账（影响总资产）
            </p>
          </div>
          <LineIcon name="calendar" :size="20" class-name="text-subtext-light dark:text-subtext-dark mt-0.5" />
        </div>
        <ul class="space-y-2.5">
          <li class="flex items-baseline justify-between gap-3">
            <span class="text-sm text-subtext-light dark:text-subtext-dark">收入</span>
            <span class="text-base font-semibold tabular-nums text-text-light dark:text-text-dark">
              ¥{{ formatAmount(currentMonthIncome) }}
            </span>
          </li>
          <li class="flex items-baseline justify-between gap-3">
            <span class="text-sm text-subtext-light dark:text-subtext-dark">支出</span>
            <span class="text-base font-semibold tabular-nums text-text-light dark:text-text-dark">
              ¥{{ formatAmount(currentMonthExpense) }}
            </span>
          </li>
          <li class="flex items-baseline justify-between gap-3 pt-2 border-t border-border-light/80 dark:border-border-dark/80">
            <span class="text-sm text-subtext-light dark:text-subtext-dark">净收入</span>
            <span
              class="text-xl font-semibold tabular-nums"
              :class="currentMonthNet >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-500'"
            >
              ¥{{ formatAmount(currentMonthNet) }}
            </span>
          </li>
        </ul>
      </div>
    </section>

    <!-- 上月月度账单 -->
    <section
      v-if="prevStatement"
      class="rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-5"
    >
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-medium text-text-light dark:text-text-dark">
          {{ prevStatementTitle }} · 月度账单
        </h2>
        <span class="text-xs text-subtext-light dark:text-subtext-dark">只读结转 · 不切割当前账</span>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <div>
          <p class="text-xs text-subtext-light dark:text-subtext-dark">收入</p>
          <p class="text-sm font-semibold tabular-nums">¥{{ formatAmount(prevStatement.income) }}</p>
        </div>
        <div>
          <p class="text-xs text-subtext-light dark:text-subtext-dark">支出</p>
          <p class="text-sm font-semibold tabular-nums">¥{{ formatAmount(prevStatement.expense) }}</p>
        </div>
        <div>
          <p class="text-xs text-subtext-light dark:text-subtext-dark">净流入</p>
          <p
            class="text-sm font-semibold tabular-nums"
            :class="prevStatement.netIncome >= 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-500'"
          >
            ¥{{ formatAmount(prevStatement.netIncome) }}
          </p>
        </div>
        <div>
          <p class="text-xs text-subtext-light dark:text-subtext-dark">期末总资产</p>
          <p class="text-sm font-semibold tabular-nums">
            ¥{{ formatAmount(prevStatement.closing?.totalAssets) }}
          </p>
        </div>
      </div>
      <p
        v-if="prevStatement.opening"
        class="text-xs text-subtext-light dark:text-subtext-dark"
      >
        期初总资产 ¥{{ formatAmount(prevStatement.opening.totalAssets) }}
        <span v-if="prevStatement.check" class="ml-1">
          · 验算
          {{ prevStatement.check.aligned ? '对齐' : '有差额（含内部划转或延迟结转属正常）' }}
        </span>
      </p>
      <button
        type="button"
        class="mt-3 text-xs text-primary"
        @click="emit('openDialog', 'monthlyFinance')"
      >
        查看全部账单与流水 →
      </button>
    </section>
    <section
      v-else-if="hasOpenedBooks"
      class="rounded-xl border border-dashed border-border-light dark:border-border-dark p-5"
    >
      <p class="text-sm text-subtext-light dark:text-subtext-dark">
        尚无上月月度账单。进入下一个自然月后，将自动为已结束月份生成只读账单。
      </p>
    </section>

    <!-- 资产结构四块 -->
    <section class="rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-5 sm:p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-sm font-medium text-text-light dark:text-text-dark flex items-center gap-2">
          <LineIcon name="layers" :size="18" class-name="text-subtext-light dark:text-subtext-dark" />
          资产结构
        </h2>
        <span class="text-xs text-subtext-light dark:text-subtext-dark tabular-nums">
          合计 ¥{{ formatAmount(totalAssets) }}
        </span>
      </div>

      <div
        v-if="totalAssets > 0"
        class="flex h-2 w-full rounded-full overflow-hidden mb-5 bg-border-light dark:bg-border-dark"
      >
        <div
          v-for="row in assetRows"
          :key="row.key"
          v-show="row.amount > 0"
          class="h-full transition-all"
          :class="row.barClass"
          :style="{ width: row.pct + '%' }"
          :title="`${row.label} ${row.pct.toFixed(1)}%`"
        />
      </div>
      <div
        v-else
        class="h-2 w-full rounded-full bg-border-light dark:bg-border-dark mb-5"
      />

      <ul class="space-y-1">
        <li
          v-for="row in assetRows"
          :key="row.key"
          class="flex items-center justify-between py-2.5 border-b border-border-light/80 dark:border-border-dark/80 last:border-0"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-2 h-2 rounded-full shrink-0" :class="row.dotClass" />
            <div class="min-w-0">
              <span class="text-sm text-text-light dark:text-text-dark truncate block">{{ row.label }}</span>
              <span v-if="row.sublabel" class="text-xs text-subtext-light dark:text-subtext-dark">{{ row.sublabel }}</span>
            </div>
          </div>
          <div class="text-right shrink-0 pl-3">
            <p class="text-sm font-medium text-text-light dark:text-text-dark tabular-nums">
              ¥{{ formatAmount(row.amount) }}
            </p>
            <p class="text-xs text-subtext-light dark:text-subtext-dark tabular-nums">
              {{ row.pct.toFixed(1) }}%
            </p>
          </div>
        </li>
      </ul>

      <div
        class="mt-4 pt-3 border-t border-border-light/80 dark:border-border-dark/80 text-xs text-subtext-light dark:text-subtext-dark space-y-1"
      >
        <p>
          股/基投入本金 ¥{{ formatAmount(totalInvestedPrincipal) }}
          · 观察市值 ¥{{ formatAmount(totalMarketValue) }}
          <span class="text-amber-700 dark:text-amber-400">（市值不计入总资产）</span>
        </p>
        <p>个人借贷未还 ¥{{ formatAmount(totalLent) }} · {{ lentPendingCount }} 笔待还</p>
      </div>
    </section>

    <!-- 到期 -->
    <section
      v-if="maturingCount > 0"
      class="rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-5"
    >
      <div class="flex items-center gap-2 mb-2">
        <LineIcon name="clock" :size="18" class-name="text-subtext-light dark:text-subtext-dark" />
        <h2 class="text-sm font-medium text-text-light dark:text-text-dark">近期到期</h2>
      </div>
      <p class="text-sm text-subtext-light dark:text-subtext-dark">
        {{ maturingCount }} 笔 · 约 ¥{{ formatAmount(maturingAmount) }}
      </p>
    </section>

    <!-- D4：口径与口诀（半页 · 默认折叠） -->
    <section
      class="rounded-xl border border-dashed border-border-light dark:border-border-dark
             bg-card-light/40 dark:bg-card-dark/40 overflow-hidden"
    >
      <details class="group">
        <summary
          class="cursor-pointer list-none flex items-center justify-between gap-3 px-5 py-4
                 text-sm font-medium text-text-light dark:text-text-dark
                 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors
                 [&::-webkit-details-marker]:hidden"
        >
          <span class="flex items-center gap-2 min-w-0">
            <LineIcon name="layers" :size="18" class-name="text-subtext-light dark:text-subtext-dark shrink-0" />
            <span class="truncate">口径与口诀</span>
            <span class="text-xs font-normal text-subtext-light dark:text-subtext-dark hidden sm:inline">
              · 钱怎么算 · 怎么记
            </span>
          </span>
          <span
            class="text-xs text-subtext-light dark:text-subtext-dark shrink-0
                   group-open:hidden"
          >展开</span>
          <span
            class="text-xs text-subtext-light dark:text-subtext-dark shrink-0
                   hidden group-open:inline"
          >收起</span>
        </summary>
        <div
          class="px-5 pb-5 pt-0 border-t border-border-light/80 dark:border-border-dark/80
                 text-xs text-subtext-light dark:text-subtext-dark leading-relaxed space-y-4"
        >
          <p class="pt-4 text-text-light/90 dark:text-text-dark/90">
            {{ productTagline }}
          </p>

          <div>
            <p class="font-medium text-text-light dark:text-text-dark mb-1">总资产（定稿）</p>
            <p class="font-mono text-[11px] sm:text-xs tabular-nums text-text-light dark:text-text-dark">
              {{ totalAssetsFormula }}
            </p>
            <p class="mt-1.5">{{ ledgerFlow }}</p>
          </div>

          <div>
            <p class="font-medium text-text-light dark:text-text-dark mb-1.5">怎么记</p>
            <ol class="space-y-1.5 list-decimal list-inside">
              <li v-for="(line, i) in operationSlogans" :key="'op-' + i">{{ line }}</li>
            </ol>
          </div>

          <div>
            <p class="font-medium text-text-light dark:text-text-dark mb-1.5">原则（会诊）</p>
            <ul class="space-y-1 list-disc list-inside">
              <li v-for="(line, i) in governanceSlogans" :key="'gov-' + i">{{ line }}</li>
            </ul>
          </div>

          <div>
            <p class="font-medium text-text-light dark:text-text-dark mb-1.5">文字兜底 · 不做</p>
            <ul class="space-y-1 list-disc list-inside">
              <li v-for="(line, i) in textFallbacks" :key="'fb-' + i">{{ line }}</li>
            </ul>
          </div>
        </div>
      </details>
    </section>

    <!-- 快捷入口 -->
    <section class="flex flex-wrap gap-2">
      <button type="button" class="chip" @click="emit('openDialog', 'monthlyFinance')">月度收支</button>
      <button type="button" class="chip" @click="emit('openDialog', 'bankDeposit')">银行账户</button>
      <button type="button" class="chip" @click="emit('openDialog', 'stockInvestment')">投资</button>
      <button type="button" class="chip" @click="emit('openDialog', 'lentMoney')">个人借贷</button>
      <button type="button" class="chip" @click="emit('openDialog', 'openingBooks')">期初建账</button>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { formatAmount } from '../utils/format.js'
import { useFinanceStore } from '../stores/finance'
import { useBankAccountsStore } from '../stores/bankAccounts'
import { useStockInvestmentStore } from '../stores/stockInvestment'
import { useFundInvestmentStore } from '../stores/fundInvestment'
import { useLentMoneyStore } from '../stores/lentMoney'
import { useAssetsStore } from '../stores/assets'
import { useOpeningBalanceStore } from '../stores/openingBalance'
import { useMonthlyStatementsStore } from '../stores/monthlyStatements'
import MonthlyFinance from '../models/MonthlyFinance.js'
import { formatMonthLabel } from '../utils/monthKeys.js'
import LineIcon from './LineIcon.vue'
import {
  PRODUCT_TAGLINE,
  TOTAL_ASSETS_FORMULA,
  LEDGER_FLOW,
  OPERATION_SLOGANS,
  GOVERNANCE_SLOGANS,
  TEXT_FALLBACKS
} from '../constants/ledgerGuide.js'

const productTagline = PRODUCT_TAGLINE
const totalAssetsFormula = TOTAL_ASSETS_FORMULA
const ledgerFlow = LEDGER_FLOW
const operationSlogans = OPERATION_SLOGANS
const governanceSlogans = GOVERNANCE_SLOGANS
const textFallbacks = TEXT_FALLBACKS

const emit = defineEmits(['openDialog'])

const financeStore = useFinanceStore()
const bankAccountsStore = useBankAccountsStore()
const stockStore = useStockInvestmentStore()
const fundInvestStore = useFundInvestmentStore()
const lentMoneyStore = useLentMoneyStore()
const assetsStore = useAssetsStore()
const openingStore = useOpeningBalanceStore()
const statementsStore = useMonthlyStatementsStore()

const openingDate = computed(() => openingStore.date)
const hasOpenedBooks = computed(() => openingStore.hasOpenedBooks)
const catchUpNote = computed(() => statementsStore.lastCatchUpNote)
const prevStatement = computed(() => statementsStore.previousMonthStatement)
const prevStatementTitle = computed(() =>
  prevStatement.value ? formatMonthLabel(prevStatement.value.month) : ''
)

const currentMonth = MonthlyFinance.getCurrentMonth()
const currentMonthRow = computed(() =>
  financeStore.monthlyFinances.find(m => m.month === currentMonth)
)
const currentMonthNet = computed(() => financeStore.currentMonthNet.amount || 0)
/** 如「2026年07月」 */
const currentMonthTitle = computed(() =>
  MonthlyFinance.formatMonth(currentMonth)
)
const currentMonthIncome = computed(() => Number(currentMonthRow.value?.income) || 0)
const currentMonthExpense = computed(() => Number(currentMonthRow.value?.expense) || 0)

const totalAssets = computed(() => assetsStore.totalAssets)
const totalDemand = computed(() => assetsStore.totalDemand)
const totalMarketValue = computed(() => assetsStore.totalMarketValue)
const totalInvestedPrincipal = computed(() => assetsStore.totalInvestedPrincipal)
const totalLent = computed(() => assetsStore.totalLent)

const bankDemandRows = computed(() =>
  (bankAccountsStore.accounts || []).map(a => ({
    id: a.id,
    name: a.name,
    demandBalance: Number(a.demandBalance) || 0
  }))
)

const lentPendingCount = computed(
  () => lentMoneyStore.statistics?.pendingRecords || 0
)

const BAR = {
  demand: { barClass: 'bg-slate-500 dark:bg-slate-400', dotClass: 'bg-slate-500 dark:bg-slate-400' },
  time: { barClass: 'bg-emerald-600/80', dotClass: 'bg-emerald-600' },
  invest: { barClass: 'bg-indigo-500/80', dotClass: 'bg-indigo-500' },
  lent: { barClass: 'bg-amber-600/70', dotClass: 'bg-amber-600' }
}

const assetRows = computed(() =>
  assetsStore.structureRows.map(r => ({
    ...r,
    ...(BAR[r.key] || BAR.demand)
  }))
)

const maturingCount = computed(() => {
  const d = bankAccountsStore.maturingTimeDeposits?.length || 0
  const l = lentMoneyStore.maturingRecords?.length || 0
  return d + l
})

const maturingAmount = computed(() => {
  const deposits = bankAccountsStore.maturingTimeDeposits || []
  const lends = lentMoneyStore.maturingRecords || []
  const dSum = deposits.reduce((s, x) => s + (Number(x.principal) || 0), 0)
  const lSum = lends.reduce(
    (s, x) => s + (Number(x.remainingAmount ?? x.amount) || 0),
    0
  )
  return dSum + lSum
})

const getCurrentMonthStatus = () => {
  const today = new Date()
  const dayOfMonth = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  if (dayOfMonth <= 10) return '月初'
  if (dayOfMonth >= daysInMonth - 5) return '月末'
  return '月中'
}

onMounted(() => {
  financeStore.loadFromLocalStorage()
  bankAccountsStore.loadFromLocalStorage()
  stockStore.loadFromLocalStorage()
  fundInvestStore.loadFromLocalStorage()
  lentMoneyStore.loadFromLocalStorage()
  openingStore.loadFromLocalStorage()
  statementsStore.loadFromLocalStorage()
  statementsStore.ensureCatchUp()
})
</script>

<style scoped>
.chip {
  @apply inline-flex items-center px-3 py-2 rounded-lg border border-border-light dark:border-border-dark
    text-sm text-text-light dark:text-text-dark
    bg-card-light dark:bg-card-dark
    hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors;
}
</style>
