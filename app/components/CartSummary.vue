<template>
  <div
    class="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm sm:p-5"
  >
    <h2 class="mb-4 text-base font-bold text-gray-900 sm:mb-5 sm:text-lg">
      Order Summary
    </h2>

    <!-- Summary Breakdown -->
    <div class="space-y-2.5 sm:space-y-3">
      <div class="flex justify-between text-xs sm:text-sm">
        <span class="text-gray-600">Subtotal ({{ itemCount }} items)</span>
        <span class="font-medium text-gray-900">{{
          formatPrice(subtotal)
        }}</span>
      </div>

      <!-- Delivery Fee -->
      <div class="flex justify-between text-xs sm:text-sm">
        <span class="text-gray-600">Delivery Fee</span>
        <span v-if="deliveryCalculated" class="font-medium text-gray-900">{{
          formatPrice(deliveryFee)
        }}</span>
        <button
          v-else
          @click="$emit('calculateDelivery')"
          class="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white"
        >
          Calculate
        </button>
      </div>

      <!-- Service Fee -->
      <div class="flex justify-between text-xs sm:text-sm">
        <span class="text-gray-600">Service Fee</span>
        <span class="font-medium text-gray-900">{{
          formatPrice(serviceFee)
        }}</span>
      </div>

      <div class="border-t-2 border-gray-100 pt-2.5 sm:pt-3">
        <div class="flex justify-between">
          <span class="text-sm font-bold text-gray-900 sm:text-base"
            >Total</span
          >
          <span class="text-lg font-bold text-red-600 sm:text-xl">{{
            formatPrice(total)
          }}</span>
        </div>
        <p class="mt-1 text-right text-xs text-gray-500">
          Includes VAT where applicable
        </p>
      </div>
    </div>

    <!-- Delivery Location Preview -->
    <div
      v-if="deliveryDetails?.method"
      class="mt-4 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs sm:mt-5 sm:p-3 sm:text-sm"
    >
      <div class="flex items-start gap-2">
        <svg
          class="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <div>
          <p class="font-medium text-gray-900">
            {{
              deliveryDetails.method === "pickup"
                ? "Store Pickup"
                : "Home Delivery"
            }}
          </p>
          <p class="text-gray-600">
            {{
              deliveryDetails.method === "pickup"
                ? storeName
                : deliveryDetails.address?.area || "Area not set"
            }}
          </p>
        </div>
      </div>
    </div>

    <!-- Order Note -->
    <div class="mt-4 sm:mt-5">
      <label class="mb-2 block text-xs font-medium text-gray-700 sm:text-sm">
        Specific Instructions
        <span class="text-gray-400">(Optional)</span>
      </label>
      <textarea
        :value="orderNote"
        @input="
          $emit(
            'update:orderNote',
            ($event.target as HTMLTextAreaElement).value,
          )
        "
        rows="3"
        placeholder="e.g., Please pick firm tomatoes, Call upon arrival..."
        class="w-full resize-none rounded-lg border-2 border-gray-200 p-2.5 text-xs focus:border-red-600 focus:outline-none sm:p-3 sm:text-sm"
      ></textarea>
    </div>

    <!-- Stock Validation Warning -->
    <div
      v-if="hasOutOfStockItems"
      class="mt-3 flex items-start gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 sm:mt-4 sm:p-3 sm:text-sm"
    >
      <svg
        class="mt-0.5 h-4 w-4 flex-shrink-0"
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
      <span
        >Some items are out of stock. Please adjust quantities to proceed.</span
      >
    </div>

    <!-- Trust Badges -->
    <div
      class="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-gray-500 sm:mt-4 sm:gap-4"
    >
      <span class="flex items-center gap-1">
        <svg
          class="h-3.5 w-3.5 text-green-500 sm:h-4 sm:w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
        Secure Payment
      </span>
      <span class="flex items-center gap-1">
        <svg
          class="h-3.5 w-3.5 text-green-500 sm:h-4 sm:w-4"
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
        10min Reservation
      </span>
    </div>

    <!-- Checkout Button (Desktop Only) -->
    <button
      @click="$emit('checkout')"
      :disabled="hasOutOfStockItems"
      class="mt-5 hidden w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-red-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 lg:block"
    >
      Proceed to Checkout
      <span class="ml-2">→</span>
    </button>
  </div>
</template>

<script setup lang="ts">
interface DeliveryDetails {
  method?: "pickup" | "delivery";
  address?: {
    area?: string;
  };
}

const props = defineProps<{
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
  deliveryCalculated: boolean;
  deliveryDetails?: DeliveryDetails | null;
  storeName: string;
  orderNote: string;
  hasOutOfStockItems: boolean;
}>();

const emit = defineEmits<{
  calculateDelivery: [];
  "update:orderNote": [value: string];
  checkout: [];
}>();

function formatPrice(price: number): string {
  return "₦" + price.toLocaleString("en-NG");
}
</script>
