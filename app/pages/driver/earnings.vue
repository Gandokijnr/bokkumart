<template>
  <div class="min-h-screen bg-slate-900">
    <!-- Header Bar -->
    <div
      class="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-lg border-b border-slate-700/50 shadow-2xl"
    >
      <div class="max-w-2xl mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <NuxtLink
              to="/driver/dashboard"
              class="w-10 h-10 bg-slate-700/50 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-all"
            >
              <svg
                class="w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </NuxtLink>
            <div>
              <h1 class="text-lg font-bold text-white">My Earnings</h1>
              <p class="text-xs text-slate-400">Balance & Payouts</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-2xl mx-auto px-4 py-6 pb-24">
      <!-- Loading State -->
      <div
        v-if="loading"
        class="flex flex-col items-center justify-center py-20"
      >
        <div
          class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"
        ></div>
        <p class="text-slate-400 mt-4">Loading...</p>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center"
      >
        <p class="text-red-400">{{ error }}</p>
        <button
          @click="fetchEarnings"
          class="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-all"
        >
          Try Again
        </button>
      </div>

      <template v-else>
        <!-- Balance Card (Manual Payout System) -->
        <div
          class="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl p-6 border border-blue-500/30 mb-6"
        >
          <p class="text-sm text-blue-400 mb-1">Withdrawable Balance</p>
          <p class="text-4xl font-bold text-white mb-4">
            ₦{{ formatMoney(payoutBalance.withdrawableBalance) }}
          </p>

          <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="bg-slate-900/50 rounded-xl p-3">
              <p class="text-xs text-slate-400">Eligible Deliveries</p>
              <p class="text-lg font-semibold text-white">
                {{ payoutBalance.eligibleOrdersCount }}
              </p>
            </div>
            <div class="bg-slate-900/50 rounded-xl p-3">
              <p class="text-xs text-slate-400">Minimum Payout</p>
              <p class="text-lg font-semibold text-green-400">
                ₦{{ formatMoney(payoutBalance.minimumPayout) }}
              </p>
            </div>
          </div>

          <div
            v-if="payoutBalance.hasPendingRequest"
            class="bg-amber-500/10 rounded-xl p-3 mb-4 border border-amber-500/30"
          >
            <div class="flex items-center gap-2">
              <svg
                class="w-5 h-5 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p class="text-sm text-amber-400">
                You have a pending payout request
              </p>
            </div>
          </div>

          <div
            v-else-if="!payoutBalance.canRequest"
            class="bg-slate-900/50 rounded-xl p-3 mb-4"
          >
            <div class="flex items-center gap-2">
              <svg
                class="w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p class="text-sm text-slate-400">
                Need ₦{{
                  formatMoney(
                    payoutBalance.minimumPayout -
                      payoutBalance.withdrawableBalance,
                  )
                }}
                more to request payout
              </p>
            </div>
          </div>

          <button
            v-else
            @click="showPayoutModal = true"
            class="w-full py-4 bg-green-500 hover:bg-green-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            Request Payout
          </button>
        </div>

        <!-- Earnings History -->
        <div
          v-if="earnings.length > 0"
          class="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/30"
        >
          <h4 class="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Earnings History
          </h4>
          <div class="space-y-3">
            <div
              v-for="earning in earnings"
              :key="earning.id"
              class="bg-slate-900/50 rounded-xl p-3 border border-slate-700/30"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-semibold text-white">
                    Order #{{ earning.order_id?.slice(0, 8).toUpperCase() }}
                  </p>
                  <p class="text-xs text-slate-400">
                    {{
                      new Date(earning.created_at).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    }}
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-green-400 font-semibold">
                    +₦{{ formatMoney(earning.total_earned) }}
                  </p>
                  <p v-if="earning.tip_amount" class="text-xs text-slate-400">
                    Tip: ₦{{ formatMoney(earning.tip_amount) }}
                  </p>
                  <span
                    v-if="earning.is_withdrawn"
                    class="text-xs text-slate-500"
                  >
                    Withdrawn
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            v-if="pagination.earnings.hasMore"
            @click="loadMoreEarnings"
            :disabled="loadingMore"
            class="w-full mt-4 py-3 bg-slate-700/50 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl border border-slate-600/30 transition-all active:scale-95 disabled:opacity-50"
          >
            {{ loadingMore ? "Loading..." : "Load More" }}
          </button>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="!loading && earnings.length === 0"
          class="flex flex-col items-center justify-center py-12"
        >
          <div
            class="w-20 h-20 bg-slate-700/50 rounded-2xl flex items-center justify-center mb-4"
          >
            <svg
              class="w-10 h-10 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p class="text-slate-400 text-center">
            No earnings yet.<br />Complete deliveries to start earning!
          </p>
        </div>
      </template>
    </div>

    <!-- Payout Modal -->
    <div
      v-if="showPayoutModal"
      class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50"
      @click.self="showPayoutModal = false"
    >
      <div
        class="bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-700 shadow-2xl"
      >
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-bold text-white">Request Payout</h3>
          <button
            @click="showPayoutModal = false"
            class="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-white"
          >
            <svg
              class="w-5 h-5"
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

        <div class="mb-6">
          <p class="text-sm text-slate-400 mb-2">Withdrawable Balance</p>
          <p class="text-3xl font-bold text-white">
            ₦{{ formatMoney(payoutBalance.withdrawableBalance) }}
          </p>
        </div>

        <form @submit.prevent="submitPayout" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">
              Bank Name
            </label>
            <input
              v-model="payoutForm.bankName"
              type="text"
              required
              class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
              placeholder="e.g., First Bank"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">
              Account Number
            </label>
            <input
              v-model="payoutForm.accountNumber"
              type="text"
              required
              maxlength="10"
              class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
              placeholder="10 digit account number"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">
              Account Name
            </label>
            <input
              v-model="payoutForm.accountName"
              type="text"
              required
              class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
              placeholder="Name on account"
            />
          </div>

          <p v-if="payoutError" class="text-red-400 text-sm">
            {{ payoutError }}
          </p>

          <button
            type="submit"
            :disabled="submitting"
            class="w-full py-4 bg-green-500 hover:bg-green-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <svg
              v-if="submitting"
              class="w-5 h-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span v-else>Submit Request</span>
          </button>
        </form>
      </div>
    </div>

    <!-- Success Toast -->
    <div
      v-if="showSuccessToast"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50 animate-bounce"
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
          d="M5 13l4 4L19 7"
        />
      </svg>
      <span class="font-semibold">Payout request submitted!</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";

definePageMeta({
  middleware: "driver",
  layout: false,
});

interface PayoutBalance {
  withdrawableBalance: number;
  eligibleOrdersCount: number;
  minimumPayout: number;
  canRequest: boolean;
  hasPendingRequest: boolean;
}

interface Earning {
  id: string;
  order_id: string;
  delivery_fee: number;
  tip_amount: number | null;
  total_earned: number;
  is_withdrawn: boolean;
  created_at: string;
}

interface EarningsResponse {
  earnings: Earning[];
  pagination?: {
    earnings?: { limit: number; offset: number; hasMore: boolean };
  };
}

const loading = ref(true);
const loadingMore = ref(false);
const error = ref("");
const earnings = ref<Earning[]>([]);
const earningsOffset = ref(0);

const session = useSupabaseSession();

const payoutBalance = reactive<PayoutBalance>({
  withdrawableBalance: 0,
  eligibleOrdersCount: 0,
  minimumPayout: 2000,
  canRequest: false,
  hasPendingRequest: false,
});

const pagination = reactive({
  earnings: { limit: 50, offset: 0, hasMore: false },
});

// Modal state
const showPayoutModal = ref(false);
const submitting = ref(false);
const payoutError = ref("");
const showSuccessToast = ref(false);
const payoutForm = reactive({
  bankName: "",
  accountNumber: "",
  accountName: "",
});

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-NG").format(amount);
}

async function fetchPayoutBalance() {
  try {
    const headers = session.value?.access_token
      ? { Authorization: `Bearer ${session.value.access_token}` }
      : undefined;

    const data = await $fetch<{ balance: PayoutBalance }>(
      "/api/driver/payout-balance",
      { headers },
    );
    if (data?.balance) {
      Object.assign(payoutBalance, data.balance);
    }
  } catch (err: any) {
    console.error("Error fetching payout balance:", err);
  }
}

async function fetchEarnings() {
  loading.value = true;
  error.value = "";

  try {
    const headers = session.value?.access_token
      ? { Authorization: `Bearer ${session.value.access_token}` }
      : undefined;

    const data = await $fetch<EarningsResponse>("/api/driver/earnings", {
      query: {
        earningsLimit: pagination.earnings.limit,
        earningsOffset: pagination.earnings.offset,
        withdrawalsLimit: 0,
        withdrawalsOffset: 0,
      },
      headers,
    });

    if (data) {
      earnings.value = data.earnings || [];
      pagination.earnings.hasMore = data.pagination?.earnings?.hasMore || false;
    }

    await fetchPayoutBalance();
  } catch (err: any) {
    error.value = err?.data?.message || "Failed to load earnings data";
    console.error("Error fetching earnings:", err);
  } finally {
    loading.value = false;
  }
}

async function loadMoreEarnings() {
  if (loadingMore.value) return;

  loadingMore.value = true;
  earningsOffset.value += pagination.earnings.limit;

  try {
    const headers = session.value?.access_token
      ? { Authorization: `Bearer ${session.value.access_token}` }
      : undefined;

    const data = await $fetch<EarningsResponse>("/api/driver/earnings", {
      query: {
        earningsLimit: pagination.earnings.limit,
        earningsOffset: earningsOffset.value,
        withdrawalsLimit: 0,
        withdrawalsOffset: 0,
      },
      headers,
    });

    if (data?.earnings?.length) {
      earnings.value.push(...data.earnings);
      pagination.earnings.hasMore = data.pagination?.earnings?.hasMore || false;
    }
  } catch (err) {
    console.error("Error loading more earnings:", err);
  } finally {
    loadingMore.value = false;
  }
}

async function submitPayout() {
  if (submitting.value) return;

  if (payoutBalance.hasPendingRequest) {
    payoutError.value = "You already have a pending payout request";
    return;
  }

  if (!payoutBalance.canRequest) {
    payoutError.value = `Minimum payout is ₦${formatMoney(payoutBalance.minimumPayout)}`;
    return;
  }

  if (payoutForm.accountNumber.length !== 10) {
    payoutError.value = "Account number must be 10 digits";
    return;
  }

  submitting.value = true;
  payoutError.value = "";

  try {
    const headers = session.value?.access_token
      ? { Authorization: `Bearer ${session.value.access_token}` }
      : undefined;

    const response = await $fetch<{ success: boolean; message?: string }>(
      "/api/driver/request-payout",
      {
        method: "POST",
        headers,
        body: {
          bank_details: {
            bank_name: payoutForm.bankName,
            account_number: payoutForm.accountNumber,
            account_name: payoutForm.accountName,
          },
        },
      },
    );

    if (response.success) {
      showPayoutModal.value = false;
      showSuccessToast.value = true;

      // Reset form
      payoutForm.bankName = "";
      payoutForm.accountNumber = "";
      payoutForm.accountName = "";

      await fetchPayoutBalance();

      // Hide toast after 3 seconds
      setTimeout(() => {
        showSuccessToast.value = false;
      }, 3000);
    }
  } catch (err: any) {
    payoutError.value = err?.data?.message || "Failed to submit request";
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  fetchEarnings();
});
</script>
