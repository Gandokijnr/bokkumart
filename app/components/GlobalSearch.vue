<script setup lang="ts">
import { useBranchStore } from "~/stores/useBranchStore";
import { useCartStore } from "~/stores/useCartStore";
import { useProducts } from "~/composables/useProducts";

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  switchBranch: [branchId: string];
}>();

const branchStore = useBranchStore();
const cartStore = useCartStore();
const { searchProductWithBranchFallback, formatPrice } = useProducts();

// Search state
const searchQuery = ref("");
const isSearching = ref(false);
const addedProducts = ref<Set<string>>(new Set());
const searchResults = ref<{
  localProducts: any[];
  unavailableAtCurrentBranch: Array<{
    product: any;
    alternativeBranches: Array<{
      branchId: string;
      branchName: string;
      quantity: number;
    }>;
  }>;
}>({ localProducts: [], unavailableAtCurrentBranch: [] });

// Add to cart from search results
const addToCart = (product: any) => {
  cartStore.addItem({
    id: product.id,
    product_id: product.id,
    name: product.name,
    price: product.price,
    store_id: product.storeId,
    store_name: product.storeName,
    image_url: product.imageUrl,
    availableStock: product.availableStock,
    digitalBuffer: product.digitalBuffer,
  });

  // Show success state
  addedProducts.value.add(product.id);
  setTimeout(() => {
    addedProducts.value.delete(product.id);
  }, 2000);
};

// Debounce search
let searchTimeout: NodeJS.Timeout | null = null;
let activeRequestId = 0;

const handleSearch = async () => {
  if (!searchQuery.value.trim()) {
    searchResults.value = { localProducts: [], unavailableAtCurrentBranch: [] };
    return;
  }

  const requestId = ++activeRequestId;

  isSearching.value = true;

  try {
    const results = await searchProductWithBranchFallback(
      searchQuery.value.trim(),
    );
    if (requestId === activeRequestId) {
      searchResults.value = results;
    }
  } catch (err) {
    console.error("Search error:", err);
  } finally {
    if (requestId === activeRequestId) {
      isSearching.value = false;
    }
  }
};

const onInput = () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  activeRequestId += 1;
  searchTimeout = setTimeout(handleSearch, 300);
};

// Close modal
const close = () => {
  emit("update:modelValue", false);
  activeRequestId += 1;
  if (searchTimeout) {
    clearTimeout(searchTimeout);
    searchTimeout = null;
  }
  searchQuery.value = "";
  searchResults.value = { localProducts: [], unavailableAtCurrentBranch: [] };
};

// Handle branch switch from search results
const switchToBranch = (branchId: string) => {
  // Check for cart conflicts
  if (cartStore.items.length > 0 && cartStore.currentStoreId !== branchId) {
    emit("switchBranch", branchId);
    close();
    return;
  }

  // No conflict, switch directly
  const result = branchStore.switchBranch(branchId);
  if (result.success) {
    if (result.requiresCartClear && cartStore.items.length > 0) {
      cartStore.clearCart();
    }
    close();
    window.location.reload();
  }
};

// Handle escape key
onMounted(() => {
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && props.modelValue) {
      close();
    }
  };
  window.addEventListener("keydown", handleKeydown);
  onUnmounted(() => {
    window.removeEventListener("keydown", handleKeydown);
  });
});

// Focus input when modal opens
const searchInput = ref<HTMLInputElement>();
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      nextTick(() => {
        searchInput.value?.focus();
      });
    }
  },
);
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        @click.self="close"
      >
        <div class="mx-auto max-w-2xl pt-20 px-4">
          <div
            class="bg-white rounded-2xl shadow-2xl overflow-hidden"
            @click.stop
          >
            <!-- Search Input -->
            <div class="p-4 border-b border-gray-200">
              <div class="relative">
                <svg
                  class="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
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
                <input
                  ref="searchInput"
                  v-model="searchQuery"
                  type="text"
                  placeholder="Search for rice, fruits, beverages..."
                  class="w-full rounded-xl border-2 border-gray-200 bg-gray-50 py-3.5 pl-12 pr-4 text-base outline-none transition focus:border-blue-600 focus:bg-white"
                  @input="onInput"
                />
                <button
                  v-if="searchQuery"
                  @click="
                    searchQuery = '';
                    searchResults = {
                      localProducts: [],
                      unavailableAtCurrentBranch: [],
                    };
                  "
                  class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg
                    class="h-5 w-5"
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

            <!-- Search Results -->
            <div class="max-h-[60vh] overflow-y-auto">
              <!-- Loading State -->
              <div v-if="isSearching" class="p-8 text-center">
                <svg
                  class="h-8 w-8 animate-spin text-blue-600 mx-auto"
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
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <p class="mt-2 text-sm text-gray-600">Searching...</p>
              </div>

              <!-- Empty State -->
              <div v-else-if="!searchQuery" class="p-8 text-center">
                <div
                  class="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4"
                >
                  <svg
                    class="h-8 w-8 text-gray-400"
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
                <p class="text-gray-600">Type to search for products</p>
                <p class="text-sm text-gray-500 mt-1">
                  Searching at {{ branchStore.activeBranchName }}
                </p>
              </div>

              <!-- No Results -->
              <div
                v-else-if="
                  searchResults.localProducts.length === 0 &&
                  searchResults.unavailableAtCurrentBranch.length === 0
                "
                class="p-8 text-center"
              >
                <div
                  class="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4"
                >
                  <svg
                    class="h-8 w-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p class="text-gray-900 font-medium">No products found</p>
                <p class="text-sm text-gray-500 mt-1">
                  Try a different search term
                </p>
              </div>

              <!-- Results Content -->
              <div v-else>
                <!-- Available at Current Branch -->
                <div v-if="searchResults.localProducts.length > 0" class="p-4">
                  <h3
                    class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3"
                  >
                    Available at {{ branchStore.activeBranchName }}
                  </h3>
                  <div class="space-y-3">
                    <div
                      v-for="product in searchResults.localProducts"
                      :key="product.id"
                      class="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 shadow-sm"
                    >
                      <img
                        :src="product.imageUrl || '/placeholder-basket.svg'"
                        :alt="product.name"
                        class="w-16 h-16 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                      />
                      <div class="flex-1 min-w-0">
                        <p class="font-medium text-gray-900 truncate">
                          {{ product.name }}
                        </p>
                        <p class="text-sm text-gray-500">
                          {{ formatPrice(product.price) }}
                        </p>
                        <p
                          v-if="!product.isAvailable"
                          class="text-xs text-blue-500 mt-0.5"
                        >
                          Out of stock
                        </p>
                      </div>
                      <!-- Add to Cart Button -->
                      <button
                        v-if="product.isAvailable"
                        @click="addToCart(product)"
                        class="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all"
                        :class="{
                          'bg-green-600 hover:bg-green-700': addedProducts.has(
                            product.id,
                          ),
                        }"
                      >
                        <svg
                          v-if="!addedProducts.has(product.id)"
                          class="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                        <svg
                          v-else
                          class="h-5 w-5"
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
                      </button>
                      <div
                        v-else
                        class="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-400"
                      >
                        <svg
                          class="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- GLOBAL SEARCH EXCEPTION -->
                <!-- Available at Other Branches -->
                <div
                  v-if="searchResults.unavailableAtCurrentBranch.length > 0"
                  class="border-t border-gray-200"
                >
                  <div class="p-4">
                    <div class="flex items-center gap-2 mb-3">
                      <svg
                        class="h-4 w-4 text-amber-500"
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
                      <h3
                        class="text-xs font-semibold text-amber-700 uppercase tracking-wider"
                      >
                        Available at Other Stores
                      </h3>
                    </div>

                    <div class="space-y-4">
                      <div
                        v-for="item in searchResults.unavailableAtCurrentBranch"
                        :key="item.product.id"
                        class="bg-amber-50 border border-amber-200 rounded-xl p-4"
                      >
                        <div class="flex items-start gap-3 mb-3">
                          <img
                            :src="
                              item.product.imageUrl || '/placeholder-basket.svg'
                            "
                            :alt="item.product.name"
                            class="w-14 h-14 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                          />
                          <div>
                            <p class="font-medium text-gray-900">
                              {{ item.product.name }}
                            </p>
                            <p class="text-sm text-gray-600">
                              {{ formatPrice(item.product.price) }}
                            </p>
                            <p class="text-xs text-amber-700 mt-1">
                              Unavailable at {{ branchStore.activeBranchName }}
                            </p>
                          </div>
                        </div>

                        <!-- Alternative Branches -->
                        <div class="space-y-2">
                          <p class="text-xs font-medium text-gray-500">
                            Available at:
                          </p>
                          <div class="flex flex-wrap gap-2">
                            <button
                              v-for="branch in item.alternativeBranches.slice(
                                0,
                                3,
                              )"
                              :key="branch.branchId"
                              @click="switchToBranch(branch.branchId)"
                              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-sm font-medium text-amber-700 hover:bg-amber-100 hover:border-amber-400 transition-colors"
                            >
                              <svg
                                class="h-3.5 w-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="2"
                                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                />
                              </svg>
                              {{ branch.branchName }}
                              <span class="text-amber-600"
                                >({{ branch.quantity }} in stock)</span
                              >
                            </button>
                          </div>

                          <!-- Tip Message -->
                          <div
                            class="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200"
                          >
                            <p
                              class="text-xs text-blue-700 flex items-start gap-1.5"
                            >
                              <svg
                                class="h-3.5 w-3.5 flex-shrink-0 mt-0.5"
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
                              <span>
                                This item is unavailable at
                                {{ branchStore.activeBranchName }}, but is in
                                stock at our
                                {{ item.alternativeBranches[0]?.branchName }}
                                branch.
                                <button
                                  @click="
                                    switchToBranch(
                                      item.alternativeBranches[0]!.branchId,
                                    )
                                  "
                                  class="font-semibold underline hover:no-underline"
                                >
                                  Switch to
                                  {{ item.alternativeBranches[0]?.branchName }}
                                </button>
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="p-3 border-t border-gray-200 bg-gray-50 text-center">
              <p class="text-xs text-gray-500">
                Press
                <kbd
                  class="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-gray-700 font-sans"
                  >ESC</kbd
                >
                to close
              </p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
