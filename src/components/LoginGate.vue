<template>
  <div
    class="min-h-screen flex items-center justify-center px-4
           bg-background-light dark:bg-background-dark
           text-text-light dark:text-text-dark"
  >
    <div
      class="w-full max-w-sm rounded-2xl border border-border-light dark:border-border-dark
             bg-card-light dark:bg-card-dark p-6 sm:p-8 shadow-lg"
    >
      <div class="mb-6 text-center">
        <p class="text-lg font-semibold tracking-tight">我的账本</p>
        <p class="text-xs text-subtext-light dark:text-subtext-dark mt-1">
          {{ isSetup ? '首次使用 · 设置登录密码' : '请登录后继续' }}
        </p>
      </div>

      <!-- 首次设密 -->
      <form v-if="isSetup" class="space-y-4" @submit.prevent="onSetup">
        <div>
          <label class="field-label">设置登录密码</label>
          <input
            v-model="password"
            type="password"
            class="field-input"
            autocomplete="new-password"
            placeholder="至少 6 位"
            required
          />
        </div>
        <div>
          <label class="field-label">确认密码</label>
          <input
            v-model="confirm"
            type="password"
            class="field-input"
            autocomplete="new-password"
            placeholder="再输入一次"
            required
          />
        </div>
        <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
        <p class="text-xs text-subtext-light dark:text-subtext-dark leading-relaxed">
          密码仅保存在本机（加盐哈希）。重置业务数据时也会要求输入此密码。
          忘记密码只能清除站点数据后重新设置（账本数据会一并丢失）。
        </p>
        <button type="submit" class="btn-primary w-full" :disabled="busy">
          {{ busy ? '处理中…' : '设置并进入' }}
        </button>
      </form>

      <!-- 登录 -->
      <form v-else class="space-y-4" @submit.prevent="onLogin">
        <div>
          <label class="field-label">登录密码</label>
          <input
            v-model="password"
            type="password"
            class="field-input"
            autocomplete="current-password"
            placeholder="请输入登录密码"
            required
          />
        </div>
        <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
        <button type="submit" class="btn-primary w-full" :disabled="busy">
          {{ busy ? '验证中…' : '登录' }}
        </button>
      </form>

      <div class="mt-6 flex justify-center">
        <ThemeToggle />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth.js'
import ThemeToggle from './ThemeToggle.vue'

const auth = useAuthStore()
const password = ref('')
const confirm = ref('')
const error = ref('')
const busy = ref(false)

const isSetup = computed(() => auth.needsSetup)

async function onSetup() {
  error.value = ''
  busy.value = true
  try {
    await auth.setupPassword(password.value, confirm.value)
    password.value = ''
    confirm.value = ''
  } catch (e) {
    error.value = e.message || '设置失败'
  } finally {
    busy.value = false
  }
}

async function onLogin() {
  error.value = ''
  busy.value = true
  try {
    await auth.login(password.value)
    password.value = ''
  } catch (e) {
    error.value = e.message || '登录失败'
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  auth.load()
})
</script>

<style scoped>
.field-label {
  @apply block text-xs text-subtext-light dark:text-subtext-dark mb-1;
}
.field-input {
  @apply w-full rounded-lg border border-border-light dark:border-border-dark
    bg-background-light dark:bg-background-dark
    px-3 py-2.5 text-sm text-text-light dark:text-text-dark
    focus:outline-none focus:ring-1 focus:ring-primary/40;
}
.btn-primary {
  @apply px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium
    hover:opacity-90 disabled:opacity-50;
}
</style>
