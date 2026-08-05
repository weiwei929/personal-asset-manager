<template>
  <div class="space-y-5">
    <p class="text-sm text-subtext-light dark:text-subtext-dark">
      <strong>个人借贷</strong>（需归还）：银行<strong>活期↓</strong>、应收↑，总资产不变。
      归还：应收↓、活期↑；利息进活期则总资产增加。
      给家人、大宗购买等无需归还请记「月度收支 · 转账支出」，勿记本页。
    </p>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="stat-mini">
        <p class="label">未还本金</p>
        <p class="value">¥{{ formatAmount(pendingAmount) }}</p>
      </div>
      <div class="stat-mini">
        <p class="label">已还本金</p>
        <p class="value">¥{{ formatAmount(returnedAmount) }}</p>
      </div>
      <div class="stat-mini">
        <p class="label">笔数（待还/总）</p>
        <p class="value">{{ stats.pendingRecords }} / {{ stats.totalRecords }}</p>
      </div>
      <div class="stat-mini">
        <p class="label">即将到期 / 逾期</p>
        <p class="value">{{ maturingRecords.length }} / {{ overdueRecords.length }}</p>
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <button type="button" class="btn-primary" @click="openLend">+ 借出款项</button>
    </div>

    <section class="rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark overflow-hidden">
      <div v-if="!records.length" class="p-8 text-center">
        <p class="text-sm text-subtext-light dark:text-subtext-dark mb-3">暂无个人借贷记录</p>
        <button type="button" class="text-sm text-primary" @click="openLend">记第一笔</button>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-subtext-light dark:text-subtext-dark border-b border-border-light dark:border-border-dark">
              <th class="py-2.5 px-4 font-medium">对方</th>
              <th class="py-2.5 px-3 font-medium">未还</th>
              <th class="py-2.5 px-3 font-medium">原借出</th>
              <th class="py-2.5 px-3 font-medium">预计归还</th>
              <th class="py-2.5 px-3 font-medium">状态</th>
              <th class="py-2.5 px-4 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in recordsByDueDate"
              :key="row.id"
              class="border-b border-border-light/80 dark:border-border-dark/80 last:border-0"
            >
              <td class="py-3 px-4">
                <p class="font-medium">{{ row.borrower }}</p>
                <p v-if="row.notes" class="text-xs text-subtext-light dark:text-subtext-dark truncate max-w-[10rem]">
                  {{ row.notes }}
                </p>
              </td>
              <td class="py-3 px-3 tabular-nums">¥{{ formatAmount(pendingOf(row)) }}</td>
              <td class="py-3 px-3 tabular-nums text-subtext-light dark:text-subtext-dark">
                ¥{{ formatAmount(row.amount) }}
              </td>
              <td class="py-3 px-3 text-xs">{{ row.expectedReturnDate || '—' }}</td>
              <td class="py-3 px-3">
                <span class="text-xs" :style="{ color: statusColor(row) }">
                  {{ statusText(row) }}
                </span>
              </td>
              <td class="py-3 px-4 text-right whitespace-nowrap space-x-2">
                <button
                  v-if="!isRet(row)"
                  type="button"
                  class="link"
                  @click="openRepay(row)"
                >
                  收回
                </button>
                <button type="button" class="link-danger" @click="remove(row)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 借出 -->
    <div v-if="dialog === 'lend'" class="modal-mask" @click.self="close">
      <div class="modal-panel" role="dialog">
        <h3 class="text-base font-semibold mb-4">个人借贷 · 从活期借出</h3>
        <div class="space-y-3">
          <div>
            <label class="field-label">对方</label>
            <input v-model="form.borrower" type="text" class="field-input" placeholder="姓名" />
          </div>
          <div>
            <label class="field-label">金额</label>
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
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="field-label">借出日</label>
              <input v-model="form.lendDate" type="date" class="field-input" />
            </div>
            <div>
              <label class="field-label">预计归还</label>
              <input v-model="form.expectedReturnDate" type="date" class="field-input" />
            </div>
          </div>
          <div>
            <label class="field-label">备注</label>
            <input v-model="form.notes" type="text" class="field-input" />
          </div>
        </div>
        <p class="text-xs text-subtext-light dark:text-subtext-dark mt-3">
          活期↓、借出应收↑，总资产不变。
        </p>
        <div class="flex justify-end gap-2 mt-5">
          <button type="button" class="btn-ghost" @click="close">取消</button>
          <button type="button" class="btn-primary" @click="submitLend">确认借出</button>
        </div>
      </div>
    </div>

    <!-- 收回 -->
    <div v-if="dialog === 'repay'" class="modal-mask" @click.self="close">
      <div class="modal-panel" role="dialog">
        <h3 class="text-base font-semibold mb-1">收回 · {{ active?.borrower }}</h3>
        <p class="text-xs text-subtext-light dark:text-subtext-dark mb-4">
          未还本金 ¥{{ formatAmount(pendingOf(active)) }}
        </p>
        <div class="space-y-3">
          <div>
            <label class="field-label">还本金额（默认全部）</label>
            <input
              v-model.number="form.principalAmount"
              type="number"
              min="0"
              step="0.01"
              class="field-input"
              :placeholder="String(pendingOf(active))"
            />
          </div>
          <div>
            <label class="field-label">利息（可选，进活期）</label>
            <input v-model.number="form.interestAmount" type="number" min="0" step="0.01" class="field-input" />
          </div>
          <div>
            <label class="field-label">入账银行活期</label>
            <select v-model="form.bankId" class="field-input">
              <option v-for="b in banks" :key="b.id" :value="b.id">
                {{ b.name }} · ¥{{ formatAmount(demandOf(b.id)) }}
              </option>
            </select>
          </div>
          <div>
            <label class="field-label">实际归还日</label>
            <input v-model="form.actualReturnDate" type="date" class="field-input" />
          </div>
        </div>
        <p class="text-xs text-subtext-light dark:text-subtext-dark mt-3">
          还本：总资产不变 · 利息：总资产增加
        </p>
        <div class="flex justify-end gap-2 mt-5">
          <button type="button" class="btn-ghost" @click="close">取消</button>
          <button type="button" class="btn-primary" @click="submitRepay">确认收回</button>
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
import { useLentMoneyStore } from '../stores/lentMoney.js'
import { useBankAccountsStore } from '../stores/bankAccounts.js'

const banks = BANKS
const lentStore = useLentMoneyStore()
const bankStore = useBankAccountsStore()

const records = computed(() => lentStore.lentRecords)
const recordsByDueDate = computed(() => lentStore.recordsByDueDate)
const pendingAmount = computed(() => lentStore.pendingAmount)
const returnedAmount = computed(() => lentStore.returnedAmount)
const maturingRecords = computed(() => lentStore.maturingRecords)
const overdueRecords = computed(() => lentStore.overdueRecords)
const stats = computed(() => lentStore.statistics)

const dialog = ref(null)
const active = ref(null)
const form = reactive({
  borrower: '',
  amount: 0,
  bankId: 'cmb',
  lendDate: today(),
  expectedReturnDate: '',
  notes: '',
  principalAmount: null,
  interestAmount: 0,
  actualReturnDate: today()
})

function today() {
  return new Date().toISOString().split('T')[0]
}

function demandOf(bankId) {
  const a = bankStore.accountById(bankId)
  return a ? Number(a.demandBalance) || 0 : 0
}

function pendingOf(row) {
  if (!row) return 0
  if (typeof row.pendingPrincipal === 'number') return row.pendingPrincipal
  if (row.remainingAmount != null) return Math.max(0, Number(row.remainingAmount) || 0)
  if (row.status === 'returned') return 0
  return Number(row.amount) || 0
}

function isRet(row) {
  return row?.status === 'returned' || pendingOf(row) <= 0
}

function statusText(row) {
  return typeof row.getStatusText === 'function' ? row.getStatusText() : row.status
}

function statusColor(row) {
  return typeof row.getStatusColor === 'function' ? row.getStatusColor() : undefined
}

function resetForm() {
  form.borrower = ''
  form.amount = 0
  form.bankId = 'cmb'
  form.lendDate = today()
  form.expectedReturnDate = ''
  form.notes = ''
  form.principalAmount = null
  form.interestAmount = 0
  form.actualReturnDate = today()
}

function close() {
  dialog.value = null
  active.value = null
  resetForm()
}

function openLend() {
  resetForm()
  // 默认预计 +1 年
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  form.expectedReturnDate = d.toISOString().split('T')[0]
  dialog.value = 'lend'
}

function openRepay(row) {
  active.value = row
  resetForm()
  form.bankId = row.bankId || 'cmb'
  form.principalAmount = pendingOf(row)
  form.interestAmount = 0
  form.actualReturnDate = today()
  dialog.value = 'repay'
}

function submitLend() {
  try {
    lentStore.lendFromBank({
      borrower: form.borrower,
      amount: form.amount,
      bankId: form.bankId,
      lendDate: form.lendDate,
      expectedReturnDate: form.expectedReturnDate,
      notes: form.notes
    })
    ElMessage.success('已借出 · 总资产不变')
    close()
  } catch (e) {
    ElMessage.error(e.message || '失败')
  }
}

function submitRepay() {
  try {
    const result = lentStore.repayToBank(active.value.id, {
      principalAmount:
        form.principalAmount == null || form.principalAmount === ''
          ? undefined
          : form.principalAmount,
      interestAmount: form.interestAmount,
      bankId: form.bankId,
      actualReturnDate: form.actualReturnDate
    })
    const msg =
      result.interest > 0
        ? `已收回 · 本金 ¥${formatAmount(result.principal)} · 利息 ¥${formatAmount(result.interest)}`
        : `已收回本金 ¥${formatAmount(result.principal)}`
    ElMessage.success(msg)
    close()
  } catch (e) {
    ElMessage.error(e.message || '失败')
  }
}

async function remove(row) {
  const pending = pendingOf(row)
  try {
    if (pending > 0 && !isRet(row)) {
      await ElMessageBox.confirm(
        `「${row.borrower}」仍有未还 ¥${formatAmount(pending)}，删除将退回${row.bankId ? '原' : '所选'}银行活期。是否继续？`,
        '删除借出',
        { type: 'warning', confirmButtonText: '删除并退回活期', cancelButtonText: '取消' }
      )
      lentStore.removeLentRecord(row.id, {
        restoreDemand: true,
        bankId: row.bankId || 'cmb'
      })
    } else {
      await ElMessageBox.confirm(`删除「${row.borrower}」的记录？`, '删除', {
        type: 'warning'
      })
      lentStore.removeLentRecord(row.id, { restoreDemand: false })
    }
    ElMessage.success('已删除')
  } catch (e) {
    if (e === 'cancel' || e === 'close') return
    if (e?.message) ElMessage.error(e.message)
  }
}

onMounted(() => {
  lentStore.loadFromLocalStorage()
  bankStore.loadFromLocalStorage()
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
