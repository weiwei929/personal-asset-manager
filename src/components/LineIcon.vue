<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :class="className"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-for="(seg, i) in segments" :key="i">
      <path v-if="seg.t === 'p'" :d="seg.d" />
      <circle v-else-if="seg.t === 'c'" :cx="seg.cx" :cy="seg.cy" :r="seg.r" />
      <line v-else-if="seg.t === 'l'" :x1="seg.x1" :y1="seg.y1" :x2="seg.x2" :y2="seg.y2" />
      <polyline v-else-if="seg.t === 'pl'" :points="seg.points" />
      <rect
        v-else-if="seg.t === 'r'"
        :x="seg.x"
        :y="seg.y"
        :width="seg.w"
        :height="seg.h"
        :rx="seg.rx || 0"
      />
    </template>
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 20 },
  strokeWidth: { type: [Number, String], default: 1.5 },
  className: { type: String, default: 'shrink-0' }
})

const ICONS = {
  layout: [
    { t: 'r', x: 3, y: 3, w: 7, h: 9, rx: 1 },
    { t: 'r', x: 14, y: 3, w: 7, h: 5, rx: 1 },
    { t: 'r', x: 14, y: 12, w: 7, h: 9, rx: 1 },
    { t: 'r', x: 3, y: 16, w: 7, h: 5, rx: 1 }
  ],
  calendar: [
    { t: 'r', x: 3, y: 4, w: 18, h: 18, rx: 2 },
    { t: 'l', x1: 16, y1: 2, x2: 16, y2: 6 },
    { t: 'l', x1: 8, y1: 2, x2: 8, y2: 6 },
    { t: 'l', x1: 3, y1: 10, x2: 21, y2: 10 }
  ],
  bank: [
    { t: 'p', d: 'M3 21h18' },
    { t: 'p', d: 'M3 10h18' },
    { t: 'p', d: 'M5 6l7-3 7 3' },
    { t: 'l', x1: 4, y1: 10, x2: 4, y2: 21 },
    { t: 'l', x1: 20, y1: 10, x2: 20, y2: 21 },
    { t: 'l', x1: 8, y1: 14, x2: 8, y2: 17 },
    { t: 'l', x1: 12, y1: 14, x2: 12, y2: 17 },
    { t: 'l', x1: 16, y1: 14, x2: 16, y2: 17 }
  ],
  chart: [
    { t: 'l', x1: 18, y1: 20, x2: 18, y2: 10 },
    { t: 'l', x1: 12, y1: 20, x2: 12, y2: 4 },
    { t: 'l', x1: 6, y1: 20, x2: 6, y2: 14 }
  ],
  hand: [
    { t: 'p', d: 'M18 11V6a2 2 0 0 0-4 0v1' },
    { t: 'p', d: 'M14 10V4a2 2 0 0 0-4 0v6' },
    { t: 'p', d: 'M10 10.5V6a2 2 0 0 0-4 0v8' },
    { t: 'p', d: 'M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15' }
  ],
  close: [
    { t: 'l', x1: 18, y1: 6, x2: 6, y2: 18 },
    { t: 'l', x1: 6, y1: 6, x2: 18, y2: 18 }
  ],
  menu: [
    { t: 'l', x1: 4, y1: 6, x2: 20, y2: 6 },
    { t: 'l', x1: 4, y1: 12, x2: 20, y2: 12 },
    { t: 'l', x1: 4, y1: 18, x2: 20, y2: 18 }
  ],
  trash: [
    { t: 'pl', points: '3 6 5 6 21 6' },
    { t: 'p', d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' }
  ],
  transfer: [
    { t: 'l', x1: 16, y1: 3, x2: 21, y2: 3 },
    { t: 'l', x1: 21, y1: 3, x2: 21, y2: 8 },
    { t: 'p', d: 'M21 3l-7 7' },
    { t: 'l', x1: 8, y1: 21, x2: 3, y2: 21 },
    { t: 'l', x1: 3, y1: 21, x2: 3, y2: 16 },
    { t: 'p', d: 'M3 21l7-7' }
  ],
  wallet: [
    { t: 'r', x: 2, y: 6, w: 20, h: 14, rx: 2 },
    { t: 'l', x1: 2, y1: 10, x2: 22, y2: 10 },
    { t: 'c', cx: 16, cy: 15, r: 1 }
  ],
  trend: [
    { t: 'pl', points: '22 7 13.5 15.5 8.5 10.5 2 17' },
    { t: 'pl', points: '16 7 22 7 22 13' }
  ],
  target: [
    { t: 'c', cx: 12, cy: 12, r: 9 },
    { t: 'c', cx: 12, cy: 12, r: 5 },
    { t: 'c', cx: 12, cy: 12, r: 1 }
  ],
  info: [
    { t: 'c', cx: 12, cy: 12, r: 9 },
    { t: 'l', x1: 12, y1: 16, x2: 12, y2: 12 },
    { t: 'l', x1: 12, y1: 8, x2: 12.01, y2: 8 }
  ],
  clock: [
    { t: 'c', cx: 12, cy: 12, r: 9 },
    { t: 'pl', points: '12 7 12 12 15 15' }
  ],
  layers: [
    { t: 'p', d: 'M12 2L2 7l10 5 10-5-10-5z' },
    { t: 'p', d: 'M2 17l10 5 10-5' },
    { t: 'p', d: 'M2 12l10 5 10-5' }
  ]
}

const segments = computed(() => ICONS[props.name] || ICONS.info)
</script>
