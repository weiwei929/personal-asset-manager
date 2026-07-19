import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/theme.css'
import App from './App.vue'
import { useThemeStore } from './stores/theme.js'
import { useFinanceStore } from './stores/finance.js'
import { useFundTransferStore } from './stores/fundTransfer.js'
import { useBankDepositStore } from './stores/bankDeposit.js'
import { useStockInvestmentStore } from './stores/stockInvestment.js'
import { useLentMoneyStore } from './stores/lentMoney.js'

// 导入数据重置工具（确保控制台命令可用）
import './utils/dataReset.js'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(ElementPlus)

// 主题
const themeStore = useThemeStore()
themeStore.init()

// 启动时加载全部业务 store（开发/生产一致，避免首屏资金池为 0 的假象）
const financeStore = useFinanceStore()
const fundTransferStore = useFundTransferStore()
const bankDepositStore = useBankDepositStore()
const stockStore = useStockInvestmentStore()
const lentMoneyStore = useLentMoneyStore()

financeStore.loadFromLocalStorage()
fundTransferStore.loadTransfers()
bankDepositStore.loadFromLocalStorage()
stockStore.loadFromLocalStorage()
lentMoneyStore.loadFromLocalStorage()

app.mount('#app')
