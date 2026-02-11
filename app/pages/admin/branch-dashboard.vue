<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header with Store Context -->
      <div class="mb-8">
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Branch Dashboard</h1>
            <p class="text-gray-600 mt-2">Managing: {{ managedStoreNames }}</p>
          </div>
          <div class="bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
            <p class="text-sm font-medium text-blue-900">{{ managedStores.length }} Store{{ managedStores.length !== 1 ? 's' : '' }}</p>
          </div>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Pending Orders</p>
              <p class="text-2xl font-bold text-gray-900 mt-1">{{ stats.pendingOrders }}</p>
            </div>
            <div class="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <span class="text-2xl">⏳</span>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Today's Orders</p>
              <p class="text-2xl font-bold text-gray-900 mt-1">{{ stats.todaysOrders }}</p>
            </div>
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span class="text-2xl">📦</span>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Today's Revenue</p>
              <p class="text-2xl font-bold text-gray-900 mt-1">₦{{ formatNumber(stats.todaysRevenue) }}</p>
            </div>
            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span class="text-2xl">💰</span>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Low Stock Items</p>
              <p class="text-2xl font-bold text-gray-900 mt-1">{{ stats.lowStockItems }}</p>
            </div>
            <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <span class="text-2xl">⚠️</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NuxtLink
          to="/admin/orders"
          class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <span class="text-3xl mb-3 block">📦</span>
          <h3 class="text-lg font-semibold text-gray-900">My Store Orders</h3>
          <p class="text-sm text-gray-600 mt-2">View and manage orders from your stores</p>
        </NuxtLink>

        <NuxtLink
          to="/admin/branch-inventory"
          class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <span class="text-3xl mb-3 block">�</span>
          <h3 class="text-lg font-semibold text-gray-900">Manage Inventory</h3>
          <p class="text-sm text-gray-600 mt-2">Upload CSV or manage stock for your stores</p>
        </NuxtLink>

        <NuxtLink
          to="/admin/my-audit-logs"
          class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <span class="text-3xl mb-3 block">📝</span>
          <h3 class="text-lg font-semibold text-gray-900">My Activity Log</h3>
          <p class="text-sm text-gray-600 mt-2">View your recent actions and changes</p>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '~/stores/user'

const userStore = useUserStore()

definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

useHead({
  title: 'Branch Dashboard - HomeAffairs'
})

const managedStores = computed(() => userStore.managedStores)
const managedStoreNames = computed(() => userStore.managedStoreNames)

// Placeholder stats - replace with real data from useAdminData
const stats = ref({
  pendingOrders: 8,
  todaysOrders: 23,
  todaysRevenue: 850000,
  lowStockItems: 3
})

const formatNumber = (num: number) => {
  return num.toLocaleString('en-NG')
}
</script>
