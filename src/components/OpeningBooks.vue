<template>
  <div class="space-y-6">
    <!-- 说明 -->
    <section class="rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-5">
      <h2 class="text-sm font-medium text-text-light dark:text-text-dark mb-2">期初建账</h2>
      <p class="text-sm text-subtext-light dark:text-subtext-dark leading-relaxed">
        一次性录入<strong>当前存量快照</strong>（卡上实存）。
        提交后：{{ totalAssetsFormula }}。
      </p>
      <ul class="mt-3 text-xs text-subtext-light dark:text-subtext-dark space-y-1 list-disc list-inside leading-relaxed">
        <li>建账日<strong>及以前</strong>的工资/支出：已含在余额里，<strong>不必再记入账</strong></li>
        <li>建账日<strong>之后</strong>的增量：到「月度收支」保存并入账活期</li>
        <li>同月若建账前已有部分工资入账，只补记建账后的差额，勿整月再录一遍</li>
      </ul>
      <p
        v-if="alreadyOpened"
        class="text-xs text-amber-700 dark:text-amber-400 mt-3"
      >
        已建账（基准日 {{ openingStore.date }}）。再次提交将
        <strong>覆盖</strong> 四银行、股/基、个人借贷，并<strong>清空月度流水</strong>。
      </p>
    </section>

    <!-- ① 初始日期 -->
    <section class="rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-5">
      <h3 class="text-sm font-medium mb-3">① 初始日期</h3>
      <label class="block text-xs text-subtext-light dark:text-subtext-dark mb-1">建账基准日</label>
      <input
        v-model="form.date"
        type="date"
        class="field-input max-w-xs"
      />
    </section>

    <!-- ② 四行活期 + 定期 -->
    <section class="rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-medium">② 四银行 · 活期与定期</h3>
        <span class="text-xs text-subtext-light dark:text-subtext-dark tabular-nums">
          活期 ¥{{ formatAmount(preview.totalDemand) }} · 定期 ¥{{ formatAmount(preview.totalTimeDeposit) }}
        </span>
      </div>

      <div class="space-y-5">
        <div
          v-for="bank in form.banks"
          :key="bank.id"
          class="rounded-lg border border-border-light/80 dark:border-border-dark/80 p-4"
        >
          <div class="flex flex-wrap items-end gap-3 mb-3">
            <div class="min-w-[7rem]">
              <p class="text-sm font-medium text-text-light dark:text-text-dark">{{ bank.name }}</p>
              <p class="text-xs text-subtext-light dark:text-subtext-dark">{{ bank.id }}</p>
            </div>
            <div class="flex-1 min-w-[10rem]">
              <label class="block text-xs text-subtext-light dark:text-subtext-dark mb-1">活期余额</label>
              <input
                v-model.number="bank.demandBalance"
                type="number"
                min="0"
                step="0.01"
                class="field-input"
                placeholder="0"
              />
            </div>
            <button
              type="button"
              class="text-xs px-3 py-2 rounded-lg border border-border-light dark:border-border-dark
                     hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors"
              @click="addTimeDeposit(bank.id)"
            >
              + 定期产品
            </button>
          </div>

          <div v-if="bank.timeDeposits.length" class="space-y-2 pl-0 sm:pl-2">
            <div
              v-for="(td, tIdx) in bank.timeDeposits"
              :key="td._key"
              class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end"
            >
              <div class="sm:col-span-4">
                <label class="block text-xs text-subtext-light dark:text-subtext-dark mb-1">产品名称</label>
                <input v-model="td.name" type="text" class="field-input" placeholder="如 大额存单" />
              </div>
              <div class="sm:col-span-3">
                <label class="block text-xs text-subtext-light dark:text-subtext-dark mb-1">本金</label>
                <input v-model.number="td.principal" type="number" min="0" step="0.01" class="field-input" />
              </div>
              <div class="sm:col-span-2">
                <label class="block text-xs text-subtext-light dark:text-subtext-dark mb-1">起息</label>
                <input v-model="td.startDate" type="date" class="field-input" />
              </div>
              <div class="sm:col-span-2">
                <label class="block text-xs text-subtext-light dark:text-subtext-dark mb-1">到期</label>
                <input v-model="td.maturityDate" type="date" class="field-input" />
              </div>
              <div class="sm:col-span-1 flex justify-end">
                <button
                  type="button"
                  class="text-xs text-red-600 dark:text-red-400 py-2"
                  @click="removeTimeDeposit(bank.id, tIdx)"
                >
                  删
                </button>
              </div>
            </div>
          </div>
          <p v-else class="text-xs text-subtext-light dark:text-subtext-dark">暂无定期 · 可跳过</p>
        </div>
      </div>
    </section>

    <!-- ③ 股/基投入本金 -->
    <section class="rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-medium">③ 股票 / 基金 · 投入本金</h3>
        <span class="text-xs text-subtext-light dark:text-subtext-dark tabular-nums">
          本金合计 ¥{{ formatAmount(preview.totalInvestedPrincipal) }}
        </span>
      </div>
      <p class="text-xs text-subtext-light dark:text-subtext-dark mb-3">
        市值为可选观察字段，不计入总资产。可暂空，之后在投资页补录。
      </p>

      <div class="space-y-4">
        <div>
          <div class="flex items-center justify-between mb-2">
            <p class="text-xs font-medium text-subtext-light dark:text-subtext-dark">股票</p>
            <button type="button" class="text-xs text-primary" @click="addStock">+ 股票</button>
          </div>
          <div v-if="form.stocks.length" class="space-y-2">
            <div
              v-for="(row, idx) in form.stocks"
              :key="row._key"
              class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end"
            >
              <div class="sm:col-span-4">
                <input v-model="row.name" type="text" class="field-input" placeholder="名称" />
              </div>
              <div class="sm:col-span-3">
                <input v-model.number="row.investedPrincipal" type="number" min="0" step="0.01" class="field-input" placeholder="投入本金" />
              </div>
              <div class="sm:col-span-3">
                <input v-model.number="row.currentValue" type="number" min="0" step="0.01" class="field-input" placeholder="市值(观察)" />
              </div>
              <div class="sm:col-span-2 flex justify-end">
                <button type="button" class="text-xs text-red-600 dark:text-red-400 py-2" @click="form.stocks.splice(idx, 1)">删</button>
              </div>
            </div>
          </div>
          <p v-else class="text-xs text-subtext-light dark:text-subtext-dark">无</p>
        </div>

        <div>
          <div class="flex items-center justify-between mb-2">
            <p class="text-xs font-medium text-subtext-light dark:text-subtext-dark">基金</p>
            <button type="button" class="text-xs text-primary" @click="addFund">+ 基金</button>
          </div>
          <div v-if="form.funds.length" class="space-y-2">
            <div
              v-for="(row, idx) in form.funds"
              :key="row._key"
              class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end"
            >
              <div class="sm:col-span-4">
                <input v-model="row.name" type="text" class="field-input" placeholder="名称" />
              </div>
              <div class="sm:col-span-3">
                <input v-model.number="row.investedPrincipal" type="number" min="0" step="0.01" class="field-input" placeholder="投入本金" />
              </div>
              <div class="sm:col-span-3">
                <input v-model.number="row.currentValue" type="number" min="0" step="0.01" class="field-input" placeholder="市值(观察)" />
              </div>
              <div class="sm:col-span-2 flex justify-end">
                <button type="button" class="text-xs text-red-600 dark:text-red-400 py-2" @click="form.funds.splice(idx, 1)">删</button>
              </div>
            </div>
          </div>
          <p v-else class="text-xs text-subtext-light dark:text-subtext-dark">无</p>
        </div>
      </div>
    </section>

    <!-- ④ 个人借贷 -->
    <section class="rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-medium">④ 个人借贷（未还）</h3>
        <button type="button" class="text-xs text-primary" @click="addLend">+ 借贷</button>
      </div>
      <div v-if="form.lends.length" class="space-y-2">
        <div
          v-for="(row, idx) in form.lends"
          :key="row._key"
          class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end"
        >
          <div class="sm:col-span-4">
            <input v-model="row.borrower" type="text" class="field-input" placeholder="对方" />
          </div>
          <div class="sm:col-span-3">
            <input v-model.number="row.amount" type="number" min="0" step="0.01" class="field-input" placeholder="未还金额" />
          </div>
          <div class="sm:col-span-3">
            <input v-model="row.notes" type="text" class="field-input" placeholder="备注" />
          </div>
          <div class="sm:col-span-2 flex justify-end">
            <button type="button" class="text-xs text-red-600 dark:text-red-400 py-2" @click="form.lends.splice(idx, 1)">删</button>
          </div>
        </div>
      </div>
      <p v-else class="text-xs text-subtext-light dark:text-subtext-dark">无可跳过</p>
    </section>

    <!-- 预览 + 提交 -->
    <section class="rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-5">
      <h3 class="text-sm font-medium mb-3">预览 · 总资产</h3>
      <p class="text-2xl font-semibold tabular-nums text-text-light dark:text-text-dark mb-3">
        ¥{{ formatAmount(preview.totalAssets) }}
      </p>
      <ul class="text-sm text-subtext-light dark:text-subtext-dark space-y-1 mb-5">
        <li class="flex justify-between"><span>可用现金（活期）</span><span class="tabular-nums">¥{{ formatAmount(preview.totalDemand) }}</span></li>
        <li class="flex justify-between"><span>银行存款（定期）</span><span class="tabular-nums">¥{{ formatAmount(preview.totalTimeDeposit) }}</span></li>
        <li class="flex justify-between"><span>股/基投入本金</span><span class="tabular-nums">¥{{ formatAmount(preview.totalInvestedPrincipal) }}</span></li>
        <li class="flex justify-between"><span>个人借贷未还</span><span class="tabular-nums">¥{{ formatAmount(preview.totalLent) }}</span></li>
      </ul>

      <div class="flex flex-wrap gap-3">
        <button
          type="button"
          class="px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-medium
                 hover:opacity-90 transition-opacity disabled:opacity-50"
          :disabled="submitting"
          @click="submit"
        >
          {{ alreadyOpened ? '覆盖并完成建账' : '完成建账' }}
        </button>
        <button
          v-if="alreadyOpened"
          type="button"
          class="px-4 py-2.5 rounded-lg border border-border-light dark:border-border-dark text-sm
                 hover:bg-gray-50 dark:hover:bg-gray-800/80"
          @click="emit('done')"
        >
          取消回总览
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { reactive, computed, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatAmount } from '../utils/format.js'
import { BANKS, createId } from '../constants/banks.js'
import { TOTAL_ASSETS_FORMULA } from '../constants/ledgerGuide.js'
import { useOpeningBalanceStore } from '../stores/openingBalance.js'
import { useBankAccountsStore } from '../stores/bankAccounts.js'
import { useStockInvestmentStore } from '../stores/stockInvestment.js'
import { useFundInvestmentStore } from '../stores/fundInvestment.js'
import { useLentMoneyStore } from '../stores/lentMoney.js'
import { useAssetsStore } from '../stores/assets.js'

const emit = defineEmits(['done'])

const totalAssetsFormula = TOTAL_ASSETS_FORMULA

const openingStore = useOpeningBalanceStore()
const bankStore = useBankAccountsStore()
const stockStore = useStockInvestmentStore()
const fundStore = useFundInvestmentStore()
const lentStore = useLentMoneyStore()
const assetsStore = useAssetsStore()

const submitting = ref(false)
const alreadyOpened = computed(() => openingStore.hasOpenedBooks)

function emptyBanks() {
  return BANKS.map(b => ({
    id: b.id,
    name: b.name,
    demandBalance: 0,
    timeDeposits: []
  }))
}

function uid() {
  return createId()
}

const form = reactive({
  date: todayISO(),
  banks: emptyBanks(),
  stocks: [],
  funds: [],
  lends: []
})

const preview = computed(() =>
  openingStore.previewTotals({
    banks: form.banks,
    stocks: form.stocks,
    funds: form.funds,
    lends: form.lends
  })
)

function todayISO() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function addTimeDeposit(bankId) {
  const bank = form.banks.find(b => b.id === bankId)
  if (!bank) return
  bank.timeDeposits.push({
    _key: uid(),
    name: '',
    principal: 0,
    startDate: '',
    maturityDate: '',
    note: ''
  })
}

function removeTimeDeposit(bankId, idx) {
  const bank = form.banks.find(b => b.id === bankId)
  if (!bank) return
  bank.timeDeposits.splice(idx, 1)
}

function addStock() {
  form.stocks.push({ _key: uid(), name: '', investedPrincipal: 0, currentValue: 0 })
}

function addFund() {
  form.funds.push({ _key: uid(), name: '', investedPrincipal: 0, currentValue: 0 })
}

function addLend() {
  form.lends.push({ _key: uid(), borrower: '', amount: 0, notes: '' })
}

function hydrateFromStores() {
  form.date = openingStore.date || todayISO()
  form.banks = BANKS.map(b => {
    const acc = bankStore.accounts.find(a => a.id === b.id)
    return {
      id: b.id,
      name: b.name,
      demandBalance: acc ? Number(acc.demandBalance) || 0 : 0,
      timeDeposits: (acc?.timeDeposits || []).map(d => ({
        _key: d.id || uid(),
        name: d.name || '',
        principal: Number(d.principal) || 0,
        startDate: d.startDate || '',
        maturityDate: d.maturityDate || '',
        note: d.note || ''
      }))
    }
  })
  form.stocks = (stockStore.stocks || []).map(s => ({
    _key: s.id || uid(),
    name: s.name || '',
    investedPrincipal: Number(s.investedPrincipal) || 0,
    currentValue: Number(s.currentValue) || 0
  }))
  form.funds = (fundStore.funds || []).map(f => ({
    _key: f.id || uid(),
    name: f.name || '',
    investedPrincipal: Number(f.investedPrincipal) || 0,
    currentValue: Number(f.currentValue) || 0
  }))
  form.lends = (lentStore.lentRecords || [])
    .filter(r => !r.status || r.status === 'pending')
    .map(r => ({
      _key: r.id || uid(),
      borrower: r.borrower || '',
      amount: Number(r.amount) || 0,
      notes: r.notes || ''
    }))
}

async function submit() {
  if (!form.date) {
    ElMessage.warning('请填写初始日期')
    return
  }

  if (alreadyOpened.value) {
    try {
      await ElMessageBox.confirm(
        '将覆盖四银行、股票、基金与个人借贷列表。是否继续？',
        '重新建账',
        { type: 'warning', confirmButtonText: '覆盖写入', cancelButtonText: '取消' }
      )
    } catch {
      return
    }
  }

  submitting.value = true
  try {
    const banks = form.banks.map(b => ({
      id: b.id,
      demandBalance: Number(b.demandBalance) || 0,
      timeDeposits: (b.timeDeposits || [])
        .filter(d => (Number(d.principal) || 0) > 0 || (d.name || '').trim())
        .map(d => ({
          name: (d.name || '定期产品').trim(),
          principal: Number(d.principal) || 0,
          startDate: d.startDate || null,
          maturityDate: d.maturityDate || null,
          note: d.note || ''
        }))
    }))

    const stocks = form.stocks
      .filter(s => (s.name || '').trim())
      .map(s => ({
        name: s.name.trim(),
        investedPrincipal: Number(s.investedPrincipal) || 0,
        currentValue: Number(s.currentValue) || 0
      }))

    const funds = form.funds
      .filter(f => (f.name || '').trim())
      .map(f => ({
        name: f.name.trim(),
        investedPrincipal: Number(f.investedPrincipal) || 0,
        currentValue: Number(f.currentValue) || 0
      }))

    const lends = form.lends
      .filter(l => (l.borrower || '').trim() && (Number(l.amount) || 0) > 0)
      .map(l => ({
        borrower: l.borrower.trim(),
        amount: Number(l.amount) || 0,
        notes: l.notes || ''
      }))

    const expected = openingStore.previewTotals({ banks, stocks, funds, lends })
    openingStore.completeOpening({ date: form.date, banks, stocks, funds, lends })

    // 校验 store 总资产与预览一致
    const actual = assetsStore.totalAssets
    if (Math.abs(actual - expected.totalAssets) > 0.02) {
      ElMessage.warning(
        `已保存，但校验略有偏差：预览 ¥${expected.totalAssets.toFixed(2)}，当前 ¥${actual.toFixed(2)}`
      )
    } else {
      ElMessage.success(`建账完成 · 总资产 ¥${formatAmount(actual)}`)
    }
    emit('done')
  } catch (e) {
    ElMessage.error(e.message || '建账失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  hydrateFromStores()
})
</script>

<style scoped>
.field-input {
  @apply w-full rounded-lg border border-border-light dark:border-border-dark
    bg-background-light dark:bg-background-dark
    px-3 py-2 text-sm text-text-light dark:text-text-dark
    focus:outline-none focus:ring-1 focus:ring-primary/40;
}
</style>
