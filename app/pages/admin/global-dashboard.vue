<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Global Dashboard</h1>
        <p class="text-gray-600 mt-2">System-wide overview and administration</p>
      </div>

      <!-- Quick Stats -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Total Stores</p>
              <p class="text-2xl font-bold text-gray-900 mt-1">{{ stats.totalStores }}</p>
            </div>
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span class="text-2xl">🏪</span>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Active Staff</p>
              <p class="text-2xl font-bold text-gray-900 mt-1">{{ stats.totalStaff }}</p>
            </div>
            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span class="text-2xl">👥</span>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Today's Orders</p>
              <p class="text-2xl font-bold text-gray-900 mt-1">{{ stats.todaysOrders }}</p>
            </div>
            <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
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
            <div class="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <span class="text-2xl">💰</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NuxtLink
          to="/admin/staff-management"
          class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <span class="text-3xl mb-3 block">👥</span>
          <h3 class="text-lg font-semibold text-gray-900">Staff Management</h3>
          <p class="text-sm text-gray-600 mt-2">Manage users, roles, and permissions</p>
        </NuxtLink>

        <NuxtLink
          to="/admin/orders"
          class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <span class="text-3xl mb-3 block">📦</span>
          <h3 class="text-lg font-semibold text-gray-900">All Orders</h3>
          <p class="text-sm text-gray-600 mt-2">View and manage orders across all stores</p>
        </NuxtLink>

        <NuxtLink
          to="/admin/analytics"
          class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <span class="text-3xl mb-3 block">📊</span>
          <h3 class="text-lg font-semibold text-gray-900">Analytics</h3>
          <p class="text-sm text-gray-600 mt-2">Branch performance and insights</p>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['super-admin']
})

useHead({
  title: 'Global Dashboard - HomeAffairs'
})

const stats = ref({
  totalStores: 4,
  totalStaff: 12,
  todaysOrders: 45,
  todaysRevenue: 2500000
})

const formatNumber = (num: number) => {
  return num.toLocaleString('en-NG')
}
</script>
