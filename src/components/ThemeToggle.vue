<template>
  <div class="theme-toggle relative">
    <button 
      @click="toggleDropdown"
      :class="[
        'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
        'border border-border-light dark:border-border-dark',
        'bg-transparent text-subtext-light dark:text-subtext-dark',
        'hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-text-light dark:hover:text-text-dark'
      ]"
      :title="currentTitle"
    >
      <svg v-if="mode === 'light'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
      </svg>
      <svg v-else-if="mode === 'dark'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
      </svg>
      <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
      </svg>
    </button>
    
    <!-- 下拉菜单 -->
    <div 
      v-show="showDropdown"
      class="absolute right-0 top-12 w-40 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg shadow-lg z-50"
    >
      <div class="py-1">
        <button 
          @click="handleCommand('light')"
          :class="[
            'w-full px-4 py-2 text-left flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
            mode === 'light' ? 'bg-gray-100 dark:bg-gray-700 text-primary-light dark:text-primary-dark' : 'text-text-light dark:text-text-dark'
          ]"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
          </svg>
          <span>浅色主题</span>
        </button>
        
        <button 
          @click="handleCommand('dark')"
          :class="[
            'w-full px-4 py-2 text-left flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
            mode === 'dark' ? 'bg-gray-100 dark:bg-gray-700 text-primary-light dark:text-primary-dark' : 'text-text-light dark:text-text-dark'
          ]"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
          </svg>
          <span>深色主题</span>
        </button>
        
        <button 
          @click="handleCommand('auto')"
          :class="[
            'w-full px-4 py-2 text-left flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
            mode === 'auto' ? 'bg-gray-100 dark:bg-gray-700 text-primary-light dark:text-primary-dark' : 'text-text-light dark:text-text-dark'
          ]"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
          </svg>
          <span>跟随系统</span>
        </button>
      </div>
    </div>
    
    <!-- 点击外部关闭下拉菜单的遮罩 -->
    <div 
      v-show="showDropdown"
      @click="showDropdown = false"
      class="fixed inset-0 z-40"
    ></div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()
const showDropdown = ref(false)

const mode = computed(() => themeStore.mode)

const currentTitle = computed(() => {
  switch (mode.value) {
    case 'light': return '当前：浅色主题'
    case 'dark': return '当前：深色主题'
    case 'auto': return '当前：跟随系统'
    default: return '主题切换'
  }
})

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

const handleCommand = (command) => {
  themeStore.setMode(command)
  showDropdown.value = false
}

// 点击外部关闭下拉菜单
const handleClickOutside = (event) => {
  if (!event.target.closest('.theme-toggle')) {
    showDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>