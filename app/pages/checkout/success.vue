<template>
  <div class="min-h-screen bg-gray-50">
    <AppHeader />

    <main class="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div class="text-center">
        <div
          class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100"
        >
          <svg
            class="h-10 w-10 text-green-600"
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
        <h1 class="mt-6 text-2xl font-bold text-gray-900">
          Payment Successful!
        </h1>
        <p class="mt-2 text-gray-600">
          Thank you for your order. We've sent a confirmation to your email.
        </p>
      </div>

      <!-- Confirmation Code -->
      <div
        class="mt-8 rounded-xl border-2 border-green-200 bg-green-50 p-6 text-center"
      >
        <div class="mb-4">
          <p class="font-bold text-green-900">Your Confirmation Code</p>
          <p class="text-sm text-green-700 mt-1">
            Use this code to verify your order
          </p>
        </div>

        <div class="mx-auto inline-block">
          <div
            class="bg-white rounded-lg px-8 py-4 shadow-sm border-2 border-green-300"
          >
            <p class="text-3xl font-bold text-green-700 tracking-wider">
              {{ confirmationCode || "..." }}
            </p>
          </div>
        </div>

        <p class="mt-4 text-sm text-gray-600">Order #{{ orderId }}</p>
        <p class="mt-1 text-xs text-gray-500">
          {{
            isPickupOrder
              ? "Show this code when picking up your order"
              : "Keep this code for your records"
          }}
        </p>
      </div>

      <!-- In-Store Upsell Section (BOPIS) -->
      <div
        v-if="isPickupOrder"
        class="mt-6 rounded-xl border-2 border-amber-200 bg-amber-50 p-5"
      >
        <div class="flex items-start gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 flex-shrink-0"
          >
            <svg
              class="h-5 w-5 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </div>
          <div class="flex-1">
            <p class="font-bold text-amber-900">Forgot something?</p>
            <p class="text-sm text-amber-800 mt-1">
              Grab these items at the counter for
              <span class="font-bold text-red-600">10% off</span> when you pick
              up your order!
            </p>

            <!-- Upsell Items -->
            <div class="mt-3 grid grid-cols-3 gap-2">
              <div
                v-for="item in upsellItems"
                :key="item.id"
                class="rounded-lg bg-white p-2 text-center border border-amber-200"
              >
                <div
                  class="h-12 w-12 mx-auto rounded bg-gray-100 flex items-center justify-center"
                >
                  <span class="text-xl">{{ item.emoji }}</span>
                </div>
                <p class="text-xs font-medium text-gray-900 mt-1 line-clamp-1">
                  {{ item.name }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ formatPrice(item.price) }}
                </p>
                <p class="text-xs font-bold text-red-600">
                  -{{ item.discount }}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-8 rounded-xl border-2 border-gray-200 bg-white p-6">
        <h2 class="font-bold text-gray-900">Order Details</h2>
        <div class="mt-4 space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Order ID</span>
            <span class="font-medium">{{ orderId || "Processing..." }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Confirmation Code</span>
            <span class="font-medium">{{ confirmationCode || "-" }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Store</span>
            <span class="font-medium">{{ cartStore.currentStoreName }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Items</span>
            <span class="font-medium">{{ orderItemsCount }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Total Paid</span>
            <span class="font-bold text-red-600">{{
              formatPrice(orderTotalPaid)
            }}</span>
          </div>
        </div>
      </div>

      <div class="mt-6 space-y-3">
        <NuxtLink
          to="/"
          class="w-full rounded-xl bg-red-600 py-3.5 text-sm font-bold text-white hover:bg-red-700 text-center inline-block"
        >
          Continue Shopping
        </NuxtLink>
        <NuxtLink
          to="/profile"
          class="w-full rounded-xl border-2 border-gray-200 bg-white py-3.5 text-sm font-bold text-gray-700 hover:bg-gray-50 text-center inline-block"
        >
          View My Orders
        </NuxtLink>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useCartStore } from "~/stores/useCartStore";
import { navigateTo } from "#app";

const cartStore = useCartStore();
const route = useRoute();
const orderId = ref(String(route.query.order || ""));

const isPickupOrder = ref(true);
const confirmationCode = ref("");
const isLoading = ref(false);

type OrderDetailsResponse = {
  order_id: string;
  items?: Array<{ quantity?: number }> | null;
  confirmation_code: string | null;
  delivery_method: "pickup" | "delivery" | string | null;
  status?: string | null;
  total_amount?: number | null;
  store_id?: string | null;
  store_name?: string | null;
  created_at?: string | null;
};

const orderItemsCount = ref(0);
const orderTotalPaid = ref(0);

async function fetchOrderDetails() {
  if (!orderId.value) return;

  isLoading.value = true;
  try {
    const res = await $fetch<OrderDetailsResponse>(
      `/api/orders/${orderId.value}`,
    );
    confirmationCode.value = String(res?.confirmation_code || "");
    isPickupOrder.value = String(res?.delivery_method || "") === "pickup";
    if (res?.store_name) {
      cartStore.currentStoreName = String(res.store_name);
    }
    orderItemsCount.value = Array.isArray(res?.items)
      ? res!.items.reduce(
          (sum: number, i: any) => sum + Number(i?.quantity || 0),
          0,
        )
      : 0;
    orderTotalPaid.value = Number(res?.total_amount || 0);
  } catch (e) {
    console.error("Failed to fetch order details:", e);
  } finally {
    isLoading.value = false;
  }
}

const upsellItems = ref([
  { id: 1, name: "Milk 1L", price: 1200, discount: 10, emoji: "🥛" },
  { id: 2, name: "Bread", price: 800, discount: 10, emoji: "🍞" },
  { id: 3, name: "Eggs (12)", price: 1500, discount: 10, emoji: "🥚" },
]);

function formatPrice(price: number): string {
  return "₦" + price.toLocaleString("en-NG");
}

onMounted(async () => {
  if (orderId.value) {
    cartStore.retainCartFor48Hours();
  }

  await fetchOrderDetails();
});
</script>
