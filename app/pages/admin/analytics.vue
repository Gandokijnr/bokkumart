<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useUserStore } from "~/stores/user";

definePageMeta({
  layout: "admin",
  middleware: ["admin"],
});

useHead({
  title: "Analytics Dashboard - HomeAffairs",
});

// State
const analytics = ref<any>(null);
const loading = ref(true);
const selectedDays = ref(30);
const selectedStore = ref("");
const stores = ref<any[]>([]);
const toast = useToast();
const userStore = useUserStore();

// Check if user is branch manager
const isBranchManager = computed(() => userStore.isBranchManager);
const managedStores = computed(() => userStore.managedStores);

const daysOptions = [
  { label: "Last 7 days", value: 7 },
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
  { label: "Last 365 days", value: 365 },
];

const storeOptions = computed(() => {
  // For branch managers, only show their assigned stores
  if (isBranchManager.value) {
    return managedStores.value.map((s) => ({ label: s.name, value: s.id }));
  }
  return [
    { label: "All Stores", value: "" },
    ...stores.value.map((s) => ({ label: s.name, value: s.id })),
  ];
});

// Colors for charts
const chartColors = {
  primary: "#DC2626", // red-600
  secondary: "#F87171", // red-400
  accent: "#991B1B", // red-800
  gray: "#9CA3AF",
  success: "#10B981",
  warning: "#F59E0B",
  info: "#3B82F6",
};

// Computed stats
const summary = computed(() => analytics.value?.summary || {});
const trends = computed(() => analytics.value?.trends || {});
const breakdowns = computed(() => analytics.value?.breakdowns || {});

// Chart data computed
// ECharts line chart options
const revenueChartOption = computed(() => {
  const daily = trends.value?.daily || [];
  return {
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderColor: "#E5E7EB",
      borderWidth: 1,
      textStyle: { color: "#374151" },
      formatter: (params: any) => {
        const p = params[0];
        return `<div class="font-medium">${p.name}</div><div class="text-red-600">Revenue: ${formatCurrency(p.value)}</div>`;
      },
    },
    toolbox: {
      feature: {
        saveAsImage: { title: "Save Image", name: "revenue-trend" },
        dataZoom: { title: { zoom: "Zoom", back: "Reset Zoom" } },
        restore: { title: "Reset" },
      },
    },
    dataZoom: [
      { type: "inside", start: 0, end: 100 },
      { type: "slider", start: 0, end: 100, bottom: 0 },
    ],
    grid: {
      left: "3%",
      right: "4%",
      bottom: "15%",
      top: "15%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: daily.map((d: any) =>
        new Date(d.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      ),
      axisLine: { lineStyle: { color: "#9CA3AF" } },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        formatter: (v: number) => "₦" + (v / 1000).toFixed(0) + "k",
      },
      splitLine: { lineStyle: { color: "#E5E7EB" } },
    },
    series: [
      {
        data: daily.map((d: any) => d.revenue),
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { color: chartColors.primary, width: 3 },
        itemStyle: { color: chartColors.primary },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${chartColors.primary}40` },
              { offset: 1, color: `${chartColors.primary}05` },
            ],
          },
        },
        emphasis: {
          focus: "series",
          itemStyle: { borderWidth: 2, borderColor: "#fff" },
        },
      },
    ],
  };
});

// ECharts line chart options
const ordersChartOption = computed(() => {
  const daily = trends.value?.daily || [];
  return {
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderColor: "#E5E7EB",
      borderWidth: 1,
      textStyle: { color: "#374151" },
      formatter: (params: any) => {
        const p = params[0];
        return `<div class="font-medium">${p.name}</div><div class="text-blue-600">Orders: ${p.value}</div>`;
      },
    },
    toolbox: {
      feature: {
        saveAsImage: { title: "Save Image", name: "orders-trend" },
        dataZoom: { title: { zoom: "Zoom", back: "Reset Zoom" } },
        restore: { title: "Reset" },
      },
    },
    dataZoom: [
      { type: "inside", start: 0, end: 100 },
      { type: "slider", start: 0, end: 100, bottom: 0 },
    ],
    grid: {
      left: "3%",
      right: "4%",
      bottom: "15%",
      top: "15%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: daily.map((d: any) =>
        new Date(d.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      ),
      axisLine: { lineStyle: { color: "#9CA3AF" } },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      splitLine: { lineStyle: { color: "#E5E7EB" } },
    },
    series: [
      {
        data: daily.map((d: any) => d.orders),
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { color: chartColors.info, width: 3 },
        itemStyle: { color: chartColors.info },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${chartColors.info}40` },
              { offset: 1, color: `${chartColors.info}05` },
            ],
          },
        },
        emphasis: {
          focus: "series",
          itemStyle: { borderWidth: 2, borderColor: "#fff" },
        },
      },
    ],
  };
});

// ECharts pie chart options
const statusChartOption = computed(() => {
  const data = breakdowns.value?.byStatus || {};
  const colors = [
    chartColors.success,
    chartColors.warning,
    chartColors.primary,
    chartColors.gray,
    chartColors.info,
  ];
  return {
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderColor: "#E5E7EB",
      borderWidth: 1,
      textStyle: { color: "#374151" },
      formatter: (params: any) => {
        return `<div class="font-medium">${params.name}</div><div>Count: ${formatNumber(params.value)} (${params.percent}%)</div>`;
      },
    },
    toolbox: {
      feature: {
        saveAsImage: { title: "Save Image", name: "order-status" },
      },
    },
    legend: {
      bottom: 0,
      itemWidth: 12,
      itemHeight: 12,
      type: "scroll",
    },
    series: [
      {
        type: "pie",
        radius: ["40%", "70%"],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: "bold" },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
        data: Object.entries(data).map(([name, value], index) => ({
          name,
          value,
          itemStyle: { color: colors[index % colors.length] },
        })),
      },
    ],
  };
});

// ECharts pie chart options
const channelChartOption = computed(() => {
  const data = breakdowns.value?.byChannel || {};
  const colors = [chartColors.primary, chartColors.success, chartColors.gray];
  const labelMap: Record<string, string> = {
    platform: "Digital (Platform)",
    in_store: "In-Store",
  };
  return {
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderColor: "#E5E7EB",
      borderWidth: 1,
      textStyle: { color: "#374151" },
      formatter: (params: any) => {
        return `<div class="font-medium">${params.name}</div><div>Count: ${formatNumber(params.value)} (${params.percent}%)</div>`;
      },
    },
    toolbox: {
      feature: {
        saveAsImage: { title: "Save Image", name: "sales-channel" },
      },
    },
    legend: { bottom: 0, itemWidth: 12, itemHeight: 12 },
    series: [
      {
        type: "pie",
        radius: ["40%", "70%"],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: "bold" },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
        data: Object.entries(data).map(([key, value], index) => ({
          name: labelMap[key] || key,
          value,
          itemStyle: { color: colors[index % colors.length] },
        })),
      },
    ],
  };
});

// ECharts pie chart options
const paymentMethodChartOption = computed(() => {
  const data = breakdowns.value?.byPaymentMethod || {};
  const colors = [chartColors.info, chartColors.warning, chartColors.gray];
  const labelMap: Record<string, string> = {
    online: "Online Payment",
    pod: "Pay on Delivery",
  };
  return {
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderColor: "#E5E7EB",
      borderWidth: 1,
      textStyle: { color: "#374151" },
      formatter: (params: any) => {
        return `<div class="font-medium">${params.name}</div><div>Count: ${formatNumber(params.value)} (${params.percent}%)</div>`;
      },
    },
    toolbox: {
      feature: {
        saveAsImage: { title: "Save Image", name: "payment-method" },
      },
    },
    legend: { bottom: 0, itemWidth: 12, itemHeight: 12 },
    series: [
      {
        type: "pie",
        radius: ["40%", "70%"],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: "bold" },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
        data: Object.entries(data).map(([key, value], index) => ({
          name: labelMap[key] || key,
          value,
          itemStyle: { color: colors[index % colors.length] },
        })),
      },
    ],
  };
});

// ECharts bar chart options
const storeChartOption = computed(() => {
  const stores = breakdowns.value?.byStore || [];
  return {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderColor: "#E5E7EB",
      borderWidth: 1,
      textStyle: { color: "#374151" },
      formatter: (params: any) => {
        const p = params[0];
        return `<div class="font-medium">${p.name}</div><div class="text-red-600">Revenue: ${formatCurrency(p.value)}</div>`;
      },
    },
    toolbox: {
      feature: {
        saveAsImage: { title: "Save Image", name: "store-performance" },
        dataZoom: { title: { zoom: "Zoom", back: "Reset" } },
        restore: { title: "Reset" },
      },
    },
    dataZoom: [{ type: "inside", start: 0, end: 100 }],
    grid: {
      left: "3%",
      right: "4%",
      bottom: "15%",
      top: "15%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: stores.map((s: any) => s.store_name),
      axisLabel: { rotate: 45, interval: 0, fontSize: 10 },
      axisLine: { lineStyle: { color: "#9CA3AF" } },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        formatter: (v: number) => "₦" + (v / 1000).toFixed(0) + "k",
      },
      splitLine: { lineStyle: { color: "#E5E7EB" } },
    },
    series: [
      {
        data: stores.map((s: any) => s.revenue),
        type: "bar",
        itemStyle: { color: chartColors.primary, borderRadius: [4, 4, 0, 0] },
        emphasis: { itemStyle: { color: chartColors.accent } },
      },
    ],
  };
});

// ECharts bar chart options
const monthlyRevenueChartOption = computed(() => {
  const monthly = trends.value?.monthly || [];
  const labels = monthly
    .map((m: any) => {
      const monthName = new Date(m.year, m.month - 1).toLocaleString(
        "default",
        { month: "short" },
      );
      return `${monthName} ${m.year}`;
    })
    .reverse();
  return {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderColor: "#E5E7EB",
      borderWidth: 1,
      textStyle: { color: "#374151" },
      formatter: (params: any) => {
        let html = `<div class="font-medium">${params[0].name}</div>`;
        params.forEach((p: any) => {
          html += `<div style="color:${p.color}">${p.seriesName}: ${formatCurrency(p.value)}</div>`;
        });
        return html;
      },
    },
    toolbox: {
      feature: {
        saveAsImage: { title: "Save Image", name: "monthly-revenue" },
        dataView: { title: "Data View", readOnly: true },
        restore: { title: "Reset" },
      },
    },
    legend: { top: 0, selectedMode: "multiple" },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "10%",
      top: "15%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: labels,
      axisLine: { lineStyle: { color: "#9CA3AF" } },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        formatter: (v: number) => "₦" + (v / 1000).toFixed(0) + "k",
      },
      splitLine: { lineStyle: { color: "#E5E7EB" } },
    },
    series: [
      {
        name: "Platform Fee (₦)",
        data: monthly.map((m: any) => m.platform_fee).reverse(),
        type: "bar",
        itemStyle: { color: chartColors.primary },
        emphasis: { focus: "series" },
      },
      {
        name: "Gross Sales (₦)",
        data: monthly.map((m: any) => m.gross_sales).reverse(),
        type: "bar",
        itemStyle: { color: chartColors.secondary },
        emphasis: { focus: "series" },
      },
    ],
  };
});

// Methods
async function fetchAnalytics() {
  loading.value = true;
  try {
    const params: any = { days: selectedDays.value };
    if (selectedStore.value) {
      params.store_id = selectedStore.value;
    }

    const data = await $fetch("/api/admin/analytics", { params });
    analytics.value = data;
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error.message || "Failed to fetch analytics",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

async function fetchStores() {
  try {
    const supabase = useSupabaseClient();
    const { data } = await supabase
      .from("stores")
      .select("id, name")
      .eq("is_active", true)
      .order("name");

    stores.value = data || [];
  } catch (error) {
    console.error("Failed to fetch stores:", error);
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function formatNumber(num: number) {
  return new Intl.NumberFormat("en-NG").format(num || 0);
}

// Watch for filter changes
watch([selectedDays, selectedStore], () => {
  fetchAnalytics();
});

onMounted(() => {
  fetchStores();
  fetchAnalytics();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="px-4 py-6 sm:px-6 lg:px-8">
      <!-- Header -->
      <div
        class="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4"
      >
        <div>
          <h1 class="text-2xl font-bold text-gray-900">
            {{ isBranchManager ? "My Store Analytics" : "Analytics Dashboard" }}
          </h1>
          <p class="mt-2 text-sm text-gray-600">
            {{
              isBranchManager
                ? `Viewing analytics for your assigned ${managedStores.length} store${managedStores.length > 1 ? "s" : ""}`
                : "Monitor revenue, orders, and platform performance metrics"
            }}
          </p>
        </div>

        <!-- Filters -->
        <div class="flex flex-wrap gap-3 items-center">
          <select
            v-model.number="selectedDays"
            class="w-40 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option
              v-for="opt in daysOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
          <select
            v-if="!isBranchManager && stores.length > 0"
            v-model="selectedStore"
            class="w-48 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option
              v-for="opt in storeOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
          <select
            v-if="isBranchManager && managedStores.length > 1"
            v-model="selectedStore"
            class="w-48 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="">All My Stores</option>
            <option
              v-for="opt in storeOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
          <span
            v-if="isBranchManager && managedStores.length === 1"
            class="px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg"
          >
            {{ managedStores[0]?.name }}
          </span>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-20">
        <div
          class="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"
        ></div>
      </div>

      <!-- Content -->
      <div v-else-if="analytics" class="space-y-6">
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            class="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-600"
          >
            <p class="text-sm font-medium text-gray-600">Total Revenue</p>
            <p class="mt-2 text-2xl font-bold text-gray-900">
              {{ formatCurrency(summary.totalRevenue) }}
            </p>
            <p class="text-xs text-gray-500 mt-1">
              {{ formatNumber(summary.paidOrdersCount) }} paid orders
            </p>
          </div>

          <div
            class="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500"
          >
            <p class="text-sm font-medium text-gray-600">
              Digital Platform Sales
            </p>
            <p class="mt-2 text-2xl font-bold text-gray-900">
              {{ formatCurrency(summary.platformRevenue) }}
            </p>
            <p class="text-xs text-gray-500 mt-1">
              {{ formatNumber(breakdowns.byChannel?.platform || 0) }} orders
            </p>
          </div>

          <div
            class="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500"
          >
            <p class="text-sm font-medium text-gray-600">In-Store Sales</p>
            <p class="mt-2 text-2xl font-bold text-gray-900">
              {{ formatCurrency(summary.inStoreRevenue) }}
            </p>
            <p class="text-xs text-gray-500 mt-1">
              {{ formatNumber(breakdowns.byChannel?.in_store || 0) }} orders
            </p>
          </div>

          <div
            class="bg-white rounded-xl shadow-sm p-6 border-l-4 border-amber-500"
          >
            <p class="text-sm font-medium text-gray-600">Average Order Value</p>
            <p class="mt-2 text-2xl font-bold text-gray-900">
              {{ formatCurrency(summary.averageOrderValue) }}
            </p>
            <p class="text-xs text-gray-500 mt-1">
              {{ summary.conversionRate?.toFixed(1) || 0 }}% conversion
            </p>
          </div>
        </div>

        <!-- Revenue & Orders Trends -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-white rounded-xl shadow-sm p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">
              Revenue Trend
            </h3>
            <div class="h-64">
              <v-chart
                :option="revenueChartOption"
                class="h-full w-full"
                autoresize
              />
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-sm p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">
              Orders Trend
            </h3>
            <div class="h-64">
              <v-chart
                :option="ordersChartOption"
                class="h-full w-full"
                autoresize
              />
            </div>
          </div>
        </div>

        <!-- Monthly Platform Revenue -->
        <div
          class="bg-white rounded-xl shadow-sm p-6"
          v-if="trends.monthly?.length > 0"
        >
          <h3 class="text-lg font-semibold text-gray-900 mb-4">
            Monthly Platform Revenue (Last 12 Months)
          </h3>
          <div class="h-64">
            <v-chart
              :option="monthlyRevenueChartOption"
              class="h-full w-full"
              autoresize
            />
          </div>
          <div class="mt-4 flex items-center justify-center gap-6 text-sm">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded bg-red-600"></div>
              <span class="text-gray-600">Platform Fee (8%)</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded bg-red-400"></div>
              <span class="text-gray-600">Gross Digital Sales</span>
            </div>
          </div>
        </div>

        <!-- Breakdown Charts -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="bg-white rounded-xl shadow-sm p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">
              Order Status
            </h3>
            <div class="h-48 flex items-center justify-center">
              <v-chart
                :option="statusChartOption"
                class="h-full w-full"
                autoresize
              />
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-sm p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">
              Sales Channel
            </h3>
            <div class="h-48 flex items-center justify-center">
              <v-chart
                :option="channelChartOption"
                class="h-full w-full"
                autoresize
              />
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-sm p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">
              Payment Method
            </h3>
            <div class="h-48 flex items-center justify-center">
              <v-chart
                :option="paymentMethodChartOption"
                class="h-full w-full"
                autoresize
              />
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-sm p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">
              {{
                isBranchManager
                  ? "My Stores by Revenue"
                  : "Top Stores by Revenue"
              }}
            </h3>
            <div class="space-y-3 max-h-48 overflow-y-auto">
              <div
                v-for="store in (breakdowns.byStore || []).slice(0, 5)"
                :key="store.store_id"
                class="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
              >
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate">
                    {{ store.store_name }}
                  </p>
                  <p class="text-xs text-gray-500">
                    {{ formatNumber(store.orders) }} orders
                  </p>
                </div>
                <p class="text-sm font-bold text-red-600">
                  {{ formatCurrency(store.revenue) }}
                </p>
              </div>
              <p
                v-if="!(breakdowns.byStore || []).length"
                class="text-sm text-gray-500 text-center py-4"
              >
                No store data available
              </p>
            </div>
          </div>
        </div>

        <!-- Store Performance Chart -->
        <div
          class="bg-white rounded-xl shadow-sm p-6"
          v-if="breakdowns.byStore?.length > 0"
        >
          <h3 class="text-lg font-semibold text-gray-900 mb-4">
            Store Revenue Performance
          </h3>
          <div class="h-64">
            <v-chart
              :option="storeChartOption"
              class="h-full w-full"
              autoresize
            />
          </div>
        </div>

        <!-- Quick Links -->
        <div class="bg-white rounded-xl shadow-sm p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div class="flex flex-wrap gap-3">
            <NuxtLink
              v-if="!isBranchManager"
              to="/admin/platform-revenue"
              class="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
            >
              Platform Revenue
            </NuxtLink>
            <NuxtLink
              to="/admin/orders"
              class="inline-flex items-center justify-center rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-inset ring-blue-200 hover:bg-blue-100"
            >
              View {{ isBranchManager ? "My Store" : "All" }} Orders
            </NuxtLink>
            <NuxtLink
              v-if="!isBranchManager"
              to="/admin/global-dashboard"
              class="inline-flex items-center justify-center rounded-lg bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 ring-1 ring-inset ring-green-200 hover:bg-green-100"
            >
              Global Dashboard
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-20">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="w-16 h-16 text-gray-300 mx-auto mb-4"
          aria-hidden="true"
        >
          <path d="M3 3v18h18" />
          <path d="M7 14v4" />
          <path d="M11 10v8" />
          <path d="M15 6v12" />
          <path d="M19 12v6" />
        </svg>
        <h3 class="text-lg font-medium text-gray-900">No data available</h3>
        <p class="text-gray-500 mt-2">
          Try adjusting your filters or check back later.
        </p>
      </div>
    </div>
  </div>
</template>
