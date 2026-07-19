/**
 * 数据重置工具
 * 用于清除所有本地存储数据，重置系统到初始状态
 */

// 必须与各 store 实际写入的 key 一致（历史曾用错误键名导致重置不干净）
const STORAGE_KEYS = [
  'monthlyFinances',
  'bank-deposits',
  'stock-investments',
  'lent-money-records',
  'fundTransfers',
  // 兼容旧键名（若存在一并清除）
  'bankDeposits',
  'stockInvestments',
  'lentMoneys'
]

// 默认分类数据（保留基础分类）
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
 * 清除所有数据
 */
export function clearAllData() {
  try {
    STORAGE_KEYS.forEach(key => {
      localStorage.removeItem(key)
    })
    
    // 重新设置默认分类
    localStorage.setItem('finance-categories', JSON.stringify(DEFAULT_CATEGORIES))
    
    console.log('✅ 所有数据已清除，系统重置完成')
    return { success: true, message: '数据重置成功' }
  } catch (error) {
    console.error('❌ 数据重置失败:', error)
    return { success: false, message: '数据重置失败', error }
  }
}

/**
 * 检查当前数据状态
 */
export function checkDataStatus() {
  const status = {}
  
  STORAGE_KEYS.forEach(key => {
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

/**
 * 创建重置确认对话框
 */
export function showResetConfirmDialog(onConfirm) {
  return new Promise((resolve) => {
    // 创建模态对话框
    const overlay = document.createElement('div')
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
    `
    
    const dialog = document.createElement('div')
    dialog.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    `
    
    dialog.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 16px;">
        <span style="font-size: 24px; margin-right: 12px;">⚠️</span>
        <h3 style="margin: 0; color: #f56c6c;">确认重置数据</h3>
      </div>
      <p style="margin: 0 0 20px; color: #666; line-height: 1.5;">
        此操作将清除所有数据，包括：<br>
        • 收支记录<br>
        • 银行存款<br>
        • 股票投资<br>
        • 借贷记录<br>
        • 资金转换记录<br><br>
        <strong style="color: #f56c6c;">此操作不可撤销！</strong>
      </p>
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button id="cancel-reset" style="
          padding: 8px 16px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 4px;
          cursor: pointer;
        ">取消</button>
        <button id="confirm-reset" style="
          padding: 8px 16px;
          border: none;
          background: #f56c6c;
          color: white;
          border-radius: 4px;
          cursor: pointer;
        ">确认重置</button>
      </div>
    `
    
    overlay.appendChild(dialog)
    document.body.appendChild(overlay)
    
    // 事件处理
    const cancelBtn = dialog.querySelector('#cancel-reset')
    const confirmBtn = dialog.querySelector('#confirm-reset')
    
    const cleanup = () => {
      document.body.removeChild(overlay)
    }
    
    cancelBtn.onclick = () => {
      cleanup()
      resolve(false)
    }
    
    confirmBtn.onclick = () => {
      cleanup()
      const report = generateResetReport()
      console.log('数据重置报告:', report)
      if (onConfirm) onConfirm()
      resolve(true)
    }
    
    // 点击遮罩层关闭
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        cleanup()
        resolve(false)
      }
    }
  })
}

// 控制台快捷命令
if (typeof window !== 'undefined') {
  window.dataReset = {
    clear: clearAllData,
    check: checkDataStatus,
    report: generateResetReport
  }
  
  // 兼容旧的命令
  window.resetData = clearAllData
  
  console.log('🛠️ 数据重置工具已加载')
  console.log('💡 可用命令:')
  console.log('   window.dataReset.clear() - 清除所有数据')
  console.log('   window.dataReset.check() - 检查数据状态')
  console.log('   window.dataReset.report() - 生成重置报告')
}
