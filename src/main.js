import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/theme.css'
import App from './App.vue'
import { useThemeStore } from './stores/theme.js'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(ElementPlus)

// 初始化主题系统
const themeStore = useThemeStore()
themeStore.init()

app.mount('#app')
