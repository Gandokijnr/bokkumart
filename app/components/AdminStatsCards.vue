<script setup lang="ts">
import type { DashboardStats, VerificationQueueStats } from '~/composables/useDashboard'

const props = defineProps<{
  mode: 'dashboard' | 'verification'
  stats?: DashboardStats | null
  verificationStats?: VerificationQueueStats | null
  loading: boolean
  showRevenue: boolean
  formatNaira: (amount: number) => string
}>()

const emit = defineEmits<{
  lowStockClick: []
}>()

const pendingUrgent = computed(() => {
  if (props.mode !== 'dashboard') return false
  return (props.stats?.pending_count || 0) > 0
})
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <template v-if="mode === 'dashboard'">
      <div
        class="bg-white rounded-xl shadow-sm border p-6 transition-shadow"
        :class="[
          pendingUrgent
            ? 'border-red-300 shadow-red-100/60 shadow-lg ring-1 ring-red-200 animate-pulse'
            : 'border-gray-200 hover:shadow-md'
        ]"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Pending Orders</p>
            <div v-if="loading" class="mt-2 h-7 w-16 rounded bg-gray-200 animate-pulse" />
            <p v-else class="text-2xl font-bold mt-1" :class="pendingUrgent ? 'text-red-700' : 'text-gray-900'">
              {{ stats?.pending_count || 0 }}
            </p>
          </div>
          <div class="w-12 h-12 rounded-lg flex items-center justify-center" :class="pendingUrgent ? 'bg-red-100' : 'bg-amber-100'">
            <span class="text-2xl">⏳</span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Today's Orders</p>
            <div v-if="loading" class="mt-2 h-7 w-16 rounded bg-gray-200 animate-pulse" />
            <p v-else class="text-2xl font-bold text-gray-900 mt-1">
              {{ stats?.todays_count || 0 }}
            </p>
          </div>
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <span class="text-2xl">📦</span>
          </div>
        </div>
      </div>

      <div
        v-if="showRevenue"
        class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Net Revenue (Today)</p>
            <div v-if="loading" class="mt-2 h-7 w-40 rounded bg-gray-200 animate-pulse" />
            <p v-else class="text-2xl font-bold text-gray-900 mt-1">
              {{ formatNaira(stats?.todays_revenue || 0) }}
            </p>
          </div>
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <span class="text-2xl">💰</span>
          </div>
        </div>
      </div>

      <div
        class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
        role="button"
        tabindex="0"
        @click="emit('lowStockClick')"
        @keydown.enter="emit('lowStockClick')"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Low Stock Items</p>
            <div v-if="loading" class="mt-2 h-7 w-16 rounded bg-gray-200 animate-pulse" />
            <p v-else class="text-2xl font-bold text-gray-900 mt-1">
              {{ stats?.low_stock_count || 0 }}
            </p>
          </div>
          <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
            <span class="text-2xl">⚠️</span>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Call List</p>
            <div v-if="loading" class="mt-2 h-7 w-28 rounded bg-gray-200 animate-pulse" />
            <p v-else class="text-2xl font-bold text-gray-900 mt-1">
              {{ verificationStats?.call_list_count || 0 }} Orders
            </p>
            <p v-if="!loading" class="text-sm text-gray-500 mt-1">
              {{ formatNaira(verificationStats?.unverified_value || 0) }} waiting for calls
            </p>
          </div>
          <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
            <span class="text-2xl">📞</span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Pending Orders</p>
            <div v-if="loading" class="mt-2 h-7 w-16 rounded bg-gray-200 animate-pulse" />
            <p v-else class="text-2xl font-bold text-gray-900 mt-1">
              {{ stats?.pending_count || 0 }}
            </p>
          </div>
          <div class="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
            <span class="text-2xl">⏳</span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Low Stock Items</p>
            <div v-if="loading" class="mt-2 h-7 w-16 rounded bg-gray-200 animate-pulse" />
            <p v-else class="text-2xl font-bold text-gray-900 mt-1">
              {{ stats?.low_stock_count || 0 }}
            </p>
          </div>
          <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
            <span class="text-2xl">⚠️</span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Today's Orders</p>
            <div v-if="loading" class="mt-2 h-7 w-16 rounded bg-gray-200 animate-pulse" />
            <p v-else class="text-2xl font-bold text-gray-900 mt-1">
              {{ stats?.todays_count || 0 }}
            </p>
          </div>
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <span class="text-2xl">📦</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
