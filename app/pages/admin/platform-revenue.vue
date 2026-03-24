<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { usePlatformRevenueStore } from "~/stores/platformRevenue";
import type { RevenueRecord, RevenueStatus } from "~/stores/platformRevenue";

definePageMeta({
  layout: "admin",
  middleware: ["admin"],
});

useHead({
  title: "Platform Revenue - BokkuXpress",
});

// Initialize Pinia store
const store = usePlatformRevenueStore();
const toast = useToast();

// Local UI state (not in store)
const showCalculateModal = ref(false);
const showAuditModal = ref(false);
const selectedRevenueForAudit = ref<RevenueRecord | null>(null);
const excludeDeliveryFees = ref(false);
const forceRecalculate = ref(false);

// Month options for dropdown
const monthOptions = [
  { label: "January", value: 1 },
  { label: "February", value: 2 },
  { label: "March", value: 3 },
  { label: "April", value: 4 },
  { label: "May", value: 5 },
  { label: "June", value: 6 },
  { label: "July", value: 7 },
  { label: "August", value: 8 },
  { label: "September", value: 9 },
  { label: "October", value: 10 },
  { label: "November", value: 11 },
  { label: "December", value: 12 },
];

// Computed properties from store
const revenueRecords = computed(() => store.sortedRecords);
const loading = computed(() => store.loading);
const calculating = computed(() => store.calculating);
const selectedMonth = computed({
  get: () => store.selectedMonth,
  set: (val) => store.setSelectedMonthYear(val, store.selectedYear),
});
const selectedYear = computed({
  get: () => store.selectedYear,
  set: (val) => store.setSelectedMonthYear(store.selectedMonth, val),
});

const currentMonthRevenue = computed(() => store.currentMonthRevenue);
const totalPlatformFees = computed(() => store.totalPlatformFees);
const totalOrders = computed(() => store.totalOrders);
const totalSubtotal = computed(() => store.totalSubtotal);
const isCurrentLocked = computed(() => store.isCurrentLocked);
const canCalculate = computed(() => store.canCalculate);

const branchGrossLoading = ref(false);
const branchGrossError = ref<string | null>(null);
const branchStores = ref<Array<{ id: string; name: string }>>([]);
const branchGrossRows = ref<
  Array<{
    store_id: string;
    store_name: string;
    order_count: number;
    total_sales: number;
  }>
>([]);
const branchGrossTotals = ref<{
  total_orders: number;
  total_sales: number;
} | null>(null);
const selectedBranchId = ref<string>("");

// Computed for audit logs
const auditLogsForSelected = computed(() => {
  if (!selectedRevenueForAudit.value) return [];
  return store.getAuditLogsForRevenue(selectedRevenueForAudit.value.id);
});

// Methods that delegate to store
async function fetchRevenue() {
  try {
    await store.fetchRecords(24);
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error.message || "Failed to fetch revenue data",
      color: "error",
    });
  }
}

async function fetchAllTimeBranchSubtotalSales() {
  branchGrossLoading.value = true;
  branchGrossError.value = null;

  try {
    const { data: sessionData } = await useSupabaseClient().auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) throw new Error("Session expired");

    const res = await $fetch<{
      stores: Array<{ id: string; name: string }>;
      rows: Array<{
        store_id: string;
        store_name: string;
        order_count: number;
        total_sales: number;
      }>;
      totals: { total_orders: number; total_sales: number };
    }>("/api/admin/finance/branch-gross-sales", {
      method: "GET" as any,
      headers: { Authorization: `Bearer ${accessToken}` },
      params: selectedBranchId.value
        ? { store_id: selectedBranchId.value }
        : undefined,
    });

    branchStores.value = res?.stores || [];
    branchGrossRows.value = res?.rows || [];
    branchGrossTotals.value = res?.totals || null;
  } catch (e: any) {
    branchGrossError.value =
      e?.statusMessage || e?.message || "Failed to load branch sales";
  } finally {
    branchGrossLoading.value = false;
  }
}

async function calculateRevenue() {
  try {
    // Show warning if forcing recalculation
    if (forceRecalculate.value && isCurrentLocked.value) {
      toast.add({
        title: "Warning",
        description: "Force recalculating a locked month. This will be logged.",
        color: "warning",
      });
    }

    await store.calculateRevenue({
      month: selectedMonth.value,
      year: selectedYear.value,
      excludeDeliveryFees: excludeDeliveryFees.value,
      forceRecalculate: forceRecalculate.value,
    });

    toast.add({
      title: "Success",
      description: `Calculated revenue for ${store.getMonthName(selectedMonth.value)} ${selectedYear.value}`,
      color: "success",
    });

    showCalculateModal.value = false;
    excludeDeliveryFees.value = false;
    forceRecalculate.value = false;
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error.message || "Failed to calculate revenue",
      color: "error",
    });
  }
}

async function generateInvoice(revenueId: string) {
  try {
    const result = await store.generateInvoice(revenueId);

    toast.add({
      title: "Invoice Generated",
      description: `Invoice #${result.invoice_number} created`,
      color: "success",
    });
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error.message || "Failed to generate invoice",
      color: "error",
    });
  }
}

async function lockRevenue(revenueId: string, currentStatus: RevenueStatus) {
  try {
    const newStatus = await store.toggleLock(revenueId, currentStatus);

    toast.add({
      title: "Status Updated",
      description: `Revenue ${newStatus === "locked" ? "locked" : "unlocked"}`,
      color: "success",
    });
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error.message || "Failed to update status",
      color: "error",
    });
  }
}

async function showAuditTrail(revenue: RevenueRecord) {
  selectedRevenueForAudit.value = revenue;
  showAuditModal.value = true;
  await store.fetchAuditLogs(revenue.id);
}

function exportCSV(month: number, year: number) {
  store.exportCSV(month, year);
}

function formatCurrency(amount: number) {
  return store.formatCurrency(amount);
}

function formatNumber(num: number) {
  return store.formatNumber(num);
}

function getStatusColor(status: RevenueStatus) {
  return store.getStatusColor(status);
}

function getStatusBadgeClass(status: RevenueStatus, size: "sm" | "lg") {
  const color = getStatusColor(status);
  const base =
    "inline-flex items-center rounded-full font-semibold capitalize ring-1 ring-inset";
  const sizeClass = size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs";

  switch (color) {
    case "green":
      return `${base} ${sizeClass} bg-green-50 text-green-700 ring-green-200`;
    case "amber":
      return `${base} ${sizeClass} bg-amber-50 text-amber-700 ring-amber-200`;
    case "red":
      return `${base} ${sizeClass} bg-blue-50 text-blue-700 ring-blue-200`;
    default:
      return `${base} ${sizeClass} bg-gray-50 text-gray-700 ring-gray-200`;
  }
}

function getMonthName(month: number) {
  return store.getMonthName(month);
}

function isLocking(revenueId: string) {
  return store.isLocking(revenueId);
}

function isGeneratingInvoice(revenueId: string) {
  return store.isGeneratingInvoice(revenueId);
}

onMounted(() => {
  fetchRevenue();
  fetchAllTimeBranchSubtotalSales();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="px-4 py-6 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-gray-900">Platform Revenue</h1>
        <p class="mt-2 text-sm text-gray-600">
          Monthly 8% service fee revenue from digital sales. BokkuXpress
          receives 100% of payments; platform fees are calculated and invoiced
          monthly.
        </p>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-white rounded-xl shadow-sm p-6">
          <p class="text-sm font-medium text-gray-600">
            Total Platform Fees (All Time)
          </p>
          <p class="mt-2 text-2xl font-bold text-gray-900">
            {{ formatCurrency(totalPlatformFees) }}
          </p>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-6">
          <p class="text-sm font-medium text-gray-600">Total Digital Orders</p>
          <p class="mt-2 text-2xl font-bold text-gray-900">
            {{ formatNumber(totalOrders) }}
          </p>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-6">
          <p class="text-sm font-medium text-gray-600">Total Sales</p>
          <p class="mt-2 text-2xl font-bold text-gray-900">
            {{ formatCurrency(totalSubtotal) }}
          </p>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-6">
          <p class="text-sm font-medium text-gray-600">Effective Rate</p>
          <p class="mt-2 text-2xl font-bold text-blue-600">8%</p>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-6 mb-8">
        <div
          class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h2 class="text-lg font-bold text-gray-900">
              Total Sales by Branch (All Time)
            </h2>
            <p class="mt-1 text-sm text-gray-600">
              Aggregated sales subtotal across branches. No order-level details.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <select
              v-model="selectedBranchId"
              class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              @change="fetchAllTimeBranchSubtotalSales"
            >
              <option value="">All Branches</option>
              <option v-for="s in branchStores" :key="s.id" :value="s.id">
                {{ s.name }}
              </option>
            </select>

            <button
              type="button"
              class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
              :disabled="branchGrossLoading"
              @click="fetchAllTimeBranchSubtotalSales"
            >
              {{ branchGrossLoading ? "Loading..." : "Refresh" }}
            </button>
          </div>
        </div>

        <div
          v-if="branchGrossError"
          class="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700"
        >
          {{ branchGrossError }}
        </div>

        <div v-else class="mt-4">
          <div
            v-if="branchGrossTotals"
            class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4"
          >
            <div class="rounded-xl bg-gray-50 p-4">
              <p class="text-sm text-gray-600">Total Orders</p>
              <p class="mt-1 text-xl font-bold text-gray-900">
                {{ formatNumber(branchGrossTotals.total_orders) }}
              </p>
            </div>
            <div class="rounded-xl bg-gray-50 p-4">
              <p class="text-sm text-gray-600">Total Sales</p>
              <p class="mt-1 text-xl font-bold text-gray-900">
                {{ formatCurrency(branchGrossTotals.total_sales) }}
              </p>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th
                    class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    Branch
                  </th>
                  <th
                    class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase"
                  >
                    Orders
                  </th>
                  <th
                    class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase"
                  >
                    Total Sales
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr v-for="r in branchGrossRows" :key="r.store_id">
                  <td class="px-4 py-2 text-sm font-medium text-gray-900">
                    {{ r.store_name }}
                  </td>
                  <td class="px-4 py-2 text-sm text-right text-gray-900">
                    {{ formatNumber(r.order_count) }}
                  </td>
                  <td class="px-4 py-2 text-sm text-right text-gray-900">
                    {{ formatCurrency(r.total_sales) }}
                  </td>
                </tr>
                <tr v-if="branchGrossRows.length === 0">
                  <td
                    colspan="3"
                    class="px-4 py-6 text-center text-sm text-gray-500"
                  >
                    No data.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-wrap gap-4 mb-6">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
          @click="showCalculateModal = true"
        >
          Calculate Monthly Revenue
        </button>
      </div>

      <!-- Current Month Summary -->
      <div
        v-if="currentMonthRevenue"
        class="bg-white rounded-xl shadow-sm p-6 mb-8"
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-gray-900">
            {{ getMonthName(currentMonthRevenue.month) }}
            {{ currentMonthRevenue.year }}
          </h2>
          <span :class="getStatusBadgeClass(currentMonthRevenue.status, 'lg')">
            {{ currentMonthRevenue.status }}
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div>
            <p class="text-sm text-gray-500">Orders from Platform</p>
            <p class="text-xl font-bold text-gray-900">
              {{ formatNumber(currentMonthRevenue.total_orders) }}
            </p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Total Digital Sales</p>
            <p class="text-xl font-bold text-gray-900">
              {{ formatCurrency(currentMonthRevenue.subtotal) }}
            </p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Platform Share (8%)</p>
            <p class="text-xl font-bold text-blue-600">
              {{ formatCurrency(currentMonthRevenue.platform_fee) }}
            </p>
          </div>
          <div v-if="currentMonthRevenue.delivery_fees_excluded">
            <p class="text-sm text-gray-500">Delivery Fees Excluded</p>
            <p class="text-xl font-bold text-gray-900">
              {{ formatCurrency(currentMonthRevenue.delivery_fees_excluded) }}
            </p>
          </div>
        </div>

        <!-- Breakdown by Store -->
        <div
          v-if="currentMonthRevenue.breakdown?.length > 0"
          class="border-t pt-4"
        >
          <h3 class="text-sm font-semibold text-gray-900 mb-3">
            Breakdown by Branch
          </h3>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th
                    class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    Branch
                  </th>
                  <th
                    class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase"
                  >
                    Orders
                  </th>
                  <th
                    class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase"
                  >
                    Subtotal
                  </th>
                  <th
                    class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase"
                  >
                    Platform Fee
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr v-for="b in currentMonthRevenue.breakdown" :key="b.id">
                  <td class="px-4 py-2 text-sm font-medium text-gray-900">
                    {{ b.store_name }}
                  </td>
                  <td class="px-4 py-2 text-sm text-right text-gray-900">
                    {{ formatNumber(b.order_count) }}
                  </td>
                  <td class="px-4 py-2 text-sm text-right text-gray-900">
                    {{ formatCurrency(b.subtotal) }}
                  </td>
                  <td
                    class="px-4 py-2 text-sm text-right font-medium text-blue-600"
                  >
                    {{ formatCurrency(b.platform_fee) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-wrap gap-3 mt-6 pt-4 border-t">
          <button
            v-if="!currentMonthRevenue.invoice_number"
            type="button"
            class="inline-flex items-center justify-center rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-700 ring-1 ring-inset ring-green-200 hover:bg-green-100 disabled:opacity-60"
            :disabled="isGeneratingInvoice(currentMonthRevenue.id)"
            @click="generateInvoice(currentMonthRevenue.id)"
          >
            {{
              isGeneratingInvoice(currentMonthRevenue.id)
                ? "Generating..."
                : "Generate Invoice"
            }}
          </button>
          <div v-else class="flex items-center gap-2 text-sm text-gray-600">
            <span>Invoice: {{ currentMonthRevenue.invoice_number }}</span>
          </div>

          <button
            type="button"
            class="inline-flex items-center justify-center rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 ring-1 ring-inset ring-blue-200 hover:bg-blue-100"
            @click="
              exportCSV(currentMonthRevenue.month, currentMonthRevenue.year)
            "
          >
            Export CSV
          </button>

          <button
            type="button"
            class="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold ring-1 ring-inset hover:bg-gray-100 disabled:opacity-60"
            :class="
              currentMonthRevenue.status === 'locked'
                ? 'bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100'
                : 'bg-gray-50 text-gray-700 ring-gray-200'
            "
            :disabled="isLocking(currentMonthRevenue.id)"
            @click="
              lockRevenue(currentMonthRevenue.id, currentMonthRevenue.status)
            "
          >
            {{
              isLocking(currentMonthRevenue.id)
                ? "Updating..."
                : currentMonthRevenue.status === "locked"
                  ? "Unlock"
                  : "Lock Numbers"
            }}
          </button>
        </div>
      </div>

      <!-- Historical Revenue Table -->
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b">
          <h2 class="text-lg font-bold text-gray-900">Historical Revenue</h2>
        </div>

        <div v-if="loading" class="p-8 text-center">
          <div
            class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"
          ></div>
          <p class="mt-2 text-sm text-gray-500">Loading...</p>
        </div>

        <div
          v-else-if="revenueRecords.length === 0"
          class="p-8 text-center text-gray-500"
        >
          No revenue records found. Calculate revenue for a month to get
          started.
        </div>

        <table v-else class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
              >
                Period
              </th>
              <th
                class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase"
              >
                Orders
              </th>
              <th
                class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase"
              >
                Subtotal
              </th>
              <th
                class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase"
              >
                Platform Fee (8%)
              </th>
              <th
                class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase"
              >
                Status
              </th>
              <th
                class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase"
              >
                Invoice
              </th>
              <th
                class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="record in revenueRecords" :key="record.id">
              <td
                class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
              >
                {{ getMonthName(record.month) }} {{ record.year }}
              </td>
              <td
                class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900"
              >
                {{ formatNumber(record.total_orders) }}
              </td>
              <td
                class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900"
              >
                {{ formatCurrency(record.subtotal) }}
              </td>
              <td
                class="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-600"
              >
                {{ formatCurrency(record.platform_fee) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <span :class="getStatusBadgeClass(record.status, 'sm')">
                  {{ record.status }}
                </span>
              </td>
              <td
                class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500"
              >
                {{ record.invoice_number || "-" }}
              </td>
              <td
                class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
              >
                <div class="flex items-center justify-end gap-2">
                  <button
                    v-if="!record.invoice_number"
                    type="button"
                    class="rounded-md px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:opacity-60"
                    :disabled="isGeneratingInvoice(record.id)"
                    @click="generateInvoice(record.id)"
                  >
                    {{ isGeneratingInvoice(record.id) ? "..." : "Invoice" }}
                  </button>
                  <button
                    type="button"
                    class="rounded-md px-2 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-50"
                    @click="showAuditTrail(record)"
                  >
                    Audit
                  </button>
                  <button
                    type="button"
                    class="rounded-md px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                    @click="exportCSV(record.month, record.year)"
                  >
                    CSV
                  </button>
                  <button
                    type="button"
                    class="rounded-md px-2 py-1 text-xs font-semibold hover:bg-gray-50 disabled:opacity-60"
                    :class="
                      record.status === 'locked'
                        ? 'text-amber-700 hover:bg-amber-50'
                        : 'text-gray-700'
                    "
                    :disabled="isLocking(record.id)"
                    @click="lockRevenue(record.id, record.status)"
                  >
                    {{
                      isLocking(record.id)
                        ? "..."
                        : record.status === "locked"
                          ? "Unlock"
                          : "Lock"
                    }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Calculate Modal -->
    <div v-if="showCalculateModal" class="fixed inset-0 z-50">
      <div
        class="absolute inset-0 bg-black/40"
        @click="showCalculateModal = false"
      ></div>
      <div class="relative flex min-h-full items-center justify-center p-4">
        <div class="w-full max-w-lg rounded-xl bg-white shadow-xl">
          <div class="p-6">
            <h3 class="text-lg font-bold text-gray-900 mb-4">
              Calculate Monthly Revenue
            </h3>

            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1"
                    >Month</label
                  >
                  <select
                    v-model.number="selectedMonth"
                    class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option
                      v-for="opt in monthOptions"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1"
                    >Year</label
                  >
                  <input
                    v-model.number="selectedYear"
                    type="number"
                    class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div class="space-y-2">
                <label class="flex items-center gap-2 text-sm text-gray-900">
                  <input
                    v-model="excludeDeliveryFees"
                    type="checkbox"
                    class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Exclude delivery fees from calculation</span>
                </label>
                <p class="text-xs text-gray-500">
                  If checked, platform fee will be calculated on (subtotal -
                  delivery fees)
                </p>
              </div>

              <div class="space-y-2">
                <label class="flex items-center gap-2 text-sm text-gray-900">
                  <input
                    v-model="forceRecalculate"
                    type="checkbox"
                    class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Force recalculate (even if locked)</span>
                </label>
                <p class="text-xs text-gray-500">
                  Only use this if you need to correct a calculation
                </p>
              </div>
            </div>

            <div class="flex justify-end gap-3 mt-6">
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-lg bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-200 hover:bg-gray-100"
                @click="showCalculateModal = false"
              >
                Cancel
              </button>
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                :disabled="calculating"
                @click="calculateRevenue"
              >
                {{ calculating ? "Calculating..." : "Calculate" }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Audit Trail Modal -->
    <div v-if="showAuditModal" class="fixed inset-0 z-50">
      <div
        class="absolute inset-0 bg-black/40"
        @click="showAuditModal = false"
      ></div>
      <div class="relative flex min-h-full items-center justify-center p-4">
        <div
          class="w-full max-w-4xl rounded-xl bg-white shadow-xl max-h-[80vh] flex flex-col"
        >
          <div class="p-6 border-b">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-bold text-gray-900">
                  Audit Trail:
                  {{
                    selectedRevenueForAudit
                      ? getMonthName(selectedRevenueForAudit.month)
                      : ""
                  }}
                  {{ selectedRevenueForAudit?.year }}
                </h3>
                <p class="text-sm text-gray-500 mt-1">
                  Financial accountability log for revenue calculations and
                  status changes
                </p>
              </div>
              <button
                type="button"
                class="text-gray-400 hover:text-gray-600"
                @click="showAuditModal = false"
              >
                <svg
                  class="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div class="p-6 overflow-y-auto flex-1">
            <div
              v-if="auditLogsForSelected.length === 0"
              class="text-center text-gray-500 py-8"
            >
              No audit records found for this revenue period.
            </div>
            <table v-else class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th
                    class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    Date
                  </th>
                  <th
                    class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    Admin
                  </th>
                  <th
                    class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    Action
                  </th>
                  <th
                    class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    Status Change
                  </th>
                  <th
                    class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase"
                  >
                    Subtotal
                  </th>
                  <th
                    class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase"
                  >
                    Platform Fee
                  </th>
                  <th
                    class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr v-for="log in auditLogsForSelected" :key="log.id">
                  <td class="px-4 py-2 text-sm text-gray-900 whitespace-nowrap">
                    {{ new Date(log.created_at).toLocaleString() }}
                  </td>
                  <td class="px-4 py-2 text-sm text-gray-900">
                    {{ log.admin_email || log.admin_id.slice(0, 8) + "..." }}
                  </td>
                  <td class="px-4 py-2 text-sm">
                    <span
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      :class="{
                        'bg-blue-50 text-blue-700':
                          log.action === 'calculated' ||
                          log.action === 'recalculated',
                        'bg-blue-50 text-blue-700':
                          log.action === 'force_recalculate',
                        'bg-amber-50 text-amber-700': log.action === 'locked',
                        'bg-green-50 text-green-700':
                          log.action === 'unlocked' || log.action === 'paid',
                        'bg-purple-50 text-purple-700':
                          log.action === 'disputed',
                      }"
                    >
                      {{ log.action.replace("_", " ") }}
                    </span>
                  </td>
                  <td class="px-4 py-2 text-sm text-gray-900">
                    <span v-if="log.previous_status || log.new_status">
                      {{ log.previous_status || "-" }} →
                      {{ log.new_status || "-" }}
                    </span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                  <td class="px-4 py-2 text-sm text-right text-gray-900">
                    <span
                      v-if="
                        log.previous_total !== null || log.new_total !== null
                      "
                    >
                      <span
                        v-if="log.previous_total !== log.new_total"
                        class="text-amber-600"
                      >
                        {{ formatCurrency(log.previous_total || 0) }} →
                        {{ formatCurrency(log.new_total || 0) }}
                      </span>
                      <span v-else>{{
                        formatCurrency(log.new_total || 0)
                      }}</span>
                    </span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                  <td class="px-4 py-2 text-sm text-right text-gray-900">
                    <span
                      v-if="
                        log.previous_platform_fee !== null ||
                        log.new_platform_fee !== null
                      "
                    >
                      <span
                        v-if="
                          log.previous_platform_fee !== log.new_platform_fee
                        "
                        class="text-amber-600"
                      >
                        {{ formatCurrency(log.previous_platform_fee || 0) }} →
                        {{ formatCurrency(log.new_platform_fee || 0) }}
                      </span>
                      <span v-else>{{
                        formatCurrency(log.new_platform_fee || 0)
                      }}</span>
                    </span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                  <td
                    class="px-4 py-2 text-sm text-gray-500 max-w-xs truncate"
                    :title="log.notes || ''"
                  >
                    {{ log.notes || "-" }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="p-6 border-t bg-gray-50">
            <div class="flex justify-end">
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-lg bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-200 hover:bg-gray-100"
                @click="showAuditModal = false"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
