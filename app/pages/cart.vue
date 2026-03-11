<template>
  <div class="min-h-screen bg-gray-50 overflow-x-hidden">
    <AppHeader />

    <main
      class="mx-auto w-full max-w-7xl px-4 py-4 pb-32 sm:px-6 lg:py-8 lg:pb-8"
    >
      <!-- Client-Only Cart Content -->
      <ClientOnly>
        <template #fallback>
          <!-- SSR-safe loading state -->
          <div class="flex min-h-[400px] items-center justify-center">
            <div class="text-center">
              <div
                class="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-red-200 border-t-red-600 mx-auto"
              ></div>
              <p class="text-gray-500">Loading your cart...</p>
            </div>
          </div>
        </template>

        <!-- Page Title with Count -->
        <div
          class="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-2 sm:mb-6"
        >
          <h1
            class="min-w-0 text-xl font-bold text-gray-900 sm:text-2xl lg:text-3xl"
          >
            <span
              v-if="cartStore.cartCount > 0"
              class="ml-2 text-base font-medium text-gray-500 sm:text-lg"
            >
              ({{ cartStore.cartCount }}
              {{ cartStore.cartCount === 1 ? "item" : "items" }})
            </span>
          </h1>
          <button
            v-if="cartStore.items.length > 0"
            @click="showClearConfirm = true"
            class="text-xs font-medium text-red-500 hover:text-red-700 sm:text-sm"
          >
            Clear Cart
          </button>
        </div>

        <!-- Empty Cart State -->
        <EmptyCartState
          v-if="cartStore.items.length === 0"
          :categories="categories"
          :get-category-icon="getCategoryIcon"
        />

        <!-- Cart Content -->
        <div v-else class="grid min-w-0 gap-6 lg:grid-cols-3">
          <!-- Left Column: Items -->
          <div class="order-2 min-w-0 space-y-4 lg:order-1 lg:col-span-2">
            <!-- Store Context Header -->
            <StoreHeader
              :store-name="cartStore.currentStoreName"
              :time-remaining="reservationTimeRemaining"
            />

            <!-- Cart Items List -->
            <div class="space-y-3 sm:space-y-4">
              <CartItem
                v-for="item in cartStore.items"
                :key="item.id"
                :item="item"
                @update-quantity="handleUpdateQuantity"
                @remove="removeItem"
              />
            </div>

            <!-- Continue Shopping Link -->
            <NuxtLink
              to="/#categories"
              class="flex items-center gap-2 text-sm font-medium text-red-600 transition-colors hover:text-red-700 sm:text-base"
            >
              <svg
                class="h-4 w-4 rotate-180 sm:h-5 sm:w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
              Continue Shopping
            </NuxtLink>

            <!-- Cross-Sell Section -->
            <CrossSellProducts
              :products="crossSellProducts"
              @add="addCrossSellItem"
            />
          </div>

          <!-- Right Column: Order Summary -->
          <div class="order-1 min-w-0 w-full lg:order-2">
            <CartSummary
              :item-count="cartStore.cartCount"
              :subtotal="cartStore.cartSubtotal"
              :logistics-bundle-fee="cartStore.logisticsBundleFee"
              :handling-fee="cartStore.handlingFee"
              :total="displayTotal"
              :delivery-details="cartStore.deliveryDetails"
              :store-name="cartStore.currentStoreName || 'HomeAffairs Store'"
              v-model:order-note="orderNote"
              :has-out-of-stock-items="hasOutOfStockItems"
              @checkout="proceedToCheckout"
            />
          </div>
        </div>

        <!-- Mobile Sticky Checkout Bar -->
        <MobileCheckoutBar
          :show="cartStore.items.length > 0"
          :total="displayTotal"
          :disabled="hasOutOfStockItems"
          @checkout="proceedToCheckout"
        />

        <!-- Clear Cart Confirmation Modal -->
        <ClearCartModal
          :show="showClearConfirm"
          @cancel="showClearConfirm = false"
          @confirm="clearCart"
        />
      </ClientOnly>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useCartStore } from "~/stores/useCartStore";
import { useCategories } from "~/composables/useCategories";
import { useFees } from "~/composables/useFees";
import { computed, ref, onMounted, onUnmounted } from "vue";

// Page meta
definePageMeta({
  pageTransition: {
    name: "slide-left",
    mode: "out-in",
  },
});

useSeoMeta({
  title: "Shopping Cart - HomeAffairs",
  description:
    "Review your cart items and proceed to checkout. Fresh groceries delivered to your doorstep in Lagos.",
  ogTitle: "Shopping Cart - HomeAffairs",
  ogDescription:
    "Review your cart items and proceed to checkout. Fresh groceries delivered to your doorstep in Lagos.",
});

// Stores and composables
const cartStore = useCartStore();
const { categories, fetchCategories, getCategoryIcon } = useCategories();
const supabase = useSupabaseClient();
const user = useSupabaseUser();

const cartToken = ref<string | null>(null);
const cartHeaders = computed((): HeadersInit | undefined => {
  return cartToken.value
    ? ({ Authorization: `Bearer ${cartToken.value}` } as Record<string, string>)
    : undefined;
});

const {
  data: serverCartRes,
  error: serverCartError,
  execute: fetchServerCart,
} = useFetch("/api/cart", {
  immediate: false,
  headers: cartHeaders,
});

// State
const orderNote = ref("");
const deliveryCalculated = ref(false);
const showClearConfirm = ref(false);
const reservationTimeRemaining = ref(0);
let reservationTimer: ReturnType<typeof setInterval> | null = null;

// Cross-sell products
const crossSellProducts = ref<
  Array<{
    id: string;
    product_id: string;
    name: string;
    price: number;
    image_url?: string;
    category?: string;
  }>
>([]);

// Computed values
const hasOutOfStockItems = computed(() => {
  return cartStore.items.some((item) => item.quantity > item.max_quantity);
});

const displayTotal = computed(() => {
  const method = cartStore.deliveryDetails?.method;
  if (!method) return cartStore.cartSubtotal;

  if (method === "pickup") {
    return cartStore.cartSubtotal + cartStore.handlingFee;
  }

  return cartStore.finalTotal;
});

// Methods
async function persistCart() {
  try {
    const userId = (user.value as any)?.id || (user.value as any)?.sub;
    if (!userId) return;
    await cartStore.saveToDatabase(supabase);
  } catch {
    // ignore
  }
}

async function handleUpdateQuantity(id: string, quantity: number) {
  const result = cartStore.updateQuantity(id, quantity);
  if (!result.success) {
    alert(result.error);
    return;
  }

  await persistCart();
}

async function removeItem(id: string) {
  cartStore.removeItem(id);

  await persistCart();
}

async function clearCart() {
  cartStore.clearCart();
  showClearConfirm.value = false;

  await persistCart();
}

function calculateDelivery() {
  deliveryCalculated.value = true;
}

async function loadCrossSellProducts() {
  const supabase = useSupabaseClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, price, image_url, category_id")
    .eq("is_active", true)
    .limit(8);

  if (data) {
    const cartProductIds = new Set(cartStore.items.map((i) => i.product_id));
    crossSellProducts.value = data
      .filter((p: any) => !cartProductIds.has(p.id))
      .slice(0, 5)
      .map((p: any) => ({
        id: p.id,
        product_id: p.id,
        name: p.name,
        price: p.price,
        image_url: p.image_url,
        category: p.category_id,
      }));
  }
}

function addCrossSellItem(product: (typeof crossSellProducts.value)[0]) {
  const supabase = useSupabaseClient();
  supabase
    .from("products")
    .select("*, store_inventory(*)")
    .eq("id", product.id)
    .single()
    .then(async ({ data }) => {
      const productData = data as {
        id: string;
        name: string;
        price: number;
        image_url: string | null;
        store_inventory: Array<{
          store_id: string;
          store_price: number | null;
          available_stock: number;
          digital_buffer: number;
        }>;
      } | null;
      if (
        productData &&
        productData.store_inventory &&
        productData.store_inventory.length > 0
      ) {
        const storeInfo = productData.store_inventory[0]!;
        const result = await cartStore.addItem(
          {
            id: productData.id,
            product_id: productData.id,
            name: productData.name,
            price: storeInfo.store_price || productData.price,
            store_id: storeInfo.store_id,
            store_name: cartStore.currentStoreName,
            image_url: productData.image_url ?? undefined,
            availableStock:
              storeInfo.available_stock - storeInfo.digital_buffer,
            digitalBuffer: storeInfo.digital_buffer,
          },
          1,
        );
        if (!result.success) {
          alert(result.error);
        }
      }
    });
}

function proceedToCheckout() {
  if (hasOutOfStockItems.value) return;
  navigateTo("/checkout");
}

function updateReservationTimer() {
  reservationTimeRemaining.value = cartStore.reservationTimeRemaining;
}

// Initialize
onMounted(async () => {
  updateReservationTimer();
  reservationTimer = setInterval(updateReservationTimer, 1000);

  if (cartStore.deliveryDetails) {
    deliveryCalculated.value = true;
  }

  await fetchCategories();
  if (cartStore.items.length > 0) {
    await loadCrossSellProducts();
  }

  const userId = (user.value as any)?.id || (user.value as any)?.sub;
  if (userId) {
    cartStore.pruneIfExpired();
  }
});

onUnmounted(() => {
  if (reservationTimer) {
    clearInterval(reservationTimer);
  }
});
</script>

<style scoped>
/* Vue page transition classes - required by definePageMeta */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.3s ease-out;
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
</style>
