<script setup lang="ts">
import { useStoreStore, type Store } from "~/stores/store";
import {
  useStoreLocator,
  type StoreWithDistanceKm,
} from "~/composables/useStoreLocator";

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  select: [store: Store];
}>();

const storeStore = useStoreStore();
const {
  stores,
  loading,
  error,
  getNearestStoreSuggestion,
  LAGOS_AREA_COORDINATES,
  fetchStores,
} = useStoreLocator();

const selectedStoreId = ref<string | null>(
  storeStore.selectedStore?.id || null,
);
const nearestStore = ref<StoreWithDistanceKm | null>(null);
const detectingLocation = ref(false);
const shoppingMode = ref<"delivery" | "pickup">(storeStore.shoppingMode);

const searchQuery = ref("");

const filteredStores = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return stores.value;

  return stores.value.filter((store) => {
    const name = store.name?.toLowerCase() ?? "";
    const address = store.address?.toLowerCase() ?? "";
    return name.includes(q) || address.includes(q);
  });
});

// Load stores on mount using public API
onMounted(async () => {
  await fetchStores();

  // Auto-detect nearest store if none selected
  if (!storeStore.isStoreSelected && stores.value.length > 0) {
    await detectNearestStore();
  }
});

// Detect nearest store using geolocation
const detectNearestStore = async () => {
  detectingLocation.value = true;

  try {
    const nearest = await getNearestStoreSuggestion("ikeja");
    if (nearest) {
      nearestStore.value = nearest;
      selectedStoreId.value = nearest.id;
    }
  } catch (e) {
    console.error("Failed to detect nearest store:", e);
  } finally {
    detectingLocation.value = false;
  }
};

// Check if store is currently open
const isStoreOpen = (store: Store): boolean => {
  const now = new Date();
  const dayOfWeek = now
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();
  const hours =
    store.operating_hours[dayOfWeek as keyof typeof store.operating_hours];

  if (!hours || !hours.isOpen) return false;

  const currentTime = now.getHours() * 60 + now.getMinutes();
  const [openHourStr, openMinStr] = hours.open.split(":");
  const [closeHourStr, closeMinStr] = hours.close.split(":");
  const openHour = Number(openHourStr);
  const openMin = Number(openMinStr);
  const closeHour = Number(closeHourStr);
  const closeMin = Number(closeMinStr);
  const openTime = (openHour ?? 0) * 60 + (openMin ?? 0);
  const closeTime = (closeHour ?? 0) * 60 + (closeMin ?? 0);

  return currentTime >= openTime && currentTime <= closeTime;
};

// Get store status text
const getStoreStatus = (store: Store): { text: string; color: string } => {
  if (isStoreOpen(store)) {
    return { text: "Open", color: "text-green-600" };
  }
  return { text: "Closed", color: "text-gray-500" };
};

// Get today's hours
const getTodayHours = (store: Store): string => {
  const dayOfWeek = new Date()
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();
  const hours =
    store.operating_hours[dayOfWeek as keyof typeof store.operating_hours];

  if (!hours || !hours.isOpen) return "Closed today";
  return `${hours.open} - ${hours.close}`;
};

// Handle store selection
const selectStore = (store: Store) => {
  selectedStoreId.value = store.id;
};

// Confirm selection
const confirmSelection = async () => {
  const store = stores.value.find((s) => s.id === selectedStoreId.value);
  if (!store) return;

  storeStore.setStore(store);
  storeStore.setShoppingMode(shoppingMode.value);

  emit("select", store);
  emit("update:modelValue", false);
};

// Close modal
const close = () => {
  emit("update:modelValue", false);
};

// Is flagship store
const isFlagship = (store: Store): boolean => store.is_flagship;
</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
  >
    <div class="w-full max-w-2xl bg-white rounded-xl shadow-xl overflow-hidden">
      <div
        class="px-6 py-4 border-b border-gray-200 flex items-center justify-between"
      >
        <div>
          <h2 class="text-xl font-bold text-gray-900">Select Your Store</h2>
          <p class="mt-1 text-sm text-gray-600">
            Choose a BokkuMart location to see available products
          </p>
        </div>
        <button @click="close" class="text-gray-400 hover:text-gray-600 p-1">
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

      <!-- Shopping Mode Toggle -->
      <div class="px-6 py-4 border-b border-gray-200">
        <label class="mb-2 block text-sm font-medium text-gray-700">
          How would you like to receive your order?
        </label>
        <div class="flex gap-3">
          <button
            :class="
              shoppingMode === 'delivery'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            "
            class="flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            @click="shoppingMode = 'delivery'"
          >
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
                d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
              />
            </svg>
            Delivery
          </button>
          <button
            :class="
              shoppingMode === 'pickup'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            "
            class="flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            @click="shoppingMode = 'pickup'"
          >
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
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            Click & Collect
          </button>
        </div>
      </div>

      <!-- Detect Location Button -->
      <div
        v-if="!storeStore.isStoreSelected"
        class="px-6 py-3 border-b border-gray-200"
      >
        <button
          :disabled="detectingLocation"
          class="rounded-lg bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors disabled:opacity-50 flex items-center gap-2"
          @click="detectNearestStore"
        >
          <svg
            v-if="!detectingLocation"
            class="w-4 h-4"
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
          <span v-if="detectingLocation">Detecting...</span>
          <span v-else>Find Nearest Store</span>
        </button>
        <p
          v-if="nearestStore"
          class="mt-2 text-sm text-green-600 flex items-center gap-1"
        >
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Found nearest store: {{ nearestStore.name }} ({{
            nearestStore.distanceFormatted
          }})
        </p>
      </div>

      <!-- Store List -->
      <div class="px-6 py-4 max-h-96 overflow-y-auto">
        <div class="mb-4">
          <div class="relative">
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Search stores..."
              class="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            />
            <svg
              class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        <div v-if="loading" class="space-y-4">
          <div
            v-for="i in 4"
            :key="i"
            class="h-24 w-full bg-gray-100 rounded-lg animate-pulse"
          />
        </div>

        <div
          v-else-if="error"
          class="rounded-lg bg-blue-50 p-4 text-blue-600 flex items-center gap-2"
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
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          {{ error }}
        </div>

        <div v-else class="space-y-3">
          <div
            v-if="filteredStores.length === 0"
            class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600"
          >
            No stores found.
          </div>
          <div
            v-for="store in filteredStores"
            :key="store.id"
            class="cursor-pointer rounded-xl border-2 p-4 transition-all"
            :class="[
              selectedStoreId === store.id
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300',
            ]"
            @click="selectStore(store)"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <h3 class="font-semibold text-gray-900">
                    {{ store.name }}
                  </h3>
                  <span
                    v-if="isFlagship(store)"
                    class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
                  >
                    Flagship
                  </span>
                </div>
                <p class="mt-1 text-sm text-gray-600">
                  {{ store.address }}
                </p>

                <div class="mt-2 flex items-center gap-4 text-sm">
                  <span
                    :class="getStoreStatus(store).color"
                    class="flex items-center gap-1"
                  >
                    <svg
                      v-if="isStoreOpen(store)"
                      class="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <svg
                      v-else
                      class="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {{ getStoreStatus(store).text }}
                  </span>
                  <span class="text-gray-500 flex items-center gap-1">
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
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {{ getTodayHours(store) }}
                  </span>
                </div>

                <p
                  v-if="shoppingMode === 'pickup' && store.pickup_instructions"
                  class="mt-2 text-xs text-gray-500 flex items-center gap-1"
                >
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
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {{ store.pickup_instructions }}
                </p>
              </div>

              <div v-if="selectedStoreId === store.id" class="ml-4">
                <svg
                  class="w-6 h-6 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
        <button
          @click="close"
          class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          :disabled="!selectedStoreId || storeStore.loading"
          class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          @click="confirmSelection"
        >
          {{
            storeStore.loading
              ? "Loading..."
              : shoppingMode === "delivery"
                ? "Continue with Delivery"
                : "Continue with Pickup"
          }}
        </button>
      </div>
    </div>
  </div>
</template>
