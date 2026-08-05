import { defineStore } from 'pinia'
import { STORAGE_KEYS, SESSION_AUTH_KEY } from '../constants/storageKeys.js'
import {
  createPasswordRecord,
  verifyPassword
} from '../utils/authCrypto.js'

/**
 * 本地登录门禁
 * - 首次使用：设置登录密码
 * - 之后：登录后进入应用
 * - 会话：sessionStorage，关闭标签页需重新登录
 */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    /** 是否已设置密码 */
    hasPassword: false,
    /** 当前会话是否已登录 */
    isAuthenticated: false,
    /** 内存中的凭证（不落明文密码） */
    _record: null
  }),

  getters: {
    needsSetup: (state) => !state.hasPassword
  },

  actions: {
    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.AUTH)
        if (!raw) {
          this.hasPassword = false
          this._record = null
          this.isAuthenticated = false
          return
        }
        const data = JSON.parse(raw)
        if (data && data.salt && data.hash) {
          this._record = data
          this.hasPassword = true
          this.isAuthenticated =
            sessionStorage.getItem(SESSION_AUTH_KEY) === '1'
        } else {
          this.hasPassword = false
          this._record = null
          this.isAuthenticated = false
        }
      } catch {
        this.hasPassword = false
        this._record = null
        this.isAuthenticated = false
      }
    },

    /**
     * 首次设置密码
     * @param {string} password
     * @param {string} confirm
     */
    async setupPassword(password, confirm) {
      const p = String(password || '')
      const c = String(confirm || '')
      if (p.length < 6) {
        throw new Error('密码至少 6 位')
      }
      if (p !== c) {
        throw new Error('两次输入的密码不一致')
      }
      if (this.hasPassword) {
        throw new Error('已设置过密码，请直接登录')
      }
      const record = await createPasswordRecord(p)
      localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(record))
      this._record = record
      this.hasPassword = true
      this._markSession()
      this.isAuthenticated = true
    },

    /**
     * 登录
     * @param {string} password
     */
    async login(password) {
      if (!this.hasPassword || !this._record) {
        throw new Error('尚未设置登录密码')
      }
      const ok = await verifyPassword(String(password || ''), this._record)
      if (!ok) {
        throw new Error('密码错误')
      }
      this._markSession()
      this.isAuthenticated = true
    },

    logout() {
      sessionStorage.removeItem(SESSION_AUTH_KEY)
      this.isAuthenticated = false
    },

    /**
     * 校验密码（重置数据等危险操作，不改变登录态）
     * @param {string} password
     */
    async verifyLoginPassword(password) {
      this.load()
      if (!this.hasPassword || !this._record) return false
      return verifyPassword(String(password || ''), this._record)
    },

    /**
     * 修改密码（须旧密码）
     */
    async changePassword(oldPassword, newPassword, confirm) {
      const ok = await this.verifyLoginPassword(oldPassword)
      if (!ok) throw new Error('当前密码错误')
      const p = String(newPassword || '')
      if (p.length < 6) throw new Error('新密码至少 6 位')
      if (p !== String(confirm || '')) throw new Error('两次输入的新密码不一致')
      const record = await createPasswordRecord(p)
      localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(record))
      this._record = record
      this.hasPassword = true
    },

    _markSession() {
      sessionStorage.setItem(SESSION_AUTH_KEY, '1')
    }
  }
})
