/**
 * 数据重置工具
 * 清除业务账本 localStorage；执行前须校验登录密码。
 * 键表真源：constants/storageKeys.js（ALL_CLEARABLE_KEYS）
 * 保留：AUTH、THEME、session 登录标记
 */

import {
  ALL_CLEARABLE_KEYS,
  STORAGE_KEYS,
  PRESERVED_ON_RESET_KEYS
} from '../constants/storageKeys.js'
import { useAuthStore } from '../stores/auth.js'

/** 与 ALL_CLEARABLE_KEYS 一致，勿在本文件另列魔法字符串 */
const CLEARABLE_KEYS = [...ALL_CLEARABLE_KEYS]

// 默认分类数据（重置后写回，避免空键）
const DEFAULT_CATEGORIES = [
  {
    id: "1",
    name: "工资收入",
    type: "income",
    color: "#67C23A"
  },
  {
    id: "2", 
    name: "投资收益",
    type: "income",
    color: "#E6A23C"
  },
  {
    id: "3",
    name: "其他收入", 
    type: "income",
    color: "#909399"
  },
  {
    id: "4",
    name: "餐饮",
    type: "expense",
    color: "#F56C6C"
  },
  {
    id: "5",
    name: "交通",
    type: "expense", 
    color: "#409EFF"
  },
  {
    id: "6",
    name: "购物",
    type: "expense",
    color: "#C71585"
  },
  {
    id: "7",
    name: "娱乐",
    type: "expense",
    color: "#FF7F50"
  },
  {
    id: "8",
    name: "其他支出",
    type: "expense",
    color: "#909399"
  }
]

/**
 * 清除业务账本数据（保留登录密码与主题偏好）
 */
export function clearAllData() {
  try {
    CLEARABLE_KEYS.forEach(key => {
      localStorage.removeItem(key)
    })
    // 分类：清除后写回默认（仍属业务键，不在 PRESERVED 内）
    localStorage.setItem(
      STORAGE_KEYS.FINANCE_CATEGORIES,
      JSON.stringify(DEFAULT_CATEGORIES)
    )

    // eslint-disable-next-line no-console
    console.log(
      '✅ 业务数据已清除（保留:',
      PRESERVED_ON_RESET_KEYS.join(', '),
      '）'
    )
    return { success: true, message: '数据重置成功' }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ 数据重置失败:', error)
    return { success: false, message: '数据重置失败', error }
  }
}

/**
 * 安全退出：校验登录密码 → 清账本 → 退出会话
 * @param {string} password
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function secureLogoutAndWipe(password) {
  const auth = useAuthStore()
  const ok = await auth.verifyLoginPassword(password)
  if (!ok) {
    return { success: false, message: '登录密码错误，未清除数据' }
  }
  const result = clearAllData()
  if (!result.success) return result
  auth.logout()
  return {
    success: true,
    message: '本机账本已清除，已退出登录（登录密码仍保留，可重新登录后建账）'
  }
}

/**
 * UI：安全退出并清除本机账本（确认 → 登录密码 → wipe + logout）
 * @param {(result: { success: boolean, message: string }) => void} [onSuccess]
 */
export function showSecureLogoutDialog(onSuccess) {
  return new Promise((resolve) => {
    const { overlay, dialog } = createOverlayDialog(`
      <div style="display: flex; align-items: center; margin-bottom: 16px;">
        <span style="font-size: 24px; margin-right: 12px;">🛡️</span>
        <h3 style="margin: 0; color: #e6a23c;">安全退出并清除本机账本</h3>
      </div>
      <p style="margin: 0 0 16px; color: #666; line-height: 1.55; font-size: 14px;">
        适用于<strong>公共电脑 / 借出设备</strong>离开前：<br><br>
        • 清除本机账本业务数据（银行、收支、投资、借贷等）<br>
        • 退出当前登录会话<br>
        • <strong>保留</strong>登录密码（回到本机后可重新登录并建账）<br><br>
        与「退出登录」不同：退出登录<strong>不删</strong>账本。<br>
        <strong style="color: #f56c6c;">清除后无法从本站恢复账本！</strong>
      </p>
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button id="cancel-secure" type="button" style="
          padding: 8px 16px; border: 1px solid #ddd; background: white;
          border-radius: 4px; cursor: pointer;">取消</button>
        <button id="next-secure" type="button" style="
          padding: 8px 16px; border: none; background: #e6a23c; color: white;
          border-radius: 4px; cursor: pointer;">下一步：输入登录密码</button>
      </div>
    `)

    const cleanup = () => {
      if (overlay.parentNode) document.body.removeChild(overlay)
    }

    dialog.querySelector('#cancel-secure').onclick = () => {
      cleanup()
      resolve(false)
    }
    dialog.querySelector('#next-secure').onclick = () => {
      cleanup()
      showSecureLogoutPasswordAndWipe(onSuccess).then(resolve)
    }
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        cleanup()
        resolve(false)
      }
    }
  })
}

/**
 * 安全退出：输入密码并执行 wipe + logout
 */
function showSecureLogoutPasswordAndWipe(onSuccess) {
  return new Promise((resolve) => {
    const { overlay, dialog } = createOverlayDialog(`
      <div style="display: flex; align-items: center; margin-bottom: 16px;">
        <span style="font-size: 24px; margin-right: 12px;">🔐</span>
        <h3 style="margin: 0; color: #e6a23c;">验证登录密码</h3>
      </div>
      <p style="margin: 0 0 12px; color: #666; font-size: 14px; line-height: 1.5;">
        请输入登录密码以<strong>清除本机账本并退出</strong>。
      </p>
      <label style="display: block; font-size: 12px; color: #888; margin-bottom: 6px;">登录密码</label>
      <input id="secure-pwd-input" type="password" autocomplete="current-password"
        placeholder="请输入登录密码"
        style="width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #ddd;
          border-radius: 6px; font-size: 14px; margin-bottom: 8px;" />
      <p id="secure-pwd-error" style="margin: 0 0 16px; color: #f56c6c; font-size: 12px; min-height: 18px;"></p>
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button id="secure-pwd-cancel" type="button" style="
          padding: 8px 16px; border: 1px solid #ddd; background: white;
          border-radius: 4px; cursor: pointer;">取消</button>
        <button id="secure-pwd-ok" type="button" style="
          padding: 8px 16px; border: none; background: #e6a23c; color: white;
          border-radius: 4px; cursor: pointer;">确认清除并退出</button>
      </div>
    `)

    const input = dialog.querySelector('#secure-pwd-input')
    const errEl = dialog.querySelector('#secure-pwd-error')
    const okBtn = dialog.querySelector('#secure-pwd-ok')

    const cleanup = () => {
      if (overlay.parentNode) document.body.removeChild(overlay)
    }

    const tryOk = async () => {
      okBtn.disabled = true
      errEl.textContent = ''
      const result = await secureLogoutAndWipe(input.value)
      if (!result.success) {
        errEl.textContent = result.message
        okBtn.disabled = false
        input.focus()
        return
      }
      cleanup()
      if (onSuccess) onSuccess(result)
      resolve(true)
    }

    dialog.querySelector('#secure-pwd-cancel').onclick = () => {
      cleanup()
      resolve(false)
    }
    okBtn.onclick = () => { tryOk() }
    input.onkeydown = (e) => {
      if (e.key === 'Enter') tryOk()
      if (e.key === 'Escape') {
        cleanup()
        resolve(false)
      }
    }
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        cleanup()
        resolve(false)
      }
    }
    setTimeout(() => input.focus(), 50)
  })
}

/**
 * 检查当前数据状态
 */
export function checkDataStatus() {
  const status = {}
  const keysToReport = [
    ...CLEARABLE_KEYS,
    ...PRESERVED_ON_RESET_KEYS
  ]

  keysToReport.forEach(key => {
    const data = localStorage.getItem(key)
    if (data) {
      try {
        const parsed = JSON.parse(data)
        status[key] = {
          exists: true,
          type: Array.isArray(parsed) ? 'array' : 'object',
          count: Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length
        }
      } catch (e) {
        status[key] = { exists: true, type: 'string', value: data }
      }
    } else {
      status[key] = { exists: false }
    }
  })

  return status
}

/**
 * 生成数据重置报告
 */
export function generateResetReport() {
  const beforeStatus = checkDataStatus()
  const result = clearAllData()
  const afterStatus = checkDataStatus()
  
  return {
    result,
    beforeStatus,
    afterStatus,
    timestamp: new Date().toISOString()
  }
}

function createOverlayDialog(innerHtml) {
  const overlay = document.createElement('div')
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.5); z-index: 9999;
    display: flex; align-items: center; justify-content: center;
  `
  const dialog = document.createElement('div')
  dialog.style.cssText = `
    background: white; border-radius: 8px; padding: 24px;
    max-width: 420px; width: 90%; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    color: #333;
  `
  dialog.innerHTML = innerHtml
  overlay.appendChild(dialog)
  document.body.appendChild(overlay)
  return { overlay, dialog }
}

/**
 * 第二步：输入登录密码
 * @returns {Promise<boolean>}
 */
function showResetPasswordDialog() {
  return new Promise((resolve) => {
    const { overlay, dialog } = createOverlayDialog(`
      <div style="display: flex; align-items: center; margin-bottom: 16px;">
        <span style="font-size: 24px; margin-right: 12px;">🔐</span>
        <h3 style="margin: 0; color: #f56c6c;">验证登录密码</h3>
      </div>
      <p style="margin: 0 0 12px; color: #666; line-height: 1.5; font-size: 14px;">
        已确认风险。请输入您的<strong>登录密码</strong>以执行数据重置。
        （不会清除登录密码本身，仅清空账本业务数据。）
      </p>
      <label style="display: block; font-size: 12px; color: #888; margin-bottom: 6px;">登录密码</label>
      <input id="reset-password-input" type="password" autocomplete="current-password"
        placeholder="请输入登录密码"
        style="width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #ddd;
          border-radius: 6px; font-size: 14px; margin-bottom: 8px;" />
      <p id="reset-password-error" style="margin: 0 0 16px; color: #f56c6c; font-size: 12px; min-height: 18px;"></p>
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button id="cancel-reset-pwd" type="button" style="
          padding: 8px 16px; border: 1px solid #ddd; background: white;
          border-radius: 4px; cursor: pointer;">取消</button>
        <button id="confirm-reset-pwd" type="button" style="
          padding: 8px 16px; border: none; background: #f56c6c; color: white;
          border-radius: 4px; cursor: pointer;">确认清除</button>
      </div>
    `)

    const input = dialog.querySelector('#reset-password-input')
    const errEl = dialog.querySelector('#reset-password-error')
    const cancelBtn = dialog.querySelector('#cancel-reset-pwd')
    const confirmBtn = dialog.querySelector('#confirm-reset-pwd')

    const cleanup = () => {
      if (overlay.parentNode) document.body.removeChild(overlay)
    }

    const tryConfirm = async () => {
      confirmBtn.disabled = true
      errEl.textContent = ''
      try {
        const auth = useAuthStore()
        const ok = await auth.verifyLoginPassword(input.value)
        if (!ok) {
          errEl.textContent = '登录密码错误，未执行重置'
          input.focus()
          input.select()
          confirmBtn.disabled = false
          return
        }
        cleanup()
        resolve(true)
      } catch (e) {
        errEl.textContent = e.message || '验证失败'
        confirmBtn.disabled = false
      }
    }

    cancelBtn.onclick = () => {
      cleanup()
      resolve(false)
    }
    confirmBtn.onclick = () => { tryConfirm() }
    input.onkeydown = (e) => {
      if (e.key === 'Enter') tryConfirm()
      if (e.key === 'Escape') {
        cleanup()
        resolve(false)
      }
    }
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        cleanup()
        resolve(false)
      }
    }

    setTimeout(() => input.focus(), 50)
  })
}

/**
 * 创建重置确认对话框（两步：确认风险 → 输入密码）
 */
export function showResetConfirmDialog(onConfirm) {
  return new Promise((resolve) => {
    const { overlay, dialog } = createOverlayDialog(`
      <div style="display: flex; align-items: center; margin-bottom: 16px;">
        <span style="font-size: 24px; margin-right: 12px;">⚠️</span>
        <h3 style="margin: 0; color: #f56c6c;">确认重置数据</h3>
      </div>
      <p style="margin: 0 0 20px; color: #666; line-height: 1.5;">
        将<strong>清空本机全部账本业务数据</strong>（开发调试用），包括：<br>
        • 期初建账与四银行账户<br>
        • 月度收支与账单<br>
        • 定期 / 股票 / 基金 / 个人借贷<br><br>
        登录密码会保留。清除后无法从本站恢复账本。<br>
        <strong style="color: #f56c6c;">此操作不可撤销！</strong><br>
        <span style="font-size: 13px;">下一步需输入<strong>登录密码</strong>确认。</span>
      </p>
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button id="cancel-reset" type="button" style="
          padding: 8px 16px; border: 1px solid #ddd; background: white;
          border-radius: 4px; cursor: pointer;">取消</button>
        <button id="confirm-reset" type="button" style="
          padding: 8px 16px; border: none; background: #f56c6c; color: white;
          border-radius: 4px; cursor: pointer;">下一步：输入登录密码</button>
      </div>
    `)

    const cancelBtn = dialog.querySelector('#cancel-reset')
    const confirmBtn = dialog.querySelector('#confirm-reset')

    const cleanup = () => {
      if (overlay.parentNode) document.body.removeChild(overlay)
    }

    cancelBtn.onclick = () => {
      cleanup()
      resolve(false)
    }

    confirmBtn.onclick = async () => {
      cleanup()
      const ok = await showResetPasswordDialog()
      if (!ok) {
        resolve(false)
        return
      }
      const report = generateResetReport()
      // eslint-disable-next-line no-console
      console.log('数据重置报告:', report)
      if (onConfirm) onConfirm()
      resolve(true)
    }

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        cleanup()
        resolve(false)
      }
    }
  })
}

/**
 * 带登录密码的清除（控制台用，async）
 * @param {string} password 登录密码
 */
export async function clearAllDataWithPassword(password) {
  const auth = useAuthStore()
  const ok = await auth.verifyLoginPassword(password)
  if (!ok) {
    return { success: false, message: '登录密码错误，未清除数据' }
  }
  return clearAllData()
}

// 控制台快捷命令
if (typeof window !== 'undefined') {
  window.dataReset = {
    /** 须传登录密码：await dataReset.clear('登录密码') */
    clear: clearAllDataWithPassword,
    check: checkDataStatus,
    report: async (password) => {
      const auth = useAuthStore()
      const ok = await auth.verifyLoginPassword(password)
      if (!ok) return { success: false, message: '登录密码错误' }
      return generateResetReport()
    }
  }

  window.resetData = (password) => clearAllDataWithPassword(password)

  // eslint-disable-next-line no-console
  console.log('🛠️ 数据重置需登录密码：await dataReset.clear("你的登录密码")')
}
