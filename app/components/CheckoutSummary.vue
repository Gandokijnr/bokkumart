<script setup lang="ts">
import { computed, ref, watch, onMounted } from "vue";
import {
  calculateDeliveryFee,
  formatDeliveryFee,
  formatDistance,
  type DeliveryCalculation,
} from "~/utils/delivery";

interface Props {
  cartTotal: number;
  storeId?: string;
  userAddress?: {
    lat: number;
    lng: number;
    address: string;
  } | null;
  productId?: string; // For Ogudu hub stock-based selection
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "update:deliveryFee", fee: number): void;
  (e: "update:selectedStore", store: any): void;
  (e: "outsideZone", message: string): void;
}>();

// State
const loading = ref(false);
const error = ref<string | null>(null);
const deliveryCalculation = ref<DeliveryCalculation | null>(null);
const selectedStore = ref<any>(null);
const alternatives = ref<any[]>([]);

// Computed
const deliveryFee = computed(() => deliveryCalculation.value?.finalFee || 0);
const baseFee = computed(() => deliveryCalculation.value?.baseFee || 0);
const distance = computed(() => deliveryCalculation.value?.distance || 0);
const isOutsideZone = computed(
  () => deliveryCalculation.value?.outsideZone || false
);
const congestionMultiplier = computed(
  () => deliveryCalculation.value?.congestionMultiplier || 1.0
);
const hasCongestionSurcharge = computed(() => congestionMultiplier.value > 1.0);

const subtotal = computed(() => props.cartTotal);
const total = computed(() => subtotal.value + deliveryFee.value);

const formattedDeliveryFee = computed(() =>
  isOutsideZone.value
    ? "Contact us"
    : formatDeliveryFee(deliveryCalculation.value?.finalFee || 0)
);

const formattedDistance = computed(() =>
  deliveryCalculation.value
    ? formatDistance(deliveryCalculation.value.distance)
    : "--"
);

// Calculate delivery fee from API
async function calculateDelivery() {
  if (!props.userAddress || !props.userAddress.lat || !props.userAddress.lng) {
    error.value = "Please provide a delivery address";
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const response = await $fetch<{
      success: boolean;
      selectedStore: any;
      delivery: DeliveryCalculation & {
        distanceFormatted: string;
        feeFormatted: string | null;
      };
      alternatives: any[];
    }>("/api/delivery/calculate", {
      method: "POST",
      body: {
        userLat: props.userAddress.lat,
        userLng: props.userAddress.lng,
        storeId: props.storeId,
        productId: props.productId,
      },
    });

    if (response.success) {
      deliveryCalculation.value = response.delivery;
      selectedStore.value = response.selectedStore;
      alternatives.value = response.alternatives;

      // Emit updates
      emit("update:deliveryFee", response.delivery.finalFee);
      emit("update:selectedStore", response.selectedStore);

      // Handle outside zone
      if (response.delivery.outsideZone) {
        emit(
          "outsideZone",
          response.delivery.message ||
            "Address outside standard delivery zone. Surcharge may apply."
        );
      }
    }
  } catch (err: any) {
    console.error("[CheckoutSummary] Delivery calculation error:", err);
    error.value =
      err?.data?.message ||
      err?.message ||
      "Failed to calculate delivery fee. Please try again.";
  } finally {
    loading.value = false;
  }
}

// Watch for changes that require recalculation
watch(
  () => [props.userAddress?.lat, props.userAddress?.lng, props.storeId],
  () => {
    if (props.userAddress?.lat && props.userAddress?.lng) {
      calculateDelivery();
    }
  },
  { immediate: true }
);

// Select alternative store
async function selectAlternativeStore(storeId: string) {
  if (!props.userAddress) return;

  loading.value = true;
  try {
    const response = await $fetch<{
      success: boolean;
      selectedStore: any;
      delivery: DeliveryCalculation & {
        distanceFormatted: string;
        feeFormatted: string | null;
      };
      alternatives: any[];
    }>("/api/delivery/calculate", {
      method: "POST",
      body: {
        userLat: props.userAddress.lat,
        userLng: props.userAddress.lng,
        storeId: storeId,
        productId: props.productId,
      },
    });

    if (response.success) {
      deliveryCalculation.value = response.delivery;
      selectedStore.value = response.selectedStore;
      alternatives.value = response.alternatives;

      emit("update:deliveryFee", response.delivery.finalFee);
      emit("update:selectedStore", response.selectedStore);
    }
  } catch (err: any) {
    error.value = err?.data?.message || "Failed to switch store";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="rounded-xl border border-gray-200 bg-white p-4">
    <h3 class="mb-4 text-lg font-semibold text-gray-900">Order Summary</h3>

    <!-- Error Message -->
    <div
      v-if="error"
      class="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700"
    >
      {{ error }}
    </div>

    <!-- Outside Zone Warning -->
    <div
      v-if="isOutsideZone"
      class="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
    >
      <p class="font-medium">
        {{ deliveryCalculation?.message }}
      </p>
      <p class="mt-1 text-xs">
        Please contact us for special delivery arrangements.
      </p>
    </div>

    <!-- Selected Store -->
    <div v-if="selectedStore" class="mb-4 rounded-lg bg-gray-50 p-3">
      <p class="text-xs text-gray-500">Fulfilled by</p>
      <p class="font-medium text-gray-900">{{ selectedStore.name }}</p>
      <p class="text-xs text-gray-600">{{ selectedStore.address }}</p>
      <p class="mt-1 text-xs text-gray-500">
        Distance: {{ formattedDistance }}
      </p>
    </div>

    <!-- Delivery Details -->
    <div class="space-y-3 border-t border-gray-100 pt-3">
      <!-- Subtotal -->
      <div class="flex justify-between text-sm">
        <span class="text-gray-600">Subtotal</span>
        <span class="font-medium text-gray-900">
          {{ formatDeliveryFee(subtotal) }}
        </span>
      </div>

      <!-- Delivery Fee -->
      <div class="flex justify-between text-sm">
        <div class="flex items-center gap-1">
          <span class="text-gray-600">Delivery Fee</span>
          <span
            v-if="loading"
            class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-red-600"
          />
        </div>
        <div class="text-right">
          <span
            :class="[
              'font-medium',
              isOutsideZone ? 'text-amber-600' : 'text-gray-900',
            ]"
          >
            {{ formattedDeliveryFee }}
          </span>
          <!-- Show breakdown if there's congestion surcharge -->
          <div v-if="hasCongestionSurcharge && !isOutsideZone" class="text-xs">
            <span class="text-gray-500">
              Base: {{ formatDeliveryFee(baseFee) }}
            </span>
            <span class="ml-1 text-amber-600">
              (+{{ Math.round((congestionMultiplier - 1) * 100) }}% traffic)
            </span>
          </div>
        </div>
      </div>

      <!-- Congestion Badge -->
      <div
        v-if="hasCongestionSurcharge && !isOutsideZone"
        class="flex items-center gap-1 text-xs text-amber-700"
      >
        <svg
          class="h-3 w-3"
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
        <span>Traffic surcharge applied (Lagos rush hour)</span>
      </div>

      <!-- Tier Info -->
      <div
        v-if="deliveryCalculation && !isOutsideZone"
        class="flex items-center gap-1 text-xs text-gray-500"
      >
        <svg
          class="h-3 w-3"
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
        <span>{{ deliveryCalculation.tierLabel }} delivery zone</span>
      </div>

      <!-- Total -->
      <div class="flex justify-between border-t border-gray-100 pt-3">
        <span class="font-semibold text-gray-900">Total</span>
        <span class="font-bold text-lg text-blue-600">
          {{ formatDeliveryFee(total) }}
        </span>
      </div>
    </div>

    <!-- Alternative Stores -->
    <div
      v-if="alternatives.length > 0 && !isOutsideZone"
      class="mt-4 border-t border-gray-100 pt-3"
    >
      <p class="mb-2 text-xs font-medium text-gray-500">
        Other nearby stores:
      </p>
      <div class="space-y-2">
        <button
          v-for="alt in alternatives"
          :key="alt.store.id"
          @click="selectAlternativeStore(alt.store.id)"
          :disabled="loading"
          class="flex w-full items-center justify-between rounded-lg border border-gray-200 p-2 text-left text-xs transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <div>
            <p class="font-medium text-gray-900">{{ alt.store.name }}</p>
            <p class="text-gray-500">{{ alt.distanceFormatted }} away</p>
          </div>
          <span
            :class="[
              'font-medium',
              alt.outsideZone ? 'text-amber-600' : 'text-gray-900',
            ]"
          >
            {{ alt.outsideZone ? "Unavailable" : alt.feeFormatted }}
          </span>
        </button>
      </div>
    </div>

    <!-- Geolocation Hint -->
    <div
      v-if="!userAddress && !loading"
      class="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700"
    >
      <p class="flex items-center gap-1">
        <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Enter your delivery address to calculate shipping costs</span>
      </p>
    </div>
  </div>
</template>
