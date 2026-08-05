<template>
  <div class="space-y-5">
    <p class="text-sm text-subtext-light dark:text-subtext-dark">
      总资产只含<strong>投入本金</strong>；市值仅观察。
      从银行活期投入/追加，总资产不变；<strong>撤回</strong>到活期时才让盈亏进总资产。
    </p>

    <!-- 汇总 -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="stat-mini">
        <p class="label">投入本金</p>
        <p class="value">¥{{ formatAmount(totalPrincipal) }}</p>
      </div>
      <div class="stat-mini">
        <p class="label">观察市值</p>
        <p class="value">¥{{ formatAmount(totalMarket) }}</p>
      </div>
      <div class="stat-mini">
        <p class="label">浮盈亏</p>
        <p
          class="value"
          :class="totalPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'"
        >
          ¥{{ formatAmount(totalPnl) }}
        </p>
      </div>
      <div class="stat-mini">
        <p class="label">标的数</p>
        <p class="value">{{ items.length }}</p>
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <button type="button" class="btn-primary" @click="openInvestNew">+ 投入新{{ assetLabel }}</button>
    </div>

    <!-- 列表 -->
    <section class="rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark overflow-hidden">
      <div v-if="!items.length" class="p-8 text-center">
        <p class="text-sm text-subtext-light dark:text-subtext-dark mb-3">暂无{{ assetLabel }}</p>
        <button type="button" class="text-sm text-primary" @click="openInvestNew">录入第一笔</button>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-subtext-light dark:text-subtext-dark border-b border-border-light dark:border-border-dark">
              <th class="py-2.5 px-4 font-medium">名称</th>
              <th class="py-2.5 px-3 font-medium">投入本金</th>
              <th class="py-2.5 px-3 font-medium">市值</th>
              <th class="py-2.5 px-3 font-medium">浮盈亏</th>
              <th class="py-2.5 px-4 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in sortedItems"
              :key="row.id"
              class="border-b border-border-light/80 dark:border-border-dark/80 last:border-0"
            >
              <td class="py-3 px-4 font-medium">{{ row.name }}</td>
              <td class="py-3 px-3 tabular-nums">¥{{ formatAmount(row.investedPrincipal) }}</td>
              <td class="py-3 px-3 tabular-nums text-subtext-light dark:text-subtext-dark">
                ¥{{ formatAmount(row.currentValue) }}
              </td>
              <td
                class="py-3 px-3 tabular-nums"
                :class="pnl(row) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'"
              >
                ¥{{ formatAmount(pnl(row)) }}
              </td>
              <td class="py-3 px-4 text-right whitespace-nowrap space-x-2">
                <button type="button" class="link" @click="openAdd(row)">追加</button>
                <button type="button" class="link" @click="openMarket(row)">市值</button>
                <button type="button" class="link" @click="openWithdraw(row)">撤回</button>
                <button type="button" class="link-danger" @click="remove(row)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 对话框：新建投入 -->
    <div v-if="dialog === 'invest'" class="modal-mask" @click.self="close">
      <div class="modal-panel" role="dialog">
        <h3 class="text-base font-semibold mb-4">投入新{{ assetLabel }}</h3>
        <div class="space-y-3">
          <div>
            <label class="field-label">名称</label>
            <input v-model="form.name" type="text" class="field-input" placeholder="标的名称" />
          </div>
          <div>
            <label class="field-label">投入金额</label>
            <input v-model.number="form.amount" type="number" min="0" step="0.01" class="field-input" />
          </div>
          <div>
            <label class="field-label">从哪家银行活期扣</label>
            <select v-model="form.bankId" class="field-input">
              <option v-for="b in banks" :key="b.id" :value="b.id">
                {{ b.name }} · ¥{{ formatAmount(demandOf(b.id)) }}
              </option>
            </select>
          </div>
          <div>
            <label class="field-label">观察市值（可选，默认=投入额）</label>
            <input v-model.number="form.currentValue" type="number" min="0" step="0.01" class="field-input" placeholder="可空" />
          </div>
        </div>
        <p class="text-xs text-subtext-light dark:text-subtext-dark mt-3">
          活期↓、本金↑，总资产不变。
        </p>
        <div class="flex justify-end gap-2 mt-5">
          <button type="button" class="btn-ghost" @click="close">取消</button>
          <button type="button" class="btn-primary" @click="submitInvest">确认投入</button>
        </div>
      </div>
    </div>

    <!-- 追加 -->
    <div v-if="dialog === 'add'" class="modal-mask" @click.self="close">
      <div class="modal-panel" role="dialog">
        <h3 class="text-base font-semibold mb-1">追加 · {{ active?.name }}</h3>
        <p class="text-xs text-subtext-light dark:text-subtext-dark mb-4">
          当前本金 ¥{{ formatAmount(active?.investedPrincipal) }}
        </p>
        <div class="space-y-3">
          <div>
            <label class="field-label">追加金额</label>
            <input v-model.number="form.amount" type="number" min="0" step="0.01" class="field-input" />
          </div>
          <div>
            <label class="field-label">从哪家银行活期扣</label>
            <select v-model="form.bankId" class="field-input">
              <option v-for="b in banks" :key="b.id" :value="b.id">
                {{ b.name }} · ¥{{ formatAmount(demandOf(b.id)) }}
              </option>
            </select>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button type="button" class="btn-ghost" @click="close">取消</button>
          <button type="button" class="btn-primary" @click="submitAdd">确认追加</button>
        </div>
      </div>
    </div>

    <!-- 市值 -->
    <div v-if="dialog === 'market'" class="modal-mask" @click.self="close">
      <div class="modal-panel" role="dialog">
        <h3 class="text-base font-semibold mb-1">更新市值 · {{ active?.name }}</h3>
        <p class="text-xs text-subtext-light dark:text-subtext-dark mb-4">
          仅观察，不改总资产与本金
        </p>
        <div>
          <label class="field-label">当前市值</label>
          <input v-model.number="form.currentValue" type="number" min="0" step="0.01" class="field-input" />
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button type="button" class="btn-ghost" @click="close">取消</button>
          <button type="button" class="btn-primary" @click="submitMarket">保存</button>
        </div>
      </div>
    </div>

    <!-- 撤回 -->
    <div v-if="dialog === 'withdraw'" class="modal-mask" @click.self="close">
      <div class="modal-panel" role="dialog">
        <h3 class="text-base font-semibold mb-1">撤回 · {{ active?.name }}</h3>
        <p class="text-xs text-subtext-light dark:text-subtext-dark mb-4">
          当前本金 ¥{{ formatAmount(active?.investedPrincipal) }} ·
          市值 ¥{{ formatAmount(active?.currentValue) }}
        </p>
        <div class="space-y-3">
          <div>
            <label class="field-label">撤回金额（到账活期）</label>
            <input v-model.number="form.withdrawAmount" type="number" min="0" step="0.01" class="field-input" />
          </div>
          <div>
            <label class="field-label">冲减本金（默认 min本金,撤回额）</label>
            <input
              v-model.number="form.reducePrincipal"
              type="number"
              min="0"
              step="0.01"
              class="field-input"
              :placeholder="String(defaultReduce)"
            />
          </div>
          <div>
            <label class="field-label">入账银行活期</label>
            <select v-model="form.bankId" class="field-input">
              <option v-for="b in banks" :key="b.id" :value="b.id">
                {{ b.name }} · ¥{{ formatAmount(demandOf(b.id)) }}
              </option>
            </select>
          </div>
          <p class="text-xs text-subtext-light dark:text-subtext-dark">
            预估实现盈亏
            <span
              class="font-medium tabular-nums"
              :class="previewPnl >= 0 ? 'text-emerald-600' : 'text-red-500'"
            >
              ¥{{ formatAmount(previewPnl) }}
            </span>
            （撤回额 − 冲减本金）
          </p>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button type="button" class="btn-ghost" @click="close">取消</button>
          <button type="button" class="btn-primary" @click="submitWithdraw">确认撤回</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatAmount } from '../utils/format.js'
import { BANKS } from '../constants/banks.js'
import { planWithdraw } from '../utils/investmentOps.js'
import { useBankAccountsStore } from '../stores/bankAccounts.js'
import { useStockInvestmentStore } from '../stores/stockInvestment.js'
import { useFundInvestmentStore } from '../stores/fundInvestment.js'

const props = defineProps({
  /** 'stock' | 'fund' */
  kind: {
    type: String,
    required: true,
    validator: v => v === 'stock' || v === 'fund'
  }
})

const banks = BANKS
const bankStore = useBankAccountsStore()
const stockStore = useStockInvestmentStore()
const fundStore = useFundInvestmentStore()

const store = computed(() => (props.kind === 'stock' ? stockStore : fundStore))
const assetLabel = computed(() => (props.kind === 'stock' ? '股票' : '基金'))

const items = computed(() =>
  props.kind === 'stock' ? stockStore.stocks : fundStore.funds
)

const sortedItems = computed(() =>
  props.kind === 'stock' ? stockStore.stocksByPrincipal : fundStore.fundsByPrincipal
)

const totalPrincipal = computed(() => store.value.totalInvestedPrincipal)
const totalMarket = computed(() => store.value.totalMarketValue)
const totalPnl = computed(() => totalMarket.value - totalPrincipal.value)

const dialog = ref(null)
const active = ref(null)
const form = reactive({
  name: '',
  amount: 0,
  bankId: 'cmb',
  currentValue: null,
  withdrawAmount: 0,
  reducePrincipal: null
})

const defaultReduce = computed(() => {
  if (!active.value) return 0
  const p = Number(active.value.investedPrincipal) || 0
  const w = Number(form.withdrawAmount) || 0
  return Math.min(p, w)
})

const previewPnl = computed(() => {
  try {
    if (!active.value || !(Number(form.withdrawAmount) > 0)) return 0
    const r =
      form.reducePrincipal == null || form.reducePrincipal === ''
        ? null
        : form.reducePrincipal
    return planWithdraw(
      active.value.investedPrincipal,
      form.withdrawAmount,
      r
    ).realizedPnl
  } catch {
    return 0
  }
})

function pnl(row) {
  return (Number(row.currentValue) || 0) - (Number(row.investedPrincipal) || 0)
}

function demandOf(bankId) {
  const a = bankStore.accountById(bankId)
  return a ? Number(a.demandBalance) || 0 : 0
}

function resetForm() {
  form.name = ''
  form.amount = 0
  form.bankId = 'cmb'
  form.currentValue = null
  form.withdrawAmount = 0
  form.reducePrincipal = null
}

function close() {
  dialog.value = null
  active.value = null
  resetForm()
}

function openInvestNew() {
  resetForm()
  dialog.value = 'invest'
}

function openAdd(row) {
  active.value = row
  resetForm()
  dialog.value = 'add'
}

function openMarket(row) {
  active.value = row
  form.currentValue = Number(row.currentValue) || 0
  dialog.value = 'market'
}

function openWithdraw(row) {
  active.value = row
  resetForm()
  form.withdrawAmount = Number(row.currentValue) || Number(row.investedPrincipal) || 0
  form.reducePrincipal = null
  dialog.value = 'withdraw'
}

function submitInvest() {
  try {
    const payload = {
      name: form.name,
      amount: form.amount,
      bankId: form.bankId,
      currentValue:
        form.currentValue === null || form.currentValue === ''
          ? null
          : form.currentValue
    }
    if (props.kind === 'stock') {
      stockStore.investNew(payload)
    } else {
      fundStore.investNew(payload)
    }
    ElMessage.success('投入成功 · 总资产不变')
    close()
  } catch (e) {
    ElMessage.error(e.message || '失败')
  }
}

function submitAdd() {
  try {
    if (props.kind === 'stock') {
      stockStore.addPrincipal(active.value.id, form.amount, form.bankId)
    } else {
      fundStore.addPrincipal(active.value.id, form.amount, form.bankId)
    }
    ElMessage.success('追加成功 · 总资产不变')
    close()
  } catch (e) {
    ElMessage.error(e.message || '失败')
  }
}

function submitMarket() {
  try {
    if (props.kind === 'stock') {
      stockStore.updateMarketValue(active.value.id, form.currentValue)
    } else {
      fundStore.updateMarketValue(active.value.id, form.currentValue)
    }
    ElMessage.success('市值已更新（不改总资产）')
    close()
  } catch (e) {
    ElMessage.error(e.message || '失败')
  }
}

function submitWithdraw() {
  try {
    const r =
      form.reducePrincipal == null || form.reducePrincipal === ''
        ? null
        : form.reducePrincipal
    const plan =
      props.kind === 'stock'
        ? stockStore.withdrawToBank(
            active.value.id,
            form.withdrawAmount,
            form.bankId,
            r
          )
        : fundStore.withdrawToBank(
            active.value.id,
            form.withdrawAmount,
            form.bankId,
            r
          )
    const sign = plan.realizedPnl >= 0 ? '+' : ''
    ElMessage.success(
      `已撤回 · 实现盈亏 ${sign}¥${formatAmount(plan.realizedPnl)}`
    )
    close()
  } catch (e) {
    ElMessage.error(e.message || '失败')
  }
}

async function remove(row) {
  try {
    await ElMessageBox.confirm(
      `删除「${row.name}」？不会自动退回活期；若仍有本金请先撤回。`,
      '删除',
      { type: 'warning' }
    )
    if (props.kind === 'stock') stockStore.removeStock(row.id)
    else fundStore.removeFund(row.id)
    ElMessage.success('已删除')
  } catch {
    /* cancel */
  }
}

onMounted(() => {
  bankStore.loadFromLocalStorage()
  if (props.kind === 'stock') stockStore.loadFromLocalStorage()
  else fundStore.loadFromLocalStorage()
})
</script>

<style scoped>
.stat-mini .label {
  @apply text-xs text-subtext-light dark:text-subtext-dark mb-1;
}
.stat-mini .value {
  @apply text-lg font-semibold tabular-nums text-text-light dark:text-text-dark;
}
.field-input {
  @apply w-full rounded-lg border border-border-light dark:border-border-dark
    bg-background-light dark:bg-background-dark
    px-3 py-2 text-sm text-text-light dark:text-text-dark
    focus:outline-none focus:ring-1 focus:ring-primary/40;
}
.field-label {
  @apply block text-xs text-subtext-light dark:text-subtext-dark mb-1;
}
.btn-primary {
  @apply px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90;
}
.btn-ghost {
  @apply px-3 py-2 rounded-lg border border-border-light dark:border-border-dark text-sm
    hover:bg-gray-50 dark:hover:bg-gray-800/80;
}
.link {
  @apply text-xs text-primary hover:underline;
}
.link-danger {
  @apply text-xs text-red-600 dark:text-red-400 hover:underline;
}
.modal-mask {
  @apply fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4;
}
.modal-panel {
  @apply w-full max-w-md rounded-xl border border-border-light dark:border-border-dark
    bg-card-light dark:bg-card-dark p-5 shadow-xl;
}
</style>
