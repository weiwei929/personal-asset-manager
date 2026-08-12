<template>
  <div
    class="sync-status-indicator inline-flex items-center gap-1.5 min-w-0"
    :class="rootClass"
    role="status"
    :aria-live="ariaLive"
    :aria-label="ariaLabel"
    :title="status.detail"
  >
    <span
      class="shrink-0 w-1.5 h-1.5 rounded-full"
      :class="dotClass"
      aria-hidden="true"
    />
    <span class="text-xs truncate leading-none">{{ status.label }}</span>
  </div>
</template>

<script>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  getSyncUiStatus,
  subscribeSyncStatus
} from '../utils/cloudSync.js'
import { SYNC_UI_STATUS } from '../utils/syncStatus.js'

export default {
  name: 'SyncStatusIndicator',
  props: {
    /** compact：仅标签；sidebar：侧栏底/顶略宽 */
    variant: {
      type: String,
      default: 'compact'
    }
  },
  setup(props) {
    const status = ref(getSyncUiStatus())
    let unsubscribe = null

    onMounted(() => {
      unsubscribe = subscribeSyncStatus((next) => {
        status.value = next
      })
    })

    onUnmounted(() => {
      if (typeof unsubscribe === 'function') unsubscribe()
    })

    const ariaLabel = computed(
      () => `云同步：${status.value.label}。${status.value.detail}`
    )

    const ariaLive = computed(() =>
      status.value.id === SYNC_UI_STATUS.SYNCED ? 'off' : 'polite'
    )

    const rootClass = computed(() => {
      const tone = status.value.tone
      const base =
        props.variant === 'sidebar'
          ? 'px-2 py-1 rounded-md max-w-full'
          : 'px-1.5 py-0.5 rounded max-w-[9rem]'
      const tones = {
        ok: 'text-emerald-700 dark:text-emerald-400/90',
        warn: 'text-amber-800 dark:text-amber-300/90',
        error: 'text-red-700 dark:text-red-400/90',
        muted: 'text-subtext-light dark:text-subtext-dark'
      }
      return [base, tones[tone] || tones.muted]
    })

    const dotClass = computed(() => {
      const tones = {
        ok: 'bg-emerald-600 dark:bg-emerald-400',
        warn: 'bg-amber-600 dark:bg-amber-400',
        error: 'bg-red-600 dark:bg-red-400',
        muted: 'bg-gray-400 dark:bg-gray-500'
      }
      return tones[status.value.tone] || tones.muted
    })

    return {
      status,
      ariaLabel,
      ariaLive,
      rootClass,
      dotClass
    }
  }
}
</script>
