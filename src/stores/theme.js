/**
 * 主题管理 Store
 * 支持亮色、暗色主题切换，并可跟随系统主题
 * 键：STORAGE_KEYS.THEME（重置账本时保留）
 */

import { defineStore } from 'pinia'
import { STORAGE_KEYS } from '../constants/storageKeys.js'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    // 主题模式：'light' | 'dark' | 'auto'
    mode: 'auto',
    // 当前实际应用的主题：'light' | 'dark'
    currentTheme: 'light',
    // 系统主题
    systemTheme: 'light'
  }),

  getters: {
    /**
     * 是否为暗色主题
     */
    isDark: (state) => state.currentTheme === 'dark',
    
    /**
     * 是否为自动模式
     */
    isAuto: (state) => state.mode === 'auto',
    
    /**
     * 主题配置对象
     */
    themeConfig: (state) => {
      const isDark = state.currentTheme === 'dark'
      
      return {
        // 主色调
        primary: isDark ? '#409EFF' : '#409EFF',
        primaryLight: isDark ? '#66b1ff' : '#66b1ff',
        primaryDark: isDark ? '#337ecc' : '#337ecc',
        
        // 背景色
        bgPrimary: isDark ? '#1a1a1a' : '#ffffff',
        bgSecondary: isDark ? '#2d2d2d' : '#f5f7fa',
        bgTertiary: isDark ? '#3a3a3a' : '#fafafa',
        
        // 文字颜色
        textPrimary: isDark ? '#e5e5e5' : '#303133',
        textSecondary: isDark ? '#b3b3b3' : '#606266',
        textTertiary: isDark ? '#8c8c8c' : '#909399',
        textPlaceholder: isDark ? '#666666' : '#c0c4cc',
        
        // 边框颜色
        borderLight: isDark ? '#404040' : '#ebeef5',
        borderBase: isDark ? '#4d4d4d' : '#dcdfe6',
        borderDark: isDark ? '#666666' : '#c0c4cc',
        
        // 功能色
        success: isDark ? '#67c23a' : '#67c23a',
        warning: isDark ? '#e6a23c' : '#e6a23c',
        danger: isDark ? '#f56c6c' : '#f56c6c',
        info: isDark ? '#909399' : '#909399',
        
        // 卡片和组件
        cardBg: isDark ? '#2d2d2d' : '#ffffff',
        cardShadow: isDark ? '0 2px 12px rgba(0, 0, 0, 0.3)' : '0 2px 12px rgba(0, 0, 0, 0.08)',
        
        // 侧边栏
        sidebarBg: isDark ? '#1f1f1f' : '#f5f7fa',
        sidebarHeaderBg: isDark ? '#409EFF' : '#409EFF',
        
        // 统计卡片渐变 - 全部使用灰色系
        gradients: {
          income: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
          expense: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
          balance: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
          deposit: 'linear-gradient(135deg, #4b5563 0%, #374151 100%)',
          investment: 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)',
          total: 'linear-gradient(135deg, #111827 0%, #000000 100%)'
        }
      }
    }
  },

  actions: {
    /**
     * 初始化主题系统
     */
    init() {
      // 从本地存储加载主题设置
      this.loadFromStorage()
      
      // 检测系统主题
      this.detectSystemTheme()
      
      // 应用主题
      this.applyTheme()
      
      // 监听系统主题变化
      this.watchSystemTheme()
    },

    /**
     * 设置主题模式
     */
    setMode(mode) {
      this.mode = mode
      this.updateCurrentTheme()
      this.applyTheme()
      this.saveToStorage()
    },

    /**
     * 切换主题
     */
    toggleTheme() {
      if (this.mode === 'auto') {
        // 如果当前是自动模式，切换到相反的固定主题
        this.setMode(this.currentTheme === 'dark' ? 'light' : 'dark')
      } else {
        // 如果是固定主题，切换到相反主题
        this.setMode(this.mode === 'dark' ? 'light' : 'dark')
      }
    },

    /**
     * 检测系统主题
     */
    detectSystemTheme() {
      if (window.matchMedia) {
        this.systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }
      this.updateCurrentTheme()
    },

    /**
     * 监听系统主题变化
     */
    watchSystemTheme() {
      if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        mediaQuery.addEventListener('change', (e) => {
          this.systemTheme = e.matches ? 'dark' : 'light'
          this.updateCurrentTheme()
          if (this.mode === 'auto') {
            this.applyTheme()
          }
        })
      }
    },

    /**
     * 更新当前主题
     */
    updateCurrentTheme() {
      if (this.mode === 'auto') {
        this.currentTheme = this.systemTheme
      } else {
        this.currentTheme = this.mode
      }
    },

    /**
     * 应用主题到页面
     */
    applyTheme() {
      const config = this.themeConfig
      const root = document.documentElement
      
      // 设置CSS变量
      Object.entries(config).forEach(([key, value]) => {
        if (typeof value === 'string') {
          root.style.setProperty(`--theme-${this.kebabCase(key)}`, value)
        } else if (typeof value === 'object' && value !== null) {
          // 处理嵌套对象（如gradients）
          Object.entries(value).forEach(([subKey, subValue]) => {
            root.style.setProperty(`--theme-${this.kebabCase(key)}-${this.kebabCase(subKey)}`, subValue)
          })
        }
      })
      
      // 设置Tailwind CSS深色模式和Element Plus主题
      if (this.isDark) {
        root.classList.add('dark')
        document.body.setAttribute('data-theme', 'dark')
        // 确保html元素也有dark类，这是Tailwind CSS深色模式的要求
        document.documentElement.classList.add('dark')
      } else {
        root.classList.remove('dark')
        document.body.setAttribute('data-theme', 'light')
        document.documentElement.classList.remove('dark')
      }
      
      // 触发主题变化事件
      window.dispatchEvent(new CustomEvent('theme-changed', {
        detail: { theme: this.currentTheme, config }
      }))
    },

    /**
     * 从本地存储加载设置
     */
    loadFromStorage() {
      const stored = localStorage.getItem(STORAGE_KEYS.THEME)
      if (stored) {
        try {
          const settings = JSON.parse(stored)
          this.mode = settings.mode || 'auto'
        } catch (error) {
          console.warn('加载主题设置失败:', error)
        }
      }
    },

    /**
     * 保存设置到本地存储
     */
    saveToStorage() {
      const settings = {
        mode: this.mode,
        timestamp: Date.now()
      }
      localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(settings))
    },

    /**
     * 工具函数：转换为kebab-case
     */
    kebabCase(str) {
      return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase()
    }
  }
})