<template>
  <div class="space-y-8">
    <!-- 总资产：最大、最安静 -->
    <section>
      <p class="text-sm text-subtext-light dark:text-subtext-dark mb-1">总资产</p>
      <p class="text-3xl sm:text-4xl font-semibold tracking-tight text-text-light dark:text-text-dark tabular-nums">
        ¥{{ formatAmount(totalAssetsCorrect) }}
      </p>
    </section>

    <!-- 资金池 + 本月 -->
    <section class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-5">
        <div class="flex items-start justify-between gap-3 mb-3">
          <div>
            <p class="text-sm text-subtext-light dark:text-subtext-dark">资金池</p>
            <p class="text-2xl font-semibold text-text-light dark:text-text-dark tabular-nums mt-1">
              ¥{{ formatAmount(cashPool) }}
            </p>
          </div>
          <LineIcon name="wallet" :size="20" class-name="text-subtext-light dark:text-subtext-dark mt-0.5" />
        </div>
        <p class="text-xs text-subtext-light dark:text-subtext-dark leading-relaxed mb-3">
          已记入系统的可分配现金，不是某张银行卡
        </p>
        <div class="w-full h-1 rounded-full bg-border-light dark:bg-border-dark overflow-hidden">
          <div
            class="h-full rounded-full bg-primary transition-all duration-300"
            :style="{ width: `${Math.min((cashPool / transferTarget) * 100, 100)}%` }"
          />
        </div>
        <p class="text-xs text-subtext-light dark:text-subtext-dark mt-2 tabular-nums">
          <template v-if="cashPool >= transferTarget">已达转存目标 ¥{{ formatAmount(transferTarget) }}</template>
          <template v-else>距目标 ¥{{ formatAmount(transferTarget) }} 还差 ¥{{ formatAmount(transferTarget - cashPool) }}</template>
        </p>
      </div>

      <div class="rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-5">
        <div class="flex items-start justify-between gap-3 mb-3">
          <div>
            <p class="text-sm text-subtext-light dark:text-subtext-dark">{{ currentMonthLabel }}</p>
            <p class="text-2xl font-semibold text-text-light dark:text-text-dark tabular-nums mt-1">
              ¥{{ formatAmount(currentMonthNet) }}
            </p>
          </div>
          <LineIcon name="calendar" :size="20" class-name="text-subtext-light dark:text-subtext-dark mt-0.5" />
        </div>
        <p class="text-xs text-subtext-light dark:text-subtext-dark">
          {{ getCurrentMonthStatus() }} · 按月流量，进入资金池累计
        </p>
      </div>
    </section>

    <!-- 资产分布 -->
    <section class="rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-5 sm:p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-sm font-medium text-text-light dark:text-text-dark flex items-center gap-2">
          <LineIcon name="layers" :size="18" class-name="text-subtext-light dark:text-subtext-dark" />
          资产分布
        </h2>
        <span class="text-xs text-subtext-light dark:text-subtext-dark tabular-nums">
          合计 ¥{{ formatAmount(totalAssetsCorrect) }}
        </span>
      </div>

      <!-- 占比条 -->
      <div
        v-if="totalAssetsCorrect > 0"
        class="flex h-2 w-full rounded-full overflow-hidden mb-5 bg-border-light dark:bg-border-dark"
      >
        <div
          v-for="row in assetRows"
          :key="row.key"
          v-show="row.amount > 0"
          class="h-full transition-all"
          :class="row.barClass"
          :style="{ width: row.pct + '%' }"
          :title="`${row.label} ${row.pct}%`"
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
            <span class="text-sm text-text-light dark:text-text-dark truncate">{{ row.label }}</span>
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
    </section>

    <!-- 到期（仅有数据时显示） -->
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

    <!-- 快捷操作 -->
    <section class="flex flex-wrap gap-3">
      <button
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border-light dark:border-border-dark
               text-sm font-medium text-text-light dark:text-text-dark
               bg-card-light dark:bg-card-dark
               hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors"
        @click="showTransferDialog = true"
      >
        <LineIcon name="transfer" :size="18" />
        资产间划转
      </button>
    </section>

    <TransferDialog
      v-model="showTransferDialog"
      @success="handleTransferSuccess"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { formatAmount } from '../utils/format.js'
import { useFinanceStore } from '../stores/finance'
import { useBankDepositStore } from '../stores/bankDeposit'
import { useStockInvestmentStore } from '../stores/stockInvestment'
import { useLentMoneyStore } from '../stores/lentMoney'
import { useFundTransferStore } from '../stores/fundTransfer'
import TransferDialog from './TransferDialog.vue'
import LineIcon from './LineIcon.vue'

const transferTarget = 50000

const financeStore = useFinanceStore()
const bankDepositStore = useBankDepositStore()
const stockStore = useStockInvestmentStore()
const lentMoneyStore = useLentMoneyStore()
const transferStore = useFundTransferStore()

const showTransferDialog = ref(false)

const currentMonthNet = computed(() => financeStore.currentMonthNet.amount || 0)
const currentMonthLabel = computed(() => financeStore.currentMonthLabel)
const cashPool = computed(() => financeStore.cashPool)
const totalDepositAmount = computed(() => bankDepositStore.totalDepositAmount)
const totalInvestmentAssets = computed(() => stockStore.totalInvestmentAssets)
const pendingAmount = computed(() => lentMoneyStore.pendingAmount)

const totalAssetsCorrect = computed(() => {
  return cashPool.value + totalDepositAmount.value + totalInvestmentAssets.value + pendingAmount.value
})

const assetRows = computed(() => {
  const total = totalAssetsCorrect.value
  const rows = [
    {
      key: 'pool',
      label: '资金池',
      amount: cashPool.value,
      barClass: 'bg-slate-500 dark:bg-slate-400',
      dotClass: 'bg-slate-500 dark:bg-slate-400'
    },
    {
      key: 'bank',
      label: '银行存款',
      amount: totalDepositAmount.value,
      barClass: 'bg-emerald-600/80',
      dotClass: 'bg-emerald-600'
    },
    {
      key: 'stock',
      label: '股票投资',
      amount: totalInvestmentAssets.value,
      barClass: 'bg-indigo-500/80',
      dotClass: 'bg-indigo-500'
    },
    {
      key: 'lent',
      label: '借出资金',
      amount: pendingAmount.value,
      barClass: 'bg-amber-600/70',
      dotClass: 'bg-amber-600'
    }
  ]
  return rows.map(r => ({
    ...r,
    pct: total > 0 ? (r.amount / total) * 100 : 0
  }))
})

const maturingCount = computed(() => {
  const d = bankDepositStore.maturingDeposits?.length || 0
  const l = lentMoneyStore.maturingRecords?.length || 0
  return d + l
})

const maturingAmount = computed(() => {
  const deposits = bankDepositStore.maturingDeposits || []
  const lends = lentMoneyStore.maturingRecords || []
  const dSum = deposits.reduce((s, x) => s + (Number(x.amount) || 0), 0)
  const lSum = lends.reduce((s, x) => s + (Number(x.amount) || 0), 0)
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

const handleTransferSuccess = () => {
  financeStore.loadFromLocalStorage()
  bankDepositStore.loadFromLocalStorage()
  stockStore.loadFromLocalStorage()
  lentMoneyStore.loadFromLocalStorage()
  transferStore.loadTransfers()
}

onMounted(() => {
  financeStore.loadFromLocalStorage()
  bankDepositStore.loadFromLocalStorage()
  stockStore.loadFromLocalStorage()
  lentMoneyStore.loadFromLocalStorage()
  transferStore.loadTransfers()
})
</script>
