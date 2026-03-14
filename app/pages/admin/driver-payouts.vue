<script setup lang="ts">
import { ref, computed, onMounted } from "vue";

definePageMeta({
  layout: "admin",
  middleware: ["admin"],
});

useHead({ title: "Driver Payouts - BokkuMart" });

const loading = ref(false);
const error = ref<string | null>(null);
const payouts = ref<any[]>([]);
const txRef = ref<Record<string, string>>({});

const pendingCount = computed(() => payouts.value.length);

async function fetchPending() {
  loading.value = true;
  error.value = null;
  try {
    const { data: sessionData } = await useSupabaseClient().auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) throw new Error("Session expired");

    const res = await $fetch("/api/admin/driver-payouts/pending", {
      method: "GET" as any,
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    payouts.value = ((res as any)?.payouts || []) as any[];
  } catch (e: any) {
    error.value = e?.statusMessage || e?.message || "Failed to fetch payouts";
  } finally {
    loading.value = false;
  }
}

async function markPaid(row: any) {
  const toast = useToast();
  const refVal = String(txRef.value[row.id] || "").trim();
  if (!refVal) {
    toast.add({
      title: "Transaction Reference Required",
      description: "Enter the transfer/reference ID before marking as paid.",
      color: "warning",
    } as any);
    return;
  }

  try {
    const { data: sessionData } = await useSupabaseClient().auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) throw new Error("Session expired");

    await $fetch("/api/admin/driver-payouts/mark-paid", {
      method: "PATCH" as any,
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        payoutRequestId: row.id,
        transactionReference: refVal,
      },
    });

    toast.add({
      title: "Marked as Paid",
      description: "Payout updated successfully.",
      color: "success",
    } as any);

    await fetchPending();
  } catch (e: any) {
    toast.add({
      title: "Update Failed",
      description: e?.statusMessage || e?.message || "Failed to update payout",
      color: "error",
    } as any);
  }
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 0,
  }).format(Number(amount || 0));
}

onMounted(fetchPending);
</script>

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Driver Payouts</h1>
        <p class="text-sm text-slate-500">
          Pending requests: {{ pendingCount }}
        </p>
      </div>
      <button
        @click="fetchPending"
        class="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
      >
        Refresh
      </button>
    </div>

    <div v-if="loading" class="text-slate-600">Loading...</div>
    <div v-else-if="error" class="text-blue-600">{{ error }}</div>

    <div v-else class="space-y-3">
      <div
        v-for="row in payouts"
        :key="row.id"
        class="rounded-xl border border-slate-200 bg-white p-4"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="font-semibold text-slate-900">
              ₦{{ formatMoney(row.amount) }}
              <span class="ml-2 text-xs text-slate-500"
                >({{ row.status }})</span
              >
            </div>
            <div class="text-sm text-slate-600">
              Driver: {{ row.driver?.full_name || row.driver_id }}
              <span v-if="row.driver?.phone_number">
                ({{ row.driver.phone_number }})
              </span>
            </div>
            <div class="text-xs text-slate-500 mt-1">
              Requested: {{ new Date(row.created_at).toLocaleString() }}
            </div>
          </div>

          <div class="w-full max-w-sm">
            <label class="block text-xs text-slate-500 mb-1"
              >Transaction Reference</label
            >
            <input
              v-model="txRef[row.id]"
              type="text"
              class="w-full px-3 py-2 border border-slate-200 rounded-lg"
              placeholder="e.g. TRF_123456"
            />

            <button
              @click="markPaid(row)"
              class="mt-2 w-full px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
            >
              Mark as Paid
            </button>
          </div>
        </div>

        <details class="mt-3">
          <summary class="text-xs text-slate-500 cursor-pointer">
            Bank details
          </summary>
          <pre class="mt-2 text-xs bg-slate-50 p-3 rounded-lg overflow-auto">{{
            row.bank_details
          }}</pre>
        </details>
      </div>

      <div v-if="payouts.length === 0" class="text-slate-600">
        No pending payout requests.
      </div>
    </div>
  </div>
</template>
