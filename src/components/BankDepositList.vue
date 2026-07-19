<template>
  <div class="p-6 space-y-6">
    <!-- 页面头部 -->
    <div class="bg-card-light dark:bg-card-dark rounded-xl p-4 sm:p-6 shadow-sm border border-border-light dark:border-border-dark">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 class="text-xl sm:text-2xl font-bold text-text-light dark:text-text-dark">银行存款列表</h1>
        <div class="flex flex-wrap gap-2">
          <button 
            @click="showImportDialog = true"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
          >
            导入CSV
          </button>
          <button 
            @click="showAddDialog = true"
            class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
          >
            新增存款
          </button>
          <button 
            v-if="deposits.length > 0"
            @click="clearAllDeposits"
            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
          >
            清空数据
          </button>
        </div>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-card-light dark:bg-card-dark rounded-xl p-4 sm:p-6 shadow-sm border border-border-light dark:border-border-dark">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">总存款金额</p>
            <p class="text-2xl font-semibold text-text-light dark:text-text-dark">¥{{ totalDepositAmount.toLocaleString() }}</p>
          </div>
        </div>
      </div>

      <div class="bg-card-light dark:bg-card-dark rounded-xl p-4 sm:p-6 shadow-sm border border-border-light dark:border-border-dark">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">预期利息收益</p>
            <p class="text-2xl font-semibold text-text-light dark:text-text-dark">¥{{ totalExpectedInterest.toLocaleString() }}</p>
          </div>
        </div>
      </div>

      <div class="bg-card-light dark:bg-card-dark rounded-xl p-4 sm:p-6 shadow-sm border border-border-light dark:border-border-dark">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">即将到期</p>
            <p class="text-2xl font-semibold text-text-light dark:text-text-dark">{{ maturingDeposits.length }} 笔</p>
          </div>
        </div>
      </div>

      <div class="bg-card-light dark:bg-card-dark rounded-xl p-4 sm:p-6 shadow-sm border border-border-light dark:border-border-dark">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-red-100 dark:bg-red-900/50 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">已到期</p>
            <p class="text-2xl font-semibold text-text-light dark:text-text-dark">{{ maturedDeposits.length }} 笔</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 到期提醒 -->
    <div v-if="maturingDeposits.length > 0" class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-yellow-800 dark:text-yellow-200">到期提醒</h3>
          <p class="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
            有 {{ maturingDeposits.length }} 笔存款将在30天内到期，请及时处理
          </p>
        </div>
      </div>
    </div>

    <!-- 操作面板 -->
    <div v-if="deposits.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <button 
        @click="showAddDialog = true"
        class="flex items-center justify-center gap-2 px-6 py-4 bg-primary hover:bg-primary-dark text-white rounded-xl transition-colors"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
        </svg>
        新增存款
      </button>
      
      <button 
        @click="showImportDialog = true"
        class="flex items-center justify-center gap-2 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
        </svg>
        导入CSV
      </button>
      
      <button 
        @click="exportData"
        class="flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        导出数据
      </button>
      
      <button 
        @click="clearAllDeposits"
        class="flex items-center justify-center gap-2 px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
        </svg>
        清空数据
      </button>
    </div>

    <!-- 存款列表 -->
    <div v-if="deposits.length === 0" class="unified-empty-state">
      <div class="empty-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
        </svg>
      </div>
      <h3 class="empty-title">暂无存款数据</h3>
      <p class="empty-description">开始添加您的第一笔银行存款记录</p>
      <button class="empty-action" @click="showAddDialog = true">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14"/>
        </svg>
        添加第一笔存款
      </button>
    </div>

    <div v-else class="bg-card-light dark:bg-card-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden">
      <div class="px-4 py-3 border-b border-border-light dark:border-border-dark">
        <h3 class="text-lg font-semibold text-text-light dark:text-text-dark">存款记录</h3>
      </div>
      
      <!-- 桌面端表格 -->
      <div class="overflow-x-auto hidden md:block">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">产品名称</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">到期时间</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">存款金额</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">利率</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">存期</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">到期利息</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">到期状态</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">备注</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-light dark:divide-border-dark">
            <tr 
              v-for="(deposit, index) in depositsByMaturity" 
              :key="deposit.id"
              :class="index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'"
              class="hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <td class="px-4 py-3 text-sm font-medium text-text-light dark:text-text-dark">{{ deposit.productName }}</td>
              <td class="px-4 py-3 text-sm text-text-light dark:text-text-dark">{{ formatDate(deposit.maturityDate) }}</td>
              <td class="px-4 py-3 text-sm font-semibold text-green-600 dark:text-green-400">¥{{ deposit.amount.toLocaleString() }}</td>
              <td class="px-4 py-3 text-sm text-text-light dark:text-text-dark">{{ deposit.interestRate }}%</td>
              <td class="px-4 py-3 text-sm text-text-light dark:text-text-dark">{{ deposit.term }}</td>
              <td class="px-4 py-3 text-sm font-semibold text-blue-600 dark:text-blue-400">¥{{ deposit.maturityInterest.toLocaleString() }}</td>
              <td class="px-4 py-3 text-sm">
                <span 
                  :class="{
                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200': deposit.getMaturityStatus() === '已到期',
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200': deposit.getMaturityStatus() === '即将到期',
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200': deposit.getMaturityStatus() === '未到期'
                  }"
                  class="px-2 py-1 text-xs font-medium rounded-full"
                >
                  {{ deposit.getMaturityStatus() }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-text-light dark:text-text-dark">{{ deposit.notes || '-' }}</td>
              <td class="px-4 py-3 text-sm">
                <div class="flex space-x-2">
                  <button 
                    @click="editDeposit(deposit)"
                    class="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
                  >
                    编辑
                  </button>
                  <button 
                    @click="deleteDeposit(deposit.id)"
                    class="px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
                  >
                    删除
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 移动端卡片列表 -->
      <div class="md:hidden space-y-4 p-4">
        <div 
          v-for="deposit in depositsByMaturity" 
          :key="deposit.id" 
          class="bg-white dark:bg-gray-800 rounded-lg border border-border-light dark:border-border-dark shadow-sm p-4"
        >
          <div class="flex justify-between items-start mb-3">
            <h4 class="text-lg font-semibold text-text-light dark:text-text-dark">{{ deposit.productName }}</h4>
            <span 
              :class="{
                'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200': deposit.getMaturityStatus() === '已到期',
                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200': deposit.getMaturityStatus() === '即将到期',
                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200': deposit.getMaturityStatus() === '未到期'
              }"
              class="px-2 py-1 text-xs font-medium rounded-full"
            >
              {{ deposit.getMaturityStatus() }}
            </span>
          </div>
          
          <div class="space-y-2 mb-4">
            <div class="flex justify-between">
              <span class="text-sm text-gray-500 dark:text-gray-400">存款金额:</span>
              <span class="text-sm font-semibold text-green-600 dark:text-green-400">¥{{ deposit.amount.toLocaleString() }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-500 dark:text-gray-400">利率:</span>
              <span class="text-sm text-text-light dark:text-text-dark">{{ deposit.interestRate }}%</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-500 dark:text-gray-400">存期:</span>
              <span class="text-sm text-text-light dark:text-text-dark">{{ deposit.term }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-500 dark:text-gray-400">到期时间:</span>
              <span class="text-sm text-text-light dark:text-text-dark">{{ formatDate(deposit.maturityDate) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-500 dark:text-gray-400">到期利息:</span>
              <span class="text-sm font-semibold text-blue-600 dark:text-blue-400">¥{{ deposit.maturityInterest.toLocaleString() }}</span>
            </div>
            <div v-if="deposit.notes" class="flex justify-between">
              <span class="text-sm text-gray-500 dark:text-gray-400">备注:</span>
              <span class="text-sm text-text-light dark:text-text-dark">{{ deposit.notes }}</span>
            </div>
          </div>
          
          <div class="flex space-x-2 pt-3 border-t border-border-light dark:border-border-dark">
            <button 
              @click="editDeposit(deposit)"
              class="flex-1 px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
            >
              编辑
            </button>
            <button 
              @click="deleteDeposit(deposit.id)"
              class="flex-1 px-3 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- CSV导入对话框 -->
    <el-dialog v-model="showImportDialog" title="导入CSV文件" width="600px">
      <div class="import-section">
        <p>请选择包含银行存款数据的CSV文件：</p>
        <el-upload
          ref="uploadRef"
          :on-change="handleFileChange"
          :auto-upload="false"
          accept=".csv"
          :limit="1"
        >
          <el-button type="primary">选择文件</el-button>
        </el-upload>
        <div v-if="importResult" class="import-result">
          <el-alert
            :type="importResult.success ? 'success' : 'error'"
            :title="importResult.success ? '导入成功' : '导入失败'"
            :description="importResult.message"
            show-icon
          />
        </div>
      </div>
      <template #footer>
        <el-button @click="showImportDialog = false">取消</el-button>
        <el-button type="primary" @click="importCSV" :loading="importing">
          开始导入
        </el-button>
      </template>
    </el-dialog>

    <!-- 新增/编辑存款对话框 -->
    <div v-if="showAddDialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ isEditing ? '编辑存款' : '新增存款' }}
          </h3>
          <button
            @click="showAddDialog = false"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="p-6">
          <form @submit.prevent="saveDeposit" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                产品名称 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="depositForm.productName"
                type="text"
                placeholder="例如：长财40708"
                class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                到期时间 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="depositForm.maturityDate"
                type="date"
                class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
            </div>

            <div v-if="!isEditing">
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                资金来源 <span class="text-red-500">*</span>
              </label>
              <div class="space-y-2">
                <label class="flex items-center">
                  <input
                    v-model="depositForm.fundSource"
                    type="radio"
                    value="cash_pool"
                    class="mr-2"
                  />
                  <span>资金池 (可用余额: ¥{{ formatAmount(availableCash) }})</span>
                </label>
                <label class="flex items-center">
                  <input
                    v-model="depositForm.fundSource"
                    type="radio"
                    value="external"
                    class="mr-2"
                  />
                  <span>外部资金</span>
                </label>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                存款金额 <span class="text-red-500">*</span>
              </label>
              <input
                v-model.number="depositForm.amount"
                type="number"
                step="0.01"
                :min="0"
                :max="depositForm.fundSource === 'cash_pool' ? availableCash : undefined"
                placeholder="请输入存款金额"
                class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
              <div v-if="depositForm.fundSource === 'cash_pool'" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                最大可用: ¥{{ formatAmount(availableCash) }}
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                利率 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="depositForm.interestRate"
                type="number"
                step="0.01"
                min="0"
                max="10"
                placeholder="例如：3.5"
                class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                存期 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="depositForm.term"
                type="text"
                placeholder="例如：3年"
                class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                到期利息
              </label>
              <input
                v-model="depositForm.maturityInterest"
                type="number"
                step="0.01"
                min="0"
                placeholder="自动计算或手动输入"
                class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                备注
              </label>
              <textarea
                v-model="depositForm.notes"
                placeholder="备注信息"
                rows="3"
                class="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-text-light dark:text-text-dark focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              ></textarea>
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <button
                type="button"
                @click="showAddDialog = false"
                class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                {{ isEditing ? '更新' : '保存' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useBankDepositStore } from '../stores/bankDeposit.js'
import { useFundTransferStore } from '../stores/fundTransfer.js'
import { useFinanceStore } from '../stores/finance.js'

export default {
  name: 'BankDepositList',
  setup() {
    const bankDepositStore = useBankDepositStore()
    const fundTransferStore = useFundTransferStore()
    const financeStore = useFinanceStore()
    
    const showImportDialog = ref(false)
    const showAddDialog = ref(false)
    const isEditing = ref(false)
    const importing = ref(false)
    const importResult = ref(null)
    const selectedFile = ref(null)
    const uploadRef = ref(null)

    const depositForm = ref({
      id: null,
      productName: '',
      maturityDate: '',
      amount: null,
      interestRate: null,
      term: '',
      maturityInterest: null,
      notes: '',
      fundSource: 'cash_pool'
    })

    // 计算属性
    const deposits = computed(() => bankDepositStore.deposits)
    const depositsByMaturity = computed(() => bankDepositStore.depositsByMaturity)
    const totalDepositAmount = computed(() => bankDepositStore.totalDepositAmount)
    const totalExpectedInterest = computed(() => bankDepositStore.totalExpectedInterest)
    const maturingDeposits = computed(() => bankDepositStore.maturingDeposits)
    const maturedDeposits = computed(() => bankDepositStore.maturedDeposits)
    const availableCash = computed(() => financeStore.cashPool)

    // 工具函数
    const formatAmount = (amount) => {
      if (typeof amount !== 'number') return '0'
      return amount.toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }

    const formatDate = (dateString) => {
      return dateString
    }

    // 变现相关的响应式数据和方法
    const showMaturityDialogFlag = ref(false)
    const selectedDeposit = ref(null)
    const maturityForm = ref({
      actualInterest: 0,
      maturityDate: new Date().toISOString().split('T')[0],
      notes: ''
    })

    // 计算变现总额
    const totalMaturityAmount = computed(() => {
      if (!selectedDeposit.value) return 0
      return (selectedDeposit.value.amount || 0) + (maturityForm.value.actualInterest || 0)
    })

    const showMaturityDialog = (deposit) => {
      selectedDeposit.value = deposit
      maturityForm.value = {
        actualInterest: deposit.maturityInterest || 0,
        maturityDate: new Date().toISOString().split('T')[0],
        notes: ''
      }
      showMaturityDialogFlag.value = true
    }

    const closeMaturityDialog = () => {
      showMaturityDialogFlag.value = false
      selectedDeposit.value = null
      maturityForm.value = {
        actualInterest: 0,
        maturityDate: new Date().toISOString().split('T')[0],
        notes: ''
      }
    }

    // 处理存款变现
    const processMaturity = async () => {
      try {
        if (!selectedDeposit.value) return

        const totalAmount = totalMaturityAmount.value
        const deposit = selectedDeposit.value

        // 执行资金转换（资产转回资金池）
        await fundTransferStore.performTransfer({
          fromType: 'bank_deposit',
          toType: 'cash_pool',
          amount: totalAmount,
          description: `银行存款变现: ${deposit.productName} (本金¥${deposit.amount.toLocaleString()} + 利息¥${maturityForm.value.actualInterest.toLocaleString()})`,
          relatedRecordId: deposit.id,
          transferType: 'maturity'
        })

        // 删除存款记录（因为已经变现）
        bankDepositStore.removeDeposit(deposit.id)

        ElMessage.success(`存款变现成功，¥${totalAmount.toLocaleString()} 已转入资金池`)
        closeMaturityDialog()
      } catch (error) {
        console.error('变现失败:', error)
        ElMessage.error('变现失败，请重试')
      }
    }

    const handleFileChange = (file) => {
      selectedFile.value = file
    }

    const importCSV = async () => {
      if (!selectedFile.value) {
        ElMessage.warning('请先选择CSV文件')
        return
      }

      importing.value = true
      try {
        const text = await selectedFile.value.raw.text()
        const result = bankDepositStore.importFromCSV(text)

        if (result.success) {
          importResult.value = {
            success: true,
            message: `成功导入 ${result.imported} 条存款记录`
          }
          ElMessage.success(`成功导入 ${result.imported} 条记录`)
          showImportDialog.value = false
        } else {
          importResult.value = {
            success: false,
            message: `导入失败: ${result.error}`
          }
          ElMessage.error(`导入失败: ${result.error}`)
        }
      } catch (error) {
        importResult.value = {
          success: false,
          message: `文件读取失败: ${error.message}`
        }
        ElMessage.error(`文件读取失败: ${error.message}`)
      } finally {
        importing.value = false
      }
    }

    const saveDeposit = async () => {
      // 简单验证必填字段
      if (!depositForm.value.productName || !depositForm.value.maturityDate || 
          !depositForm.value.amount || !depositForm.value.interestRate || !depositForm.value.term) {
        ElMessage.error('请填写所有必填字段')
        return
      }

      if (depositForm.value.amount <= 0) {
        ElMessage.error('存款金额必须大于0')
        return
      }

      if (depositForm.value.interestRate < 0 || depositForm.value.interestRate > 10) {
        ElMessage.error('利率必须在0-10之间')
        return
      }

      // 验证资金池余额
      if (!isEditing.value && depositForm.value.fundSource === 'cash_pool') {
        if (depositForm.value.amount > availableCash.value) {
          ElMessage.error('存款金额超过资金池可用余额')
          return
        }
      }

      try {
        if (isEditing.value) {
          bankDepositStore.updateDeposit(depositForm.value.id, depositForm.value)
          ElMessage.success('存款信息更新成功')
        } else {
          // 创建存款记录
          const depositId = bankDepositStore.addDeposit(
            depositForm.value.productName,
            depositForm.value.maturityDate,
            depositForm.value.amount,
            depositForm.value.interestRate,
            depositForm.value.term,
            depositForm.value.maturityInterest || 0,
            depositForm.value.notes
          )

          // 如果使用资金池，执行资金转换
          if (depositForm.value.fundSource === 'cash_pool') {
            const result = await fundTransferStore.performTransfer({
              fromType: 'cash_pool',
              toType: 'bank_deposit',
              amount: depositForm.value.amount,
              description: `新增银行存款: ${depositForm.value.productName}`,
              relatedRecordId: depositId,
              transferType: 'manual'
            })
            
            if (!result.success) {
              // 如果转换失败，删除刚创建的存款记录
              bankDepositStore.removeDeposit(depositId)
              ElMessage.error(result.message || '资金转换失败')
              return
            }
          }

          ElMessage.success('存款添加成功')
        }

        showAddDialog.value = false
        resetForm()
      } catch (error) {
        console.error('保存失败:', error)
        ElMessage.error('保存失败，请重试')
      }
    }

    const editDeposit = (deposit) => {
      depositForm.value = { ...deposit }
      isEditing.value = true
      showAddDialog.value = true
    }

    const deleteDeposit = async (id) => {
      try {
        await ElMessageBox.confirm('确定要删除这条存款记录吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })

        bankDepositStore.removeDeposit(id)
        ElMessage.success('存款记录删除成功')
      } catch {
        // 用户取消删除
      }
    }

    const exportData = () => {
      if (deposits.value.length === 0) {
        ElMessage.warning('没有数据可导出')
        return
      }

      // 创建CSV内容
      const headers = ['序号', '产品名称', '到期时间', '存款数量', '利率', '存期', '到期利息', '备注']
      const csvContent = [
        headers.join(','),
        ...deposits.value.map((deposit, index) => [
          index + 1,
          deposit.productName,
          deposit.maturityDate,
          `"¥${deposit.amount.toLocaleString()}"`,
          deposit.interestRate ? `${deposit.interestRate}%` : '',
          deposit.term,
          deposit.maturityInterest ? `"¥${deposit.maturityInterest.toLocaleString()}"` : '',
          deposit.notes || ''
        ].join(','))
      ].join('\n')

      // 创建下载链接
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `银行存款数据_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      ElMessage.success('数据导出成功')
    }

    const clearAllDeposits = async () => {
      try {
        await ElMessageBox.confirm('确定要清空所有存款记录吗？此操作不可恢复！', '警告', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })

        bankDepositStore.clearAllDeposits()
        ElMessage.success('所有存款记录已清空')
      } catch {
        // 用户取消操作
      }
    }

    const resetForm = () => {
      depositForm.value = {
        id: null,
        productName: '',
        maturityDate: '',
        amount: null,
        interestRate: null,
        term: '',
        maturityInterest: null,
        notes: '',
        fundSource: 'cash_pool'
      }
      isEditing.value = false
    }

    onMounted(() => {
      bankDepositStore.loadFromLocalStorage()
    })

    return {
      deposits,
      depositsByMaturity,
      totalDepositAmount,
      totalExpectedInterest,
      maturingDeposits,
      maturedDeposits,
      availableCash,
      showImportDialog,
      showAddDialog,
      isEditing,
      importing,
      importResult,
      selectedFile,
      uploadRef,
      depositForm,
      formatAmount,
      formatDate,
      handleFileChange,
      importCSV,
      saveDeposit,
      editDeposit,
      deleteDeposit,
      exportData,
      clearAllDeposits,
      resetForm,
      showMaturityDialogFlag,
      selectedDeposit,
      maturityForm,
      totalMaturityAmount,
      showMaturityDialog,
      closeMaturityDialog,
      processMaturity
    }
  }
}
</script>

<style scoped>
.bank-deposit-list {
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.stats-section {
  margin-bottom: 20px;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
}

.import-section {
  text-align: center;
}

.import-result {
  margin-top: 20px;
}

.action-panel {
  margin-bottom: 20px;
  padding: 16px;
  background: transparent;
  border: 1px solid var(--theme-border-light, #e2e8f0);
  border-radius: 12px;
  box-shadow: none;
}

.action-panel .el-button {
  height: 48px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.3s ease;
  margin-bottom: 8px;
}

.action-panel .el-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.action-panel .el-icon {
  margin-right: 8px;
  font-size: 16px;
}

/* 表格容器 */
.table-container {
  position: relative;
}

/* 桌面端表格 */
.desktop-table {
  display: block;
}

/* 移动端卡片列表 */
.mobile-cards {
  display: none;
}

.deposit-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #e4e7ed;
  transition: box-shadow 0.3s ease;
}

.deposit-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.card-header-mobile {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.product-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.card-content {
  margin-bottom: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #f5f7fa;
}

.info-row:last-child {
  border-bottom: none;
}

.info-row .label {
  color: #909399;
  font-size: 14px;
  font-weight: 500;
}

.info-row .value {
  color: #303133;
  font-size: 14px;
  font-weight: 600;
  text-align: right;
}

.info-row .value.amount {
  color: #67C23A;
  font-size: 16px;
}

.card-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-actions {
    flex-direction: column;
    gap: 6px;
  }
  
  .header-actions .el-button {
    width: 100%;
    font-size: 12px;
  }
  
  .stats-section {
    padding: 12px;
    margin-bottom: 16px;
  }
  
  .action-panel {
    padding: 12px;
    margin-bottom: 16px;
  }
  
  .action-panel .el-button {
    height: 40px;
    font-size: 13px;
    margin-bottom: 6px;
  }
  
  /* 隐藏桌面端表格，显示移动端卡片 */
  .desktop-table {
    display: none;
  }
  
  .mobile-cards {
    display: block;
  }
  
  .deposit-card {
    padding: 12px;
    margin-bottom: 12px;
  }
  
  .card-header-mobile {
    margin-bottom: 10px;
  }
  
  .product-name {
    font-size: 15px;
  }
  
  .info-row {
    padding: 4px 0;
  }
  
  .info-row .label,
  .info-row .value {
    font-size: 13px;
  }
  
  .info-row .value.amount {
    font-size: 14px;
  }
  
  .card-actions .el-button {
    height: 32px;
    font-size: 12px;
    padding: 4px 8px;
  }
}

@media (max-width: 480px) {
  .bank-deposit-list {
    margin: 0;
  }
  
  .stats-section {
    padding: 8px;
  }
  
  .action-panel {
    padding: 8px;
  }
  
  .action-panel .el-button {
    height: 36px;
    font-size: 12px;
  }
  
  .deposit-card {
    padding: 10px;
    border-radius: 8px;
  }
  
  .product-name {
    font-size: 14px;
  }
  
  .info-row .label,
  .info-row .value {
    font-size: 12px;
  }
  
  .info-row .value.amount {
    font-size: 13px;
  }
}

/* Element Plus 统计组件响应式调整 */
@media (max-width: 768px) {
  .el-statistic {
    text-align: center;
    margin-bottom: 16px;
  }
  
  .el-statistic__content {
    justify-content: center;
  }
}
</style>