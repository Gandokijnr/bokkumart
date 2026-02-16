<script setup lang="ts">
import type { OperationalKpis } from '~/composables/useDashboard'

const props = defineProps<{
  kpis?: OperationalKpis | null
  loading: boolean
  formatNaira: (amount: number) => string
}>()

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return '0%'
  return `${(value * 100).toFixed(1)}%`
}

function formatHours(value: number | null) {
  if (value === null || !Number.isFinite(value)) return '—'
  return `${value.toFixed(1)}h`
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <p class="text-sm font-semibold text-gray-700">Operational KPIs (Last {{ kpis?.window_days || 7 }} days)</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
        <p class="text-xs text-gray-600">Orders / Day</p>
        <div v-if="loading" class="mt-2 h-7 w-20 rounded bg-gray-200 animate-pulse" />
        <p v-else class="text-2xl font-bold text-gray-900 mt-1">
          {{ (kpis?.orders_per_day ?? 0).toFixed(1) }}
        </p>
        <p v-if="!loading" class="text-xs text-gray-500 mt-1">Today: {{ kpis?.orders_today ?? 0 }}</p>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
        <p class="text-xs text-gray-600">Average Order Value</p>
        <div v-if="loading" class="mt-2 h-7 w-32 rounded bg-gray-200 animate-pulse" />
        <p v-else class="text-2xl font-bold text-gray-900 mt-1">
          {{ formatNaira(kpis?.average_order_value ?? 0) }}
        </p>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
        <p class="text-xs text-gray-600">Fulfillment Time</p>
        <div v-if="loading" class="mt-2 h-7 w-20 rounded bg-gray-200 animate-pulse" />
        <p v-else class="text-2xl font-bold text-gray-900 mt-1">
          {{ formatHours(kpis?.fulfillment_time_hours ?? null) }}
        </p>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
        <p class="text-xs text-gray-600">Cancellation Rate</p>
        <div v-if="loading" class="mt-2 h-7 w-20 rounded bg-gray-200 animate-pulse" />
        <p v-else class="text-2xl font-bold text-gray-900 mt-1">
          {{ formatPercent(kpis?.cancellation_rate ?? 0) }}
        </p>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
        <p class="text-xs text-gray-600">Stock Mismatch Rate</p>
        <div v-if="loading" class="mt-2 h-7 w-20 rounded bg-gray-200 animate-pulse" />
        <p v-else class="text-2xl font-bold text-gray-900 mt-1">
          {{ formatPercent(kpis?.stock_mismatch_rate ?? 0) }}
        </p>
        <p v-if="!loading" class="text-[11px] text-gray-500 mt-1">Based on stock-related rejections</p>
      </div>
    </div>
  </div>
</template>
