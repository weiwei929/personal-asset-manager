/**
 * 登录后：空闲超时自动退出会话（不删账本 · P0-2(b) / S4'）
 *
 * 硬约束：只调用 auth.logout() 清会话，禁止调用 App 的 logout() /
 * wipeLedger* / clearAllData。吃饭回来账本必须还在。
 */
import { onMounted, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth.js'
import { IDLE_TIMEOUT_MS, ACTIVITY_EVENTS } from '../constants/session.js'

export function useIdleLogout(isAuthenticatedRef) {
  const auth = useAuthStore()
  let timer = null
  let lastActive = Date.now()
  let bound = false

  const touch = () => {
    lastActive = Date.now()
  }

  const tick = () => {
    if (!auth.isAuthenticated) return
    if (Date.now() - lastActive >= IDLE_TIMEOUT_MS) {
      // P0-2(b)：仅清会话，不清账本缓存 / 不清 pam-cloud-bound
      auth.logout()
      ElMessage.warning(
        `已闲置超过 ${Math.round(IDLE_TIMEOUT_MS / 60000)} 分钟，已自动退出登录`
      )
      stop()
    }
  }

  const start = () => {
    if (bound) return
    bound = true
    lastActive = Date.now()
    ACTIVITY_EVENTS.forEach(ev => {
      window.addEventListener(ev, touch, { passive: true, capture: true })
    })
    timer = window.setInterval(tick, 15000)
  }

  const stop = () => {
    if (!bound) return
    bound = false
    ACTIVITY_EVENTS.forEach(ev => {
      window.removeEventListener(ev, touch, { capture: true })
    })
    if (timer != null) {
      clearInterval(timer)
      timer = null
    }
  }

  onMounted(() => {
    if (isAuthenticatedRef && isAuthenticatedRef.value) start()
  })

  onUnmounted(() => {
    stop()
  })

  if (isAuthenticatedRef && typeof isAuthenticatedRef === 'object' && 'value' in isAuthenticatedRef) {
    watch(
      isAuthenticatedRef,
      (v) => {
        if (v) start()
        else stop()
      },
      { immediate: true }
    )
  }

  return { start, stop, touch }
}
