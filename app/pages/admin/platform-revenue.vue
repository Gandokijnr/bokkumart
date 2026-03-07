<script setup lang="ts">
import { ref, computed, onMounted } from "vue";

definePageMeta({
  layout: "admin",
  middleware: ["admin"],
});

useHead({
  title: "Platform Revenue - HomeAffairs",
});

// State
const revenueRecords = ref<any[]>([]);
const loading = ref(false);
const selectedMonth = ref(new Date().getMonth() + 1);
const selectedYear = ref(new Date().getFullYear());
const showCalculateModal = ref(false);
const excludeDeliveryFees = ref(false);
const forceRecalculate = ref(false);
const calculating = ref(false);
const generatingInvoice = ref<string | null>(null);
const locking = ref<string | null>(null);
const toast = useToast();

// Computed
const currentMonthRevenue = computed(() => {
  return revenueRecords.value.find(
    (r) => r.month === selectedMonth.value && r.year === selectedYear.value,
  );
});

const totalPlatformFees = computed(() => {
  return revenueRecords.value.reduce(
    (sum, r) => sum + (r.platform_fee || 0),
    0,
  );
});

const totalOrders = computed(() => {
  return revenueRecords.value.reduce(
    (sum, r) => sum + (r.total_orders || 0),
    0,
  );
});

const totalGrossSales = computed(() => {
  return revenueRecords.value.reduce((sum, r) => sum + (r.gross_sales || 0), 0);
});

// Methods
async function fetchRevenue() {
  loading.value = true;
  try {
    const { data } = await $fetch<{ success: boolean; data: any[] }>(
      "/api/admin/platform-revenue",
      {
        params: {
          limit: 24,
        },
      },
    );
    revenueRecords.value = data || [];
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error.message || "Failed to fetch revenue data",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

async function calculateRevenue() {
  calculating.value = true;
  try {
    const result = await $fetch("/api/admin/platform-revenue/calculate", {
      method: "POST",
      body: {
        month: selectedMonth.value,
        year: selectedYear.value,
        excludeDeliveryFees: excludeDeliveryFees.value,
        forceRecalculate: forceRecalculate.value,
      },
    });

    toast.add({
      title: "Success",
      description: `Calculated revenue for ${result.data.month_name} ${result.data.year}`,
      color: "success",
    });

    showCalculateModal.value = false;
    await fetchRevenue();
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error.message || "Failed to calculate revenue",
      color: "error",
    });
  } finally {
    calculating.value = false;
  }
}

async function generateInvoice(revenueId: string) {
  generatingInvoice.value = revenueId;
  try {
    const result = await $fetch<{
      success: boolean;
      data: {
        invoice_number: string;
        invoice_date: string;
        due_date: string;
        billing_period: string;
        subtotal: number;
        vat: number;
        total: number;
        status: string;
      };
    }>("/api/admin/platform-revenue/generate-invoice", {
      method: "POST",
      body: {
        id: revenueId,
        dueDays: 7,
      },
    });

    toast.add({
      title: "Invoice Generated",
      description: `Invoice #${result.data.invoice_number} created`,
      color: "success",
    });

    await fetchRevenue();
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error.message || "Failed to generate invoice",
      color: "error",
    });
  } finally {
    generatingInvoice.value = null;
  }
}

async function lockRevenue(revenueId: string, currentStatus: string) {
  const newStatus = currentStatus === "locked" ? "pending" : "locked";
  locking.value = revenueId;
  try {
    await $fetch("/api/admin/platform-revenue/lock", {
      method: "PATCH",
      body: {
        id: revenueId,
        status: newStatus,
      },
    });

    toast.add({
      title: "Status Updated",
      description: `Revenue ${newStatus === "locked" ? "locked" : "unlocked"}`,
      color: "success",
    });

    await fetchRevenue();
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error.message || "Failed to update status",
      color: "error",
    });
  } finally {
    locking.value = null;
  }
}

function exportCSV(month: number, year: number) {
  const url = `/api/admin/platform-revenue/export-csv?month=${month}&year=${year}`;
  window.open(url, "_blank");
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(amount || 0);
}

function formatNumber(num: number) {
  return new Intl.NumberFormat("en-NG").format(num || 0);
}

function getStatusColor(status: string) {
  switch (status) {
    case "paid":
      return "green";
    case "locked":
      return "amber";
    case "disputed":
      return "red";
    default:
      return "gray";
  }
}

function getMonthName(month: number) {
  return new Date(2020, month - 1, 1).toLocaleString("default", {
    month: "long",
  });
}

onMounted(() => {
  fetchRevenue();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="px-4 py-6 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-gray-900">Platform Revenue</h1>
        <p class="mt-2 text-sm text-gray-600">
          Monthly 8% service fee revenue from digital sales. Home Affairs
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
          <p class="text-sm font-medium text-gray-600">Total Gross Sales</p>
          <p class="mt-2 text-2xl font-bold text-gray-900">
            {{ formatCurrency(totalGrossSales) }}
          </p>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-6">
          <p class="text-sm font-medium text-gray-600">Effective Rate</p>
          <p class="mt-2 text-2xl font-bold text-red-600">8%</p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-wrap gap-4 mb-6">
        <UButton
          color="red"
          icon="i-heroicons-calculator"
          @click="showCalculateModal = true"
        >
          Calculate Monthly Revenue
        </UButton>
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
          <UBadge :color="getStatusColor(currentMonthRevenue.status)" size="lg">
            {{ currentMonthRevenue.status }}
          </UBadge>
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
              {{ formatCurrency(currentMonthRevenue.gross_sales) }}
            </p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Platform Share (8%)</p>
            <p class="text-xl font-bold text-red-600">
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
                    Gross Sales
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
                    {{ formatCurrency(b.gross_sales) }}
                  </td>
                  <td
                    class="px-4 py-2 text-sm text-right font-medium text-red-600"
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
          <UButton
            v-if="!currentMonthRevenue.invoice_number"
            color="green"
            variant="soft"
            :loading="generatingInvoice === currentMonthRevenue.id"
            @click="generateInvoice(currentMonthRevenue.id)"
          >
            Generate Invoice
          </UButton>
          <div v-else class="flex items-center gap-2 text-sm text-gray-600">
            <UIcon name="i-heroicons-document-check" class="text-green-500" />
            <span>Invoice: {{ currentMonthRevenue.invoice_number }}</span>
          </div>

          <UButton
            color="blue"
            variant="soft"
            @click="
              exportCSV(currentMonthRevenue.month, currentMonthRevenue.year)
            "
          >
            Export CSV
          </UButton>

          <UButton
            :color="currentMonthRevenue.status === 'locked' ? 'amber' : 'gray'"
            variant="soft"
            :loading="locking === currentMonthRevenue.id"
            @click="
              lockRevenue(currentMonthRevenue.id, currentMonthRevenue.status)
            "
          >
            {{
              currentMonthRevenue.status === "locked"
                ? "Unlock"
                : "Lock Numbers"
            }}
          </UButton>
        </div>
      </div>

      <!-- Historical Revenue Table -->
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b">
          <h2 class="text-lg font-bold text-gray-900">Historical Revenue</h2>
        </div>

        <div v-if="loading" class="p-8 text-center">
          <div
            class="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"
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
                Gross Sales
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
                {{ formatCurrency(record.gross_sales) }}
              </td>
              <td
                class="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-red-600"
              >
                {{ formatCurrency(record.platform_fee) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <UBadge :color="getStatusColor(record.status)" size="sm">
                  {{ record.status }}
                </UBadge>
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
                  <UButton
                    v-if="!record.invoice_number"
                    color="green"
                    variant="ghost"
                    size="xs"
                    :loading="generatingInvoice === record.id"
                    @click="generateInvoice(record.id)"
                  >
                    Invoice
                  </UButton>
                  <UButton
                    color="blue"
                    variant="ghost"
                    size="xs"
                    @click="exportCSV(record.month, record.year)"
                  >
                    CSV
                  </UButton>
                  <UButton
                    :color="record.status === 'locked' ? 'amber' : 'gray'"
                    variant="ghost"
                    size="xs"
                    :loading="locking === record.id"
                    @click="lockRevenue(record.id, record.status)"
                  >
                    {{ record.status === "locked" ? "Unlock" : "Lock" }}
                  </UButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Calculate Modal -->
    <UModal v-model="showCalculateModal">
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
              <USelect
                v-model="selectedMonth"
                :options="[
                  { label: 'January', value: 1 },
                  { label: 'February', value: 2 },
                  { label: 'March', value: 3 },
                  { label: 'April', value: 4 },
                  { label: 'May', value: 5 },
                  { label: 'June', value: 6 },
                  { label: 'July', value: 7 },
                  { label: 'August', value: 8 },
                  { label: 'September', value: 9 },
                  { label: 'October', value: 10 },
                  { label: 'November', value: 11 },
                  { label: 'December', value: 12 },
                ]"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Year</label
              >
              <UInput v-model="selectedYear" type="number" />
            </div>
          </div>

          <div class="space-y-2">
            <UCheckbox
              v-model="excludeDeliveryFees"
              label="Exclude delivery fees from calculation"
            />
            <p class="text-xs text-gray-500">
              If checked, platform fee will be calculated on (gross sales -
              delivery fees)
            </p>
          </div>

          <div class="space-y-2">
            <UCheckbox
              v-model="forceRecalculate"
              label="Force recalculate (even if locked)"
            />
            <p class="text-xs text-gray-500">
              Only use this if you need to correct a calculation
            </p>
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <UButton
            color="gray"
            variant="soft"
            @click="showCalculateModal = false"
          >
            Cancel
          </UButton>
          <UButton color="red" :loading="calculating" @click="calculateRevenue">
            Calculate
          </UButton>
        </div>
      </div>
    </UModal>
  </div>
</template>
