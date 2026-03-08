<template>
  <div class="min-h-screen bg-gray-50">
    <AppHeader />

    <main class="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div class="text-center">
        <div
          class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100"
        >
          <svg
            class="h-10 w-10 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
        </div>
        <h1 class="mt-6 text-2xl font-bold text-gray-900">
          Online Payment Only
        </h1>
        <p class="mt-2 text-gray-600">
          To ensure priority packing and safety, HomeAffairs currently accepts
          secure online payments only.
        </p>
      </div>

      <!-- Order Details -->
      <div class="mt-8 rounded-xl border-2 border-gray-200 bg-white p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-bold text-gray-900">
            Order #{{ orderId?.slice(-6) }}
          </h2>
          <span
            class="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800"
          >
            Pending Confirmation
          </span>
        </div>

        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">Payment Method</span>
            <span class="font-medium">Pay on Delivery</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Total Amount</span>
            <span class="font-bold">{{ formatPrice(orderTotal) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Contact Number</span>
            <span class="font-medium">{{ orderPhone }}</span>
          </div>
        </div>
      </div>

      <!-- What to Expect -->
      <div class="mt-6 rounded-xl border-2 border-blue-200 bg-blue-50 p-5">
        <h3 class="font-bold text-blue-900 mb-3">What happens next?</h3>
        <div class="space-y-3 text-sm text-blue-800">
          <div class="flex items-start gap-3">
            <div
              class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-200 flex-shrink-0 text-xs font-bold"
            >
              1
            </div>
            <p>
              Our representative will call you within 30 minutes to confirm your
              order
            </p>
          </div>
          <div class="flex items-start gap-3">
            <div
              class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-200 flex-shrink-0 text-xs font-bold"
            >
              2
            </div>
            <p>
              Confirm your order details and delivery address with the
              representative
            </p>
          </div>
          <div class="flex items-start gap-3">
            <div
              class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-200 flex-shrink-0 text-xs font-bold"
            >
              3
            </div>
            <p>Once confirmed, we'll start preparing your order for delivery</p>
          </div>
        </div>
      </div>

      <!-- Important Notes -->
      <div class="mt-6 rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
        <div class="flex items-start gap-3">
          <svg
            class="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div class="text-sm text-amber-800">
            <p class="font-bold text-amber-900">Important</p>
            <p>
              Please ensure your phone is available. Orders not confirmed within
              30 minutes will be automatically cancelled.
            </p>
          </div>
        </div>
      </div>

      <!-- Check Status Button -->
      <div class="mt-6 space-y-3">
        <button
          @click="checkOrderStatus"
          :disabled="checking"
          class="w-full rounded-xl bg-red-600 py-4 text-sm font-bold text-white hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
        >
          <span v-if="checking" class="flex items-center justify-center gap-2">
            <svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Checking...
          </span>
          <span v-else>Check Order Status</span>
        </button>

        <NuxtLink
          to="/profile"
          class="w-full rounded-xl border-2 border-gray-200 bg-white py-4 text-sm font-bold text-gray-700 hover:bg-gray-50 text-center inline-block"
        >
          View My Orders
        </NuxtLink>
      </div>

      <!-- Confirmation Modal -->
      <div
        v-if="isConfirmed"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      >
        <div class="w-full max-w-sm rounded-2xl bg-white p-6 text-center">
          <div
            class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100"
          >
            <svg
              class="h-8 w-8 text-green-600"
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
          </div>
          <h3 class="mt-4 text-lg font-bold text-gray-900">Order Confirmed!</h3>
          <p class="mt-2 text-sm text-gray-600">
            Your order has been confirmed. We're preparing it for delivery now.
          </p>
          <NuxtLink
            to="/profile"
            class="mt-6 w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-700 text-center inline-block"
          >
            View Order Status
          </NuxtLink>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { navigateTo } from "#app";

const route = useRoute();
const supabase = useSupabaseClient();

const orderId = ref(route.query.order as string);
const orderPhone = ref("");
const orderTotal = ref(0);
const checking = ref(false);
const isConfirmed = ref(false);

function formatPrice(price: number): string {
  return "₦" + price?.toLocaleString("en-NG") || "0";
}

async function loadOrderDetails() {
  if (!orderId.value) return;

  const { data } = await supabase
    .from("orders")
    .select("contact_phone, total_amount, confirmation_status")
    .eq("id", orderId.value)
    .single();

  if (data) {
    orderPhone.value = (data as any).contact_phone || "";
    orderTotal.value = (data as any).total_amount || 0;

    // If already confirmed, show success modal
    if ((data as any).confirmation_status === "confirmed_by_phone") {
      isConfirmed.value = true;
    }
  }
}

async function checkOrderStatus() {
  checking.value = true;
  await loadOrderDetails();
  checking.value = false;

  if (isConfirmed.value) {
    // Already handled in loadOrderDetails
  } else {
    alert(
      "Your order is still pending confirmation. Please wait for our call.",
    );
  }
}

// Poll for status updates every 10 seconds
let pollInterval: NodeJS.Timeout;

onMounted(() => {
  navigateTo("/checkout");
  loadOrderDetails();

  pollInterval = setInterval(async () => {
    const { data } = await supabase
      .from("orders")
      .select("confirmation_status")
      .eq("id", orderId.value)
      .single();

    if (data && (data as any).confirmation_status === "confirmed_by_phone") {
      isConfirmed.value = true;
      clearInterval(pollInterval);
    }
  }, 10000);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});
</script>
