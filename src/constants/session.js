/**
 * 会话与闲置安全
 */

/** 无操作自动退出（毫秒）。默认 30 分钟 */
export const IDLE_TIMEOUT_MS =
  (typeof process !== 'undefined' &&
    process.env &&
    Number(process.env.VUE_APP_IDLE_TIMEOUT_MS)) ||
  30 * 60 * 1000

/** 用于检测「用户还在」的事件 */
export const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
  'wheel'
]
