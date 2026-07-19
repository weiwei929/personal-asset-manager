<template>
  <div class="page-stack">
    <!-- 股票 / 基金 切换 -->
    <div
      class="inline-flex p-0.5 rounded-lg border border-border-light dark:border-border-dark
             bg-card-light dark:bg-card-dark self-start"
      role="tablist"
    >
      <button
        type="button"
        role="tab"
        class="px-4 py-1.5 text-sm rounded-md transition-colors"
        :class="tab === 'stock'
          ? 'bg-gray-100 dark:bg-gray-800 text-text-light dark:text-text-dark font-medium'
          : 'text-subtext-light dark:text-subtext-dark hover:text-text-light dark:hover:text-text-dark'"
        :aria-selected="tab === 'stock'"
        @click="tab = 'stock'"
      >
        股票
      </button>
      <button
        type="button"
        role="tab"
        class="px-4 py-1.5 text-sm rounded-md transition-colors"
        :class="tab === 'fund'
          ? 'bg-gray-100 dark:bg-gray-800 text-text-light dark:text-text-dark font-medium'
          : 'text-subtext-light dark:text-subtext-dark hover:text-text-light dark:hover:text-text-dark'"
        :aria-selected="tab === 'fund'"
        @click="tab = 'fund'"
      >
        基金
      </button>
    </div>

    <StockInvestment v-if="tab === 'stock'" />
    <FundInvestment v-else />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import StockInvestment from './StockInvestment.vue'
import FundInvestment from './FundInvestment.vue'

const tab = ref('stock')
</script>
