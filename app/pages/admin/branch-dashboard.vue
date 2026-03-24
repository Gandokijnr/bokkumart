<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header with Store Context -->
      <div class="mb-8">
        <div class="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Branch Dashboard</h1>
            <p class="text-gray-600 mt-2">Managing: {{ managedStoreNames }}</p>
          </div>
          <div class="flex items-center gap-3">
            <!-- Store Selector for multi-store managers -->
            <select
              v-if="managedStores.length > 1"
              v-model="dashboard.selectedStoreId.value"
              class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">All My Stores</option>
              <option
                v-for="store in managedStores"
                :key="store.id"
                :value="store.id"
              >
                {{ store.name }}
              </option>
            </select>
            <div class="bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
              <p class="text-sm font-medium text-blue-900">
                {{ managedStores.length }} Store{{
                  managedStores.length !== 1 ? "s" : ""
                }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="mb-8">
        <AdminStatsCards
          mode="dashboard"
          :stats="stats"
          :loading="loading"
          :show-revenue="showRevenue"
          :format-naira="formatNaira"
          @low-stock-click="handleLowStockClick"
        />

        <div class="mt-6">
          <OperationalKpiCards
            :kpis="dashboard.operationalKpis.value"
            :loading="dashboard.operationalLoading.value"
            :format-naira="formatNaira"
          />
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
          <p class="text-sm text-gray-600 mt-2">
            View and manage orders from your stores
          </p>
        </NuxtLink>

        <NuxtLink
          to="/admin/branch-inventory"
          class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <span class="text-3xl mb-3 block">�</span>
          <h3 class="text-lg font-semibold text-gray-900">Manage Inventory</h3>
          <p class="text-sm text-gray-600 mt-2">
            Upload CSV or manage stock for your stores
          </p>
        </NuxtLink>

        <NuxtLink
          to="/admin/my-audit-logs"
          class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <span class="text-3xl mb-3 block">📝</span>
          <h3 class="text-lg font-semibold text-gray-900">My Activity Log</h3>
          <p class="text-sm text-gray-600 mt-2">
            View your recent actions and changes
          </p>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from "~/stores/user";
import { useDashboard } from "~/composables/useDashboard";
import { watch } from "vue";

const userStore = useUserStore();
const dashboard = useDashboard();
const { stats, loading, showRevenue, formatNaira } = dashboard;

definePageMeta({
  layout: "admin",
  middleware: ["auth"],
});

useHead({
  title: "Branch Dashboard - BokkuXpress",
});

const managedStores = computed(() => userStore.managedStores);
const managedStoreNames = computed(() => userStore.managedStoreNames);

// Watch for store selection changes and refresh stats
watch(
  () => dashboard.selectedStoreId.value,
  () => {
    dashboard.fetchDashboardStats();
    dashboard.fetchOperationalKpis();
  },
);

onMounted(async () => {
  const dashboard = useDashboard();
  await dashboard.startDashboard();
});

onUnmounted(() => {
  const dashboard = useDashboard();
  dashboard.stopAll();
});

const handleLowStockClick = () => {
  navigateTo({
    path: "/admin/branch-inventory",
    query: { status: "low_stock" },
  });
};
</script>
