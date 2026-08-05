<template>
  <div class="space-y-6">
    <p class="text-sm text-subtext-light dark:text-subtext-dark leading-relaxed">
      <strong>当前账</strong>：保存后立刻更新对应银行活期与总资产（外部增减一条线）。
      信用卡记在<strong>实际扣款月</strong>。
      进入新自然月后，系统会为<strong>上月</strong>自动生成只读「月度账单」（不切割当前账）。
    </p>

    <!-- 月份 + 摘要 -->
    <section class="rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-5">
      <div class="flex flex-wrap items-end gap-4 mb-4">
        <div>
          <label class="block text-xs text-subtext-light dark:text-subtext-dark mb-1">所属月</label>
          <input
            v-model="selectedMonth"
            type="month"
            class="field-input max-w-xs"
            @change="loadMonthIntoForm"
          />
        </div>
        <p
          v-if="isBeforeOpening"
          class="text-xs text-amber-700 dark:text-amber-400 max-w-md leading-relaxed"
        >
          当前月早于建账基准 {{ openingMonthLabel }}。
          建账前收支已含在期初余额中，正式路径请勿再入账；若只需对照，展开下方「高级」。
        </p>
        <p
          v-else-if="isOpeningMonth"
          class="text-xs text-amber-700 dark:text-amber-400 max-w-md leading-relaxed"
        >
          本月为建账月（基准 {{ openingDateLabel }}）：只录建账日<strong>之后</strong>的差额，勿把整月工资再入账一遍。
        </p>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="stat-mini">
          <p class="label">收入</p>
          <p class="value">¥{{ formatAmount(formTotals.income) }}</p>
        </div>
        <div class="stat-mini">
          <p class="label">支出</p>
          <p class="value">¥{{ formatAmount(formTotals.expense) }}</p>
        </div>
        <div class="stat-mini">
          <p class="label">净流入</p>
          <p
            class="value"
            :class="formTotals.netIncome >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'"
          >
            ¥{{ formatAmount(formTotals.netIncome) }}
          </p>
        </div>
        <div class="stat-mini">
          <p class="label">可用现金（活期）</p>
          <p class="value">¥{{ formatAmount(totalDemand) }}</p>
        </div>
      </div>
    </section>

    <!-- 收入明细 -->
    <section class="rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-medium">外部收入（影响总资产）</h3>
        <button type="button" class="text-xs text-primary" @click="addIncome">+ 一笔收入</button>
      </div>

      <div v-if="form.incomes.length" class="space-y-3">
        <div
          v-for="(row, idx) in form.incomes"
          :key="row.id"
          class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end border-b border-border-light/60 dark:border-border-dark/60 pb-3 last:border-0"
        >
          <div class="sm:col-span-3">
            <label class="field-label">金额</label>
            <input v-model.number="row.amount" type="number" min="0" step="0.01" class="field-input" />
          </div>
          <div class="sm:col-span-3">
            <label class="field-label">类目</label>
            <select v-model="row.category" class="field-input">
              <option v-for="c in incomeCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="sm:col-span-4">
            <label class="field-label">入账银行活期</label>
            <select v-model="row.bankId" class="field-input">
              <option :value="null" disabled>请选择</option>
              <option v-for="b in banks" :key="b.id" :value="b.id">
                {{ b.name }} · 活期 ¥{{ formatAmount(demandOf(b.id)) }}
              </option>
            </select>
          </div>
          <div class="sm:col-span-2 flex justify-end gap-2">
            <button type="button" class="text-xs text-red-600 dark:text-red-400 py-2" @click="form.incomes.splice(idx, 1)">
              删
            </button>
          </div>
        </div>
      </div>
      <p v-else class="text-xs text-subtext-light dark:text-subtext-dark">暂无收入行 · 可点「+ 一笔收入」</p>
    </section>

    <!-- 三通道支出 -->
    <section class="rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-5">
      <h3 class="text-sm font-medium mb-1">外部支出 · 月小计（影响总资产）</h3>
      <p class="text-xs text-subtext-light dark:text-subtext-dark mb-4">
        微信 / 支付宝 / 信用卡 / 转账支出：各填月小计并归属银行活期。
        保存后从对应活期扣除。内部划转请走「银行账户 / 投资 / 借出」。
      </p>

      <div class="space-y-4">
        <div
          v-for="ch in expenseChannels"
          :key="ch.id"
          class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end"
        >
          <div class="sm:col-span-3">
            <p class="text-sm font-medium text-text-light dark:text-text-dark">{{ ch.name }}</p>
            <p class="text-xs text-subtext-light dark:text-subtext-dark">{{ ch.hint }}</p>
          </div>
          <div class="sm:col-span-4">
            <label class="field-label">本月小计</label>
            <input
              v-model.number="form.channels[ch.id].amount"
              type="number"
              min="0"
              step="0.01"
              class="field-input"
              placeholder="0"
            />
          </div>
          <div class="sm:col-span-5">
            <label class="field-label">归属银行活期</label>
            <select v-model="form.channels[ch.id].bankId" class="field-input">
              <option :value="null">未选择</option>
              <option v-for="b in banks" :key="b.id" :value="b.id">
                {{ b.name }} · 活期 ¥{{ formatAmount(demandOf(b.id)) }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </section>

    <!-- 保存：默认即时入账 -->
    <section class="rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-5">
      <h3 class="text-sm font-medium mb-1">保存到当前账</h3>
      <p class="text-xs text-subtext-light dark:text-subtext-dark mb-3">
        默认：收入进指定活期、支出从指定活期扣；总资产随活期变。相对上次保存只调差额。
      </p>

      <p class="text-xs font-medium text-subtext-light dark:text-subtext-dark mb-2">
        {{ postToDemand ? '预览：将调整活期（相对上次保存的差额）' : '预览：不调整活期（补录对照）' }}
      </p>
      <ul v-if="postToDemand && effectDiff.length" class="text-sm space-y-1 mb-4">
        <li v-for="row in effectDiff" :key="row.bankId" class="flex justify-between tabular-nums">
          <span>{{ bankName(row.bankId) }} 活期</span>
          <span :class="row.delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'">
            {{ row.delta >= 0 ? '+' : '' }}{{ formatAmount(row.delta) }}
          </span>
        </li>
      </ul>
      <p v-else class="text-xs text-subtext-light dark:text-subtext-dark mb-4">
        <template v-if="!postToDemand">
          保存后<strong>绝不改动</strong>活期与总资产（仅对照流水）。
        </template>
        <template v-else>与上次保存一致，或尚未填写带银行的金额。</template>
      </p>

      <div class="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          class="px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-medium
                 hover:opacity-90 disabled:opacity-50"
          :disabled="saving"
          @click="save"
        >
          {{ saving ? '保存中…' : (postToDemand ? '保存并更新活期' : '保存（仅对照流水）') }}
        </button>
        <button
          v-if="hasPriorPosting"
          type="button"
          class="btn-ghost text-sm text-amber-700 dark:text-amber-400"
          :disabled="saving"
          @click="unpostLedger"
        >
          回滚该月活期入账
        </button>
      </div>

      <!-- 高级：补录对照 -->
      <details class="rounded-lg border border-border-light dark:border-border-dark p-3">
        <summary class="text-xs font-medium cursor-pointer text-subtext-light dark:text-subtext-dark select-none">
          高级 · 补录对照（不改活期）
        </summary>
        <div class="mt-3 space-y-2 text-xs text-subtext-light dark:text-subtext-dark leading-relaxed">
          <p>
            正式自用一般<strong>不需要</strong>。仅当补录「已含在期初余额里」的历史月、又想留流水对照时使用。
            勾选后保存不会推动活期，避免双计。
          </p>
          <label class="flex items-start gap-2 cursor-pointer text-sm text-text-light dark:text-text-dark">
            <input v-model="flowOnlyMode" type="checkbox" class="mt-0.5 shrink-0" />
            <span>本次保存：只写流水，不改活期与总资产</span>
          </label>
          <p v-if="hasPriorPosting && flowOnlyMode" class="text-amber-700 dark:text-amber-400">
            本月曾入过账；若活期已手工对齐，用对照保存即可，勿点「回滚」。
          </p>
        </div>
      </details>
    </section>

    <!-- 月度账单（只读结转） -->
    <section class="rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-medium">月度账单（结转）</h3>
        <span class="text-xs text-subtext-light dark:text-subtext-dark">只读 · 不改当前账</span>
      </div>
      <p
        v-if="catchUpNote"
        class="text-xs text-emerald-700 dark:text-emerald-400 mb-3"
      >
        {{ catchUpNote }}
      </p>
      <p class="text-xs text-subtext-light dark:text-subtext-dark mb-3 leading-relaxed">
        账单在「进入新自然月」时按当时流水冻结；若之后改过该月收支，请点
        <strong>重生成</strong>（只更新账单，不改当前账活期）。
      </p>
      <div v-if="statementRows.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-subtext-light dark:text-subtext-dark border-b border-border-light dark:border-border-dark">
              <th class="py-2 pr-3 font-medium">月份</th>
              <th class="py-2 pr-3 font-medium">收入</th>
              <th class="py-2 pr-3 font-medium">支出</th>
              <th class="py-2 pr-3 font-medium">净流入</th>
              <th class="py-2 pr-3 font-medium">期末总资产</th>
              <th class="py-2 pr-3 font-medium">说明</th>
              <th class="py-2 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in statementRows"
              :key="row.month"
              class="border-b border-border-light/80 dark:border-border-dark/80 last:border-0"
            >
              <td class="py-2.5 pr-3">{{ formatMonth(row.month) }}</td>
              <td class="py-2.5 pr-3 tabular-nums">¥{{ formatAmount(row.income) }}</td>
              <td class="py-2.5 pr-3 tabular-nums">¥{{ formatAmount(row.expense) }}</td>
              <td
                class="py-2.5 pr-3 tabular-nums"
                :class="row.netIncome >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'"
              >
                ¥{{ formatAmount(row.netIncome) }}
              </td>
              <td class="py-2.5 pr-3 tabular-nums">
                ¥{{ formatAmount(row.closingTotal) }}
              </td>
              <td class="py-2.5 pr-3 text-xs text-subtext-light dark:text-subtext-dark max-w-[12rem]">
                {{ row.modeLabel }}
              </td>
              <td class="py-2.5 text-right">
                <button
                  type="button"
                  class="text-xs text-primary"
                  @click="regenerateStatement(row.month)"
                >
                  重生成
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="text-xs text-subtext-light dark:text-subtext-dark">
        尚无月度账单。进入下一个自然月（或下次打开 App）后，将自动为已结束的月份生成。
      </p>
    </section>

    <!-- 历史月份（可编辑流水） -->
    <section class="rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-5">
      <h3 class="text-sm font-medium mb-4">历史月份（当前账流水）</h3>
      <div v-if="historyRows.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-subtext-light dark:text-subtext-dark border-b border-border-light dark:border-border-dark">
              <th class="py-2 pr-3 font-medium">月份</th>
              <th class="py-2 pr-3 font-medium">收入</th>
              <th class="py-2 pr-3 font-medium">支出</th>
              <th class="py-2 pr-3 font-medium">净流入</th>
              <th class="py-2 pr-3 font-medium">状态</th>
              <th class="py-2 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in historyRows"
              :key="row.month"
              class="border-b border-border-light/80 dark:border-border-dark/80 last:border-0"
            >
              <td class="py-2.5 pr-3">{{ formatMonth(row.month) }}</td>
              <td class="py-2.5 pr-3 tabular-nums">¥{{ formatAmount(row.income) }}</td>
              <td class="py-2.5 pr-3 tabular-nums">¥{{ formatAmount(row.expense) }}</td>
              <td
                class="py-2.5 pr-3 tabular-nums"
                :class="row.netIncome >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'"
              >
                ¥{{ formatAmount(row.netIncome) }}
              </td>
              <td class="py-2.5 pr-3 text-xs text-subtext-light dark:text-subtext-dark">
                {{ row.postedLabel }}
              </td>
              <td class="py-2.5 text-right space-x-2">
                <button type="button" class="text-xs text-primary" @click="editMonth(row.month)">编辑</button>
                <button type="button" class="text-xs text-red-600 dark:text-red-400" @click="removeMonth(row.month)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="text-xs text-subtext-light dark:text-subtext-dark">暂无历史记录</p>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatAmount } from '../utils/format.js'
import MonthlyFinance from '../models/MonthlyFinance.js'
import { BANKS, getBankName, createId } from '../constants/banks.js'
import {
  INCOME_CATEGORIES,
  EXPENSE_CHANNELS,
  emptyChannels
} from '../constants/channels.js'
import {
  computePostedEffects,
  diffPostedEffects,
  deriveMonthTotals
} from '../utils/monthlyLedger.js'
import { useFinanceStore } from '../stores/finance.js'
import { useBankAccountsStore } from '../stores/bankAccounts.js'
import { useOpeningBalanceStore } from '../stores/openingBalance.js'
import { useMonthlyStatementsStore } from '../stores/monthlyStatements.js'

const financeStore = useFinanceStore()
const bankStore = useBankAccountsStore()
const openingStore = useOpeningBalanceStore()
const statementsStore = useMonthlyStatementsStore()

const banks = BANKS
const incomeCategories = INCOME_CATEGORIES
const expenseChannels = EXPENSE_CHANNELS

const selectedMonth = ref(MonthlyFinance.getCurrentMonth())
const saving = ref(false)
/** 高级：仅对照流水（默认 false = 即时入账） */
const flowOnlyMode = ref(false)

const form = reactive({
  incomes: [],
  channels: emptyChannels('cmb')
})

const formTotals = computed(() => deriveMonthTotals(form.incomes, form.channels))
const totalDemand = computed(() => bankStore.totalDemand)
const postToDemand = computed(() => !flowOnlyMode.value)

const openingMonth = computed(() => {
  const d = openingStore.date
  if (!d || !/^\d{4}-\d{2}/.test(d)) return null
  return d.slice(0, 7)
})

const openingMonthLabel = computed(() =>
  openingMonth.value ? MonthlyFinance.formatMonth(openingMonth.value) : '—'
)

const openingDateLabel = computed(() => openingStore.date || '—')

const isBeforeOpening = computed(() => {
  if (!openingMonth.value) return false
  return selectedMonth.value < openingMonth.value
})

const isOpeningMonth = computed(() => {
  if (!openingMonth.value) return false
  return selectedMonth.value === openingMonth.value
})

const existingPosted = computed(() => {
  const row = financeStore.monthById(selectedMonth.value)
  return (row && row.postedEffects) || {}
})

const hasPriorPosting = computed(
  () => Object.keys(existingPosted.value).length > 0
)

const targetEffects = computed(() =>
  postToDemand.value
    ? computePostedEffects(form.incomes, form.channels)
    : {}
)

const effectDiff = computed(() =>
  diffPostedEffects(existingPosted.value, targetEffects.value)
)

const catchUpNote = computed(() => statementsStore.lastCatchUpNote)

const statementRows = computed(() =>
  statementsStore.sorted.map(s => ({
    month: s.month,
    income: Number(s.income) || 0,
    expense: Number(s.expense) || 0,
    netIncome: Number(s.netIncome) || 0,
    closingTotal: Number(s.closing?.totalAssets) || 0,
    modeLabel:
      s.assetMode === 'reconstructed'
        ? '结构推算'
        : s.note
          ? '快照'
          : '快照'
  }))
)

const historyRows = computed(() => {
  const sorted = [...financeStore.monthlyFinances].sort((a, b) =>
    b.month.localeCompare(a.month)
  )
  return sorted.map(mf => {
    const pe = mf.postedEffects || {}
    const parts = Object.entries(pe).map(
      ([id, amt]) => `${getBankName(id)} ${amt >= 0 ? '+' : ''}${Number(amt).toFixed(0)}`
    )
    let postedLabel = parts.length ? parts.join(' · ') : '—'
    if ((!parts.length || mf.flowOnly) && (Number(mf.income) || Number(mf.expense))) {
      postedLabel = parts.length ? parts.join(' · ') : '仅对照'
    } else if (parts.length) {
      postedLabel = '已入账 · ' + postedLabel
    }
    return {
      month: mf.month,
      income: Number(mf.income) || 0,
      expense: Number(mf.expense) || 0,
      netIncome: Number(mf.netIncome) || 0,
      postedLabel
    }
  })
})

function syncFlowDefault() {
  // 建账前默认勾选对照；正式月默认入账；已有 flowOnly 记录跟标记
  if (isBeforeOpening.value) {
    flowOnlyMode.value = true
    return
  }
  const row = financeStore.monthById(selectedMonth.value)
  if (row && row.flowOnly) {
    flowOnlyMode.value = true
  } else {
    flowOnlyMode.value = false
  }
}

function demandOf(bankId) {
  const acc = bankStore.accountById(bankId)
  return acc ? Number(acc.demandBalance) || 0 : 0
}

function bankName(id) {
  return getBankName(id)
}

function formatMonth(m) {
  return MonthlyFinance.formatMonth(m)
}

function newIncomeRow() {
  return {
    id: createId(),
    amount: 0,
    category: 'salary',
    bankId: 'cmb',
    note: ''
  }
}

function addIncome() {
  form.incomes.push(newIncomeRow())
}

function loadMonthIntoForm() {
  const row = financeStore.monthById(selectedMonth.value)
  if (!row) {
    form.incomes = []
    form.channels = emptyChannels('cmb')
    syncFlowDefault()
    return
  }
  form.incomes = (row.incomes || []).map(r => ({
    id: r.id || createId(),
    amount: Number(r.amount) || 0,
    category: r.category || 'other',
    bankId: r.bankId || null,
    note: r.note || ''
  }))
  const ch = row.channels || emptyChannels('cmb')
  form.channels = emptyChannels(null)
  for (const id of Object.keys(form.channels)) {
    form.channels[id] = {
      amount: Number(ch[id]?.amount) || 0,
      bankId: ch[id]?.bankId || null
    }
  }
  syncFlowDefault()
}

function editMonth(month) {
  selectedMonth.value = month
  loadMonthIntoForm()
}

function buildDetailPayload() {
  return {
    postToDemand: postToDemand.value,
    incomes: form.incomes.map(r => ({
      id: r.id,
      amount: Number(r.amount) || 0,
      category: r.category || 'other',
      bankId: r.bankId,
      note: r.note || ''
    })),
    channels: Object.fromEntries(
      Object.keys(form.channels).map(id => [
        id,
        {
          amount: Number(form.channels[id]?.amount) || 0,
          bankId: form.channels[id]?.bankId
        }
      ])
    )
  }
}

/**
 * 已结束自然月：流水改过后同步刷新只读账单（不碰活期）
 */
function refreshStatementIfSealed(month) {
  const cur = MonthlyFinance.getCurrentMonth()
  if (!month || month >= cur) return false
  try {
    statementsStore.regenerateMonth(month)
    return true
  } catch {
    return false
  }
}

async function regenerateStatement(month) {
  try {
    statementsStore.regenerateMonth(month)
    ElMessage.success(
      `${MonthlyFinance.formatMonth(month)} 账单已按当前流水重生成（未改活期）`
    )
  } catch (e) {
    ElMessage.error(e.message || '重生成失败')
  }
}

async function save() {
  saving.value = true
  try {
    const payload = buildDetailPayload()
    const result = financeStore.saveMonthWithLedger(
      selectedMonth.value,
      payload
    )

    const billRefreshed = refreshStatementIfSealed(selectedMonth.value)

    if (!result.postToDemand) {
      ElMessage.success(
        `已保存（仅对照）· 活期未改动 · 净流入 ¥${formatAmount(result.totals.netIncome)}` +
          (billRefreshed ? ' · 已刷新月度账单' : '')
      )
    } else {
      const n = result.applied.length
      ElMessage.success(
        (n
          ? `已入当前账 · 调整 ${n} 个银行活期 · 净流入 ¥${formatAmount(result.totals.netIncome)}`
          : `已保存 · 活期无变化 · 净流入 ¥${formatAmount(result.totals.netIncome)}`) +
          (billRefreshed ? ' · 已刷新月度账单' : '')
      )
    }
    loadMonthIntoForm()
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function unpostLedger() {
  try {
    await ElMessageBox.confirm(
      '将按本月「已入账」差额反向调整活期。若你已用「校正活期」对齐实卡，请勿使用本功能（会二次回滚）。',
      '回滚该月活期入账',
      { type: 'warning', confirmButtonText: '确认回滚', cancelButtonText: '取消' }
    )
    saving.value = true
    const { applied } = financeStore.unpostMonthFromDemand(selectedMonth.value)
    ElMessage.success(
      applied.length
        ? `已回滚 ${applied.length} 个银行活期`
        : '无需回滚'
    )
    loadMonthIntoForm()
  } catch (e) {
    if (e === 'cancel' || e === 'close') return
    if (e?.message) ElMessage.error(e.message)
  } finally {
    saving.value = false
  }
}

async function removeMonth(month) {
  try {
    await ElMessageBox.confirm(
      `删除 ${MonthlyFinance.formatMonth(month)} 并回滚该月已入账的活期变动？`,
      '删除月份',
      { type: 'warning', confirmButtonText: '删除并回滚', cancelButtonText: '取消' }
    )
    financeStore.removeMonthWithLedger(month)
    ElMessage.success('已删除并回滚活期')
    if (selectedMonth.value === month) loadMonthIntoForm()
  } catch {
    /* cancel */
  }
}

watch(selectedMonth, () => {
  syncFlowDefault()
})

onMounted(() => {
  financeStore.loadFromLocalStorage()
  bankStore.loadFromLocalStorage()
  openingStore.loadFromLocalStorage()
  statementsStore.loadFromLocalStorage()
  statementsStore.ensureCatchUp()
  loadMonthIntoForm()
})
</script>

<style scoped>
.field-input {
  @apply w-full rounded-lg border border-border-light dark:border-border-dark
    bg-background-light dark:bg-background-dark
    px-3 py-2 text-sm text-text-light dark:text-text-dark
    focus:outline-none focus:ring-1 focus:ring-primary/40;
}
.field-label {
  @apply block text-xs text-subtext-light dark:text-subtext-dark mb-1;
}
.btn-ghost {
  @apply px-3 py-2 rounded-lg border border-border-light dark:border-border-dark
    text-subtext-light dark:text-subtext-dark
    hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors;
}
.stat-mini .label {
  @apply text-xs text-subtext-light dark:text-subtext-dark mb-1;
}
.stat-mini .value {
  @apply text-lg font-semibold tabular-nums text-text-light dark:text-text-dark;
}
</style>
