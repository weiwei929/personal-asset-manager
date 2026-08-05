<template>
  <div class="space-y-5">
    <p class="text-sm text-subtext-light dark:text-subtext-dark">
      四家银行固定户：每户 <strong>1 个活期</strong> + <strong>多笔定期</strong>。
      银行间转账总资产不变；还信用卡从活期出、总资产减少。
    </p>

    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <div class="stat-mini">
        <p class="label">可用现金（活期）</p>
        <p class="value">¥{{ formatAmount(totalDemand) }}</p>
      </div>
      <div class="stat-mini">
        <p class="label">银行存款（定期）</p>
        <p class="value">¥{{ formatAmount(totalTime) }}</p>
      </div>
      <div class="stat-mini col-span-2 sm:col-span-1">
        <p class="label">银行侧合计</p>
        <p class="value">¥{{ formatAmount(totalDemand + totalTime) }}</p>
      </div>
    </div>

    <!-- 全局操作 -->
    <div class="flex flex-wrap gap-2">
      <button type="button" class="btn-primary text-sm" @click="openInterBank">银行间转账</button>
      <button type="button" class="btn-primary text-sm" @click="openCreditRepay">还信用卡</button>
    </div>

    <!-- 四户 -->
    <div class="space-y-4">
      <section
        v-for="acc in accounts"
        :key="acc.id"
        class="rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark overflow-hidden"
      >
        <div class="p-4 sm:p-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-sm font-semibold text-text-light dark:text-text-dark">{{ acc.name }}</h3>
              <span
                v-if="bankRole(acc.id)"
                class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300"
              >
                {{ bankRole(acc.id) }}
              </span>
            </div>
            <p class="text-xs text-subtext-light dark:text-subtext-dark mt-0.5">{{ acc.id }}</p>
            <p
              v-if="bankNote(acc.id)"
              class="text-xs text-subtext-light dark:text-subtext-dark mt-1 max-w-md"
            >
              {{ bankNote(acc.id) }}
            </p>
          </div>
          <div class="text-right">
            <p class="text-xs text-subtext-light dark:text-subtext-dark">活期</p>
            <p class="text-xl font-semibold tabular-nums">¥{{ formatAmount(acc.demandBalance) }}</p>
          </div>
        </div>

        <div class="px-4 sm:px-5 pb-3 flex flex-wrap gap-2">
          <button type="button" class="btn-sm" @click="openAdjust(acc)">校正活期</button>
          <button type="button" class="btn-sm" @click="openToTime(acc)">活期→定期</button>
          <button type="button" class="btn-sm" @click="openAddTime(acc)">
            {{ acc.id === 'ceb' ? '+ 公积金存入' : '+ 定期（不扣活期）' }}
          </button>
          <button type="button" class="btn-sm" @click="openInterBankFrom(acc)">转出到他行</button>
          <button type="button" class="btn-sm" @click="openCreditFrom(acc)">从此行还信用卡</button>
        </div>

        <div class="border-t border-border-light dark:border-border-dark px-4 sm:px-5 py-3">
          <p class="text-xs font-medium text-subtext-light dark:text-subtext-dark mb-2">
            {{ acc.id === 'ceb' ? '公积金 / 定期' : '定期产品' }}
            · {{ (acc.timeDeposits || []).length }} 笔 ·
            ¥{{ formatAmount(sumTime(acc)) }}
          </p>
          <ul v-if="acc.timeDeposits?.length" class="space-y-2">
            <li
              v-for="td in acc.timeDeposits"
              :key="td.id"
              class="flex flex-wrap items-center justify-between gap-2 text-sm py-2 border-b border-border-light/60 dark:border-border-dark/60 last:border-0"
            >
              <div class="min-w-0">
                <p class="font-medium truncate">{{ td.name || '定期' }}</p>
                <p class="text-xs text-subtext-light dark:text-subtext-dark">
                  <span v-if="td.startDate">{{ td.startDate }}</span>
                  <span v-if="td.startDate || td.maturityDate"> → </span>
                  <span v-if="td.maturityDate">{{ td.maturityDate }}</span>
                  <span v-if="!td.startDate && !td.maturityDate">无日期</span>
                </p>
              </div>
              <div class="flex items-center gap-3">
                <span class="tabular-nums font-medium">¥{{ formatAmount(td.principal) }}</span>
                <button type="button" class="link" @click="openFromTime(acc, td)">→活期</button>
                <button type="button" class="link-danger" @click="removeTime(acc, td)">删</button>
              </div>
            </li>
          </ul>
          <p v-else class="text-xs text-subtext-light dark:text-subtext-dark">
            {{ acc.id === 'ceb' ? '暂无公积金存款记录' : '暂无定期' }}
          </p>
        </div>
      </section>
    </div>

    <!-- 信用卡说明 -->
    <section class="rounded-xl border border-dashed border-border-light dark:border-border-dark p-4">
      <h3 class="text-sm font-medium mb-2">信用卡（还款出口，非资产）</h3>
      <ul class="text-xs text-subtext-light dark:text-subtext-dark space-y-1.5">
        <li v-for="c in creditCards" :key="c.id">
          <strong class="text-text-light dark:text-text-dark">{{ c.name }}</strong>
          — {{ c.note }}
        </li>
      </ul>
      <p class="text-xs text-subtext-light dark:text-subtext-dark mt-2">
        还信用卡会减少活期与总资产。若当月已在「月度收支」记过信用卡小计并入账，请勿对同一笔再转账还款。
      </p>
    </section>

    <!-- 校正活期 -->
    <div v-if="dialog === 'adjust'" class="modal-mask" @click.self="close">
      <div class="modal-panel">
        <h3 class="text-base font-semibold mb-1">校正活期 · {{ activeBank?.name }}</h3>
        <p class="text-xs text-subtext-light dark:text-subtext-dark mb-4">
          直接改绝对值（对账用）。会改变总资产。
        </p>
        <label class="field-label">活期余额</label>
        <input v-model.number="form.amount" type="number" min="0" step="0.01" class="field-input" />
        <div class="flex justify-end gap-2 mt-5">
          <button type="button" class="btn-ghost" @click="close">取消</button>
          <button type="button" class="btn-primary" @click="submitAdjust">保存</button>
        </div>
      </div>
    </div>

    <!-- 活期→定期 -->
    <div v-if="dialog === 'toTime'" class="modal-mask" @click.self="close">
      <div class="modal-panel">
        <h3 class="text-base font-semibold mb-1">活期 → 定期 · {{ activeBank?.name }}</h3>
        <p class="text-xs text-subtext-light dark:text-subtext-dark mb-4">
          当前活期 ¥{{ formatAmount(activeBank?.demandBalance) }} · 总资产不变
        </p>
        <div class="space-y-3">
          <div>
            <label class="field-label">金额</label>
            <input v-model.number="form.amount" type="number" min="0" step="0.01" class="field-input" />
          </div>
          <div>
            <label class="field-label">产品名称</label>
            <input
              v-model="form.name"
              type="text"
              class="field-input"
              :placeholder="activeBank?.id === 'ceb' ? '如 公积金月存' : '如 大额存单'"
            />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="field-label">起息</label>
              <input v-model="form.startDate" type="date" class="field-input" />
            </div>
            <div>
              <label class="field-label">到期</label>
              <input v-model="form.maturityDate" type="date" class="field-input" />
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button type="button" class="btn-ghost" @click="close">取消</button>
          <button type="button" class="btn-primary" @click="submitToTime">确认划转</button>
        </div>
      </div>
    </div>

    <!-- 仅加定期 -->
    <div v-if="dialog === 'addTime'" class="modal-mask" @click.self="close">
      <div class="modal-panel">
        <h3 class="text-base font-semibold mb-1">
          {{ activeBank?.id === 'ceb' ? '新增公积金存款' : '新增定期' }} · {{ activeBank?.name }}
        </h3>
        <p class="text-xs text-amber-700 dark:text-amber-400 mb-4">
          不扣活期 · 会增加总资产。若钱来自活期请用「活期→定期」。
        </p>
        <div class="space-y-3">
          <div>
            <label class="field-label">金额</label>
            <input v-model.number="form.amount" type="number" min="0" step="0.01" class="field-input" />
          </div>
          <div>
            <label class="field-label">名称</label>
            <input v-model="form.name" type="text" class="field-input" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="field-label">起息</label>
              <input v-model="form.startDate" type="date" class="field-input" />
            </div>
            <div>
              <label class="field-label">到期</label>
              <input v-model="form.maturityDate" type="date" class="field-input" />
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button type="button" class="btn-ghost" @click="close">取消</button>
          <button type="button" class="btn-primary" @click="submitAddTime">添加</button>
        </div>
      </div>
    </div>

    <!-- 定期→活期 -->
    <div v-if="dialog === 'fromTime'" class="modal-mask" @click.self="close">
      <div class="modal-panel">
        <h3 class="text-base font-semibold mb-1">定期 → 活期 · {{ activeBank?.name }}</h3>
        <p class="text-xs text-subtext-light dark:text-subtext-dark mb-4">
          {{ activeTd?.name }} · 本金 ¥{{ formatAmount(activeTd?.principal) }} · 总资产不变
        </p>
        <div>
          <label class="field-label">支取金额（空=全部）</label>
          <input
            v-model.number="form.amount"
            type="number"
            min="0"
            step="0.01"
            class="field-input"
            :placeholder="String(activeTd?.principal || 0)"
          />
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button type="button" class="btn-ghost" @click="close">取消</button>
          <button type="button" class="btn-primary" @click="submitFromTime">确认</button>
        </div>
      </div>
    </div>

    <!-- 银行间转账 -->
    <div v-if="dialog === 'interBank'" class="modal-mask" @click.self="close">
      <div class="modal-panel">
        <h3 class="text-base font-semibold mb-1">银行间转账</h3>
        <p class="text-xs text-subtext-light dark:text-subtext-dark mb-4">
          活期 → 活期 · 总资产不变
        </p>
        <div class="space-y-3">
          <div>
            <label class="field-label">从</label>
            <select v-model="form.fromBankId" class="field-input">
              <option v-for="b in accounts" :key="'f-' + b.id" :value="b.id">
                {{ b.name }} · ¥{{ formatAmount(b.demandBalance) }}
              </option>
            </select>
          </div>
          <div>
            <label class="field-label">到</label>
            <select v-model="form.toBankId" class="field-input">
              <option v-for="b in accounts" :key="'t-' + b.id" :value="b.id">
                {{ b.name }} · ¥{{ formatAmount(b.demandBalance) }}
              </option>
            </select>
          </div>
          <div>
            <label class="field-label">金额</label>
            <input v-model.number="form.amount" type="number" min="0" step="0.01" class="field-input" />
          </div>
          <div>
            <label class="field-label">备注（可选）</label>
            <input v-model="form.note" type="text" class="field-input" placeholder="如 调拨 / 公积金" />
          </div>
        </div>
        <p
          v-if="form.toBankId === 'ceb'"
          class="text-xs text-amber-700 dark:text-amber-400 mt-3"
        >
          转入光大：常用于住房公积金相关调拨。
        </p>
        <div class="flex justify-end gap-2 mt-5">
          <button type="button" class="btn-ghost" @click="close">取消</button>
          <button type="button" class="btn-primary" @click="submitInterBank">确认转账</button>
        </div>
      </div>
    </div>

    <!-- 还信用卡 -->
    <div v-if="dialog === 'credit'" class="modal-mask" @click.self="close">
      <div class="modal-panel">
        <h3 class="text-base font-semibold mb-1">还信用卡</h3>
        <p class="text-xs text-subtext-light dark:text-subtext-dark mb-4">
          从银行活期扣款 · 总资产减少（钱离开账本）
        </p>
        <div class="space-y-3">
          <div>
            <label class="field-label">信用卡</label>
            <select v-model="form.cardId" class="field-input">
              <option v-for="c in creditCards" :key="c.id" :value="c.id">
                {{ c.name }}{{ c.autoBankId ? '（可自动扣）' : '' }}
              </option>
            </select>
            <p v-if="selectedCardNote" class="text-xs text-subtext-light dark:text-subtext-dark mt-1">
              {{ selectedCardNote }}
            </p>
          </div>
          <div>
            <label class="field-label">扣款银行活期</label>
            <select v-model="form.fromBankId" class="field-input">
              <option v-for="b in accounts" :key="'c-' + b.id" :value="b.id">
                {{ b.name }} · ¥{{ formatAmount(b.demandBalance) }}
              </option>
            </select>
          </div>
          <div>
            <label class="field-label">金额</label>
            <input v-model.number="form.amount" type="number" min="0" step="0.01" class="field-input" />
          </div>
          <div>
            <label class="field-label">备注（可选）</label>
            <input v-model="form.note" type="text" class="field-input" placeholder="如 6 月账单" />
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button type="button" class="btn-ghost" @click="close">取消</button>
          <button type="button" class="btn-primary" @click="submitCredit">确认还款</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatAmount } from '../utils/format.js'
import {
  CREDIT_CARDS,
  getBankMeta,
  getCreditCardMeta
} from '../constants/banks.js'
import { useBankAccountsStore } from '../stores/bankAccounts.js'

const bankStore = useBankAccountsStore()
const creditCards = CREDIT_CARDS

const accounts = computed(() => bankStore.accounts)
const totalDemand = computed(() => bankStore.totalDemand)
const totalTime = computed(() => bankStore.totalTimeDeposit)

const dialog = ref(null)
const activeBank = ref(null)
const activeTd = ref(null)
const form = reactive({
  amount: 0,
  name: '',
  startDate: '',
  maturityDate: '',
  fromBankId: 'cmb',
  toBankId: 'cscb',
  cardId: 'cmb_cc',
  note: ''
})

const selectedCardNote = computed(() => {
  const m = getCreditCardMeta(form.cardId)
  return m?.note || ''
})

function bankRole(id) {
  return getBankMeta(id)?.roleLabel || null
}

function bankNote(id) {
  return getBankMeta(id)?.note || null
}

function sumTime(acc) {
  return (acc.timeDeposits || []).reduce((s, d) => s + (Number(d.principal) || 0), 0)
}

function resetForm() {
  form.amount = 0
  form.name = ''
  form.startDate = ''
  form.maturityDate = ''
  form.fromBankId = 'cmb'
  form.toBankId = 'cscb'
  form.cardId = 'cmb_cc'
  form.note = ''
}

function close() {
  dialog.value = null
  activeBank.value = null
  activeTd.value = null
  resetForm()
}

function openAdjust(acc) {
  activeBank.value = acc
  form.amount = Number(acc.demandBalance) || 0
  dialog.value = 'adjust'
}

function openToTime(acc) {
  activeBank.value = acc
  resetForm()
  form.name = acc.id === 'ceb' ? '公积金' : '定期产品'
  dialog.value = 'toTime'
}

function openAddTime(acc) {
  activeBank.value = acc
  resetForm()
  form.name = acc.id === 'ceb' ? '公积金' : '定期产品'
  dialog.value = 'addTime'
}

function openFromTime(acc, td) {
  activeBank.value = acc
  activeTd.value = td
  form.amount = null
  dialog.value = 'fromTime'
}

function openInterBank() {
  resetForm()
  form.fromBankId = 'cmb'
  form.toBankId = 'cscb'
  dialog.value = 'interBank'
}

function openInterBankFrom(acc) {
  resetForm()
  form.fromBankId = acc.id
  form.toBankId = acc.id === 'cmb' ? 'cscb' : 'cmb'
  dialog.value = 'interBank'
}

function openCreditRepay() {
  resetForm()
  form.cardId = 'cmb_cc'
  form.fromBankId = 'cmb'
  dialog.value = 'credit'
}

function openCreditFrom(acc) {
  resetForm()
  form.fromBankId = acc.id
  // 招行默认招行卡；其它默认广发（需手选）
  form.cardId = acc.id === 'cmb' ? 'cmb_cc' : 'cgb_cc'
  dialog.value = 'credit'
}

watch(
  () => form.cardId,
  (id) => {
    const m = getCreditCardMeta(id)
    if (m?.autoBankId && dialog.value === 'credit') {
      // 仅在打开还信用卡且选了自动扣卡时建议扣款行，不强制覆盖用户已改的 from
      if (id === 'cmb_cc' && form.fromBankId !== m.autoBankId) {
        // soft default once
      }
    }
  }
)

function submitAdjust() {
  try {
    bankStore.setDemandBalance(activeBank.value.id, form.amount, {
      note: '手工校正活期'
    })
    ElMessage.success('活期已更新')
    close()
  } catch (e) {
    ElMessage.error(e.message || '失败')
  }
}

function submitToTime() {
  try {
    bankStore.transferDemandToTime(activeBank.value.id, form.amount, {
      name: form.name || (activeBank.value.id === 'ceb' ? '公积金' : '定期产品'),
      startDate: form.startDate || null,
      maturityDate: form.maturityDate || null
    })
    ElMessage.success('已划转 · 总资产不变')
    close()
  } catch (e) {
    ElMessage.error(e.message || '失败')
  }
}

function submitAddTime() {
  try {
    bankStore.addTimeDeposit(activeBank.value.id, {
      name: form.name || (activeBank.value.id === 'ceb' ? '公积金' : '定期产品'),
      principal: form.amount,
      startDate: form.startDate || null,
      maturityDate: form.maturityDate || null
    })
    ElMessage.success('已添加')
    close()
  } catch (e) {
    ElMessage.error(e.message || '失败')
  }
}

function submitFromTime() {
  try {
    const amt =
      form.amount == null || form.amount === '' ? null : form.amount
    bankStore.transferTimeToDemand(
      activeBank.value.id,
      activeTd.value.id,
      amt
    )
    ElMessage.success('已转回活期 · 总资产不变')
    close()
  } catch (e) {
    ElMessage.error(e.message || '失败')
  }
}

function submitInterBank() {
  try {
    bankStore.transferBetweenBanks(
      form.fromBankId,
      form.toBankId,
      form.amount,
      { note: form.note || undefined }
    )
    ElMessage.success('银行间转账成功 · 总资产不变')
    close()
  } catch (e) {
    ElMessage.error(e.message || '失败')
  }
}

function submitCredit() {
  try {
    bankStore.repayCreditCard(
      form.fromBankId,
      form.cardId,
      form.amount,
      { note: form.note || undefined }
    )
    ElMessage.success('已还信用卡 · 活期与总资产已减少')
    close()
  } catch (e) {
    ElMessage.error(e.message || '失败')
  }
}

async function removeTime(acc, td) {
  try {
    await ElMessageBox.confirm(
      `删除「${td.name}」¥${formatAmount(td.principal)}？可选择是否转回活期。`,
      '删除定期',
      {
        distinguishCancelAndClose: true,
        confirmButtonText: '删并转回活期',
        cancelButtonText: '仅删除（减总资产）',
        type: 'warning'
      }
    )
    bankStore.removeTimeDeposit(acc.id, td.id, { returnToDemand: true })
    ElMessage.success('已删除并转回活期')
  } catch (action) {
    if (action === 'cancel') {
      try {
        bankStore.removeTimeDeposit(acc.id, td.id, { returnToDemand: false })
        ElMessage.success('已删除定期')
      } catch (e) {
        ElMessage.error(e.message || '失败')
      }
    }
  }
}

onMounted(() => {
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
.btn-sm {
  @apply px-2.5 py-1.5 rounded-lg border border-border-light dark:border-border-dark text-xs
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
    bg-card-light dark:bg-card-dark p-5 shadow-xl max-h-[90vh] overflow-y-auto;
}
</style>
