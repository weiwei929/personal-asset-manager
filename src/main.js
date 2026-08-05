import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/theme.css'
import App from './App.vue'
import { useThemeStore } from './stores/theme.js'
import { useFinanceStore } from './stores/finance.js'
import { useBankAccountsStore } from './stores/bankAccounts.js'
import { useOpeningBalanceStore } from './stores/openingBalance.js'
import { useStockInvestmentStore } from './stores/stockInvestment.js'
import { useFundInvestmentStore } from './stores/fundInvestment.js'
import { useLentMoneyStore } from './stores/lentMoney.js'
import { useMonthlyStatementsStore } from './stores/monthlyStatements.js'
import { useAuthStore } from './stores/auth.js'

// 导入数据重置工具（确保控制台命令可用）
import './utils/dataReset.js'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(ElementPlus)

// 主题 + 登录态
const themeStore = useThemeStore()
themeStore.init()
const authStore = useAuthStore()
authStore.load()

// 启动时加载一期业务 store（不含已收口的旧资金池划转）
const financeStore = useFinanceStore()
const bankAccountsStore = useBankAccountsStore()
const openingBalanceStore = useOpeningBalanceStore()
const stockStore = useStockInvestmentStore()
const fundInvestStore = useFundInvestmentStore()
const lentMoneyStore = useLentMoneyStore()
const monthlyStatementsStore = useMonthlyStatementsStore()

financeStore.loadFromLocalStorage()
bankAccountsStore.loadFromLocalStorage()
openingBalanceStore.loadFromLocalStorage()
stockStore.loadFromLocalStorage()
fundInvestStore.loadFromLocalStorage()
lentMoneyStore.loadFromLocalStorage()
monthlyStatementsStore.loadFromLocalStorage()
// 进入新自然月后补齐「上月」只读账单（不改当前账）
monthlyStatementsStore.ensureCatchUp()

app.mount('#app')
