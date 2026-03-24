<template>
  <div class="min-h-screen bg-gray-50">
    <AppHeader />

    <main class="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <!-- Breadcrumb -->
      <nav class="mb-6 flex items-center gap-2 text-sm text-gray-600">
        <NuxtLink to="/" class="hover:text-blue-600">Home</NuxtLink>
        <span>/</span>
        <span class="font-medium text-gray-900">{{
          category?.name || "Category"
        }}</span>
      </nav>

      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900" :style="headingStyle">
          {{ category?.name || "Category" }}
        </h1>
        <p v-if="!pending" class="mt-2 text-gray-600">
          {{ products.length }} products available
        </p>
      </div>

      <!-- Loading skeleton -->
      <div
        v-if="pending"
        class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4"
      >
        <div
          v-for="n in 8"
          :key="n"
          class="rounded-2xl border-2 border-gray-200 bg-white p-3 shadow-sm sm:p-4"
          aria-hidden="true"
        >
          <div
            class="aspect-square w-full animate-pulse rounded-2xl bg-gray-200"
          ></div>
          <div class="mt-3 space-y-2">
            <div class="h-4 w-3/4 animate-pulse rounded bg-gray-200"></div>
            <div class="h-4 w-1/2 animate-pulse rounded bg-gray-200"></div>
            <div class="h-10 w-full animate-pulse rounded-xl bg-gray-200"></div>
          </div>
        </div>
      </div>

      <!-- Error state -->
      <div
        v-else-if="error"
        class="rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center"
      >
        <p class="text-blue-700">{{ error }}</p>
        <button
          @click="fetchCategoryAndProducts"
          class="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="!category"
        class="rounded-2xl border-2 border-gray-200 bg-white p-12 text-center"
      >
        <div class="mb-4 text-6xl">📦</div>
        <h3 class="text-lg font-semibold text-gray-900">Category not found</h3>
        <NuxtLink
          to="/#deals"
          class="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 inline-block"
        >
          Browse All Products
        </NuxtLink>
      </div>

      <div
        v-else-if="products.length === 0"
        class="rounded-2xl border-2 border-gray-200 bg-white p-12 text-center"
      >
        <div class="mb-4 text-6xl">📦</div>
        <h3 class="text-lg font-semibold text-gray-900">No products found</h3>
        <p class="mt-2 text-sm text-gray-600">
          No products available in this category.
        </p>
        <NuxtLink
          to="/#deals"
          class="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 inline-block"
        >
          Browse All Products
        </NuxtLink>
      </div>

      <!-- Products grid - Same design as ProductGrid -->
      <div
        v-else
        class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6"
      >
        <article
          v-for="product in products"
          :key="product.id"
          class="group relative rounded-2xl border-2 border-gray-200 bg-white p-3 shadow-sm transition-all hover:border-blue-600 hover:shadow-lg"
          :class="{
            'opacity-60':
              !product.isAvailable || getStockStatus(product.id).isOutOfStock,
          }"
        >
          <!-- Out of Stock Overlay -->
          <div
            v-if="
              !product.isAvailable || getStockStatus(product.id).isOutOfStock
            "
            class="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/60"
          >
            <span
              class="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white"
            >
              Out of Stock
            </span>
          </div>

          <!-- Stock Warning Badge (Low Stock) -->
          <div
            v-else-if="getStockStatus(product.id).isLowStock"
            class="absolute left-2 top-2 z-10"
          >
            <span
              class="rounded-full bg-orange-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm"
            >
              Only {{ getStockStatus(product.id).available }} left
            </span>
          </div>

          <!-- Deal Badge -->
          <div v-else-if="product.badge" class="absolute left-2 top-2 z-10">
            <span
              class="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm"
            >
              {{ product.badge }}
            </span>
          </div>

          <div class="relative">
            <img
              class="aspect-square w-full rounded-2xl object-cover"
              :src="product.imageUrl || '/placeholder-basket.svg'"
              :alt="product.name"
              loading="lazy"
              decoding="async"
              fetchpriority="low"
            />
          </div>

          <div class="mt-3">
            <h3 class="line-clamp-2 text-sm font-semibold text-gray-900">
              {{ product.name }}
            </h3>
            <p v-if="product.unit" class="mt-0.5 text-xs text-gray-500">
              {{ product.unit }}
            </p>

            <div class="mt-2 flex items-baseline gap-2">
              <span class="text-base font-bold text-gray-900 sm:text-lg">{{
                formatPrice(product.price)
              }}</span>
              <span
                v-if="product.oldPrice"
                class="text-xs text-gray-500 line-through sm:text-sm"
                >{{ formatPrice(product.oldPrice) }}</span
              >
            </div>

            <!-- Add to Cart Button -->
            <button
              class="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300"
              type="button"
              :disabled="
                !product.isAvailable ||
                getStockStatus(product.id).isOutOfStock ||
                addingToCart.has(product.id)
              "
              @click="handleAddToCart(product, $event)"
            >
              <!-- Loading Spinner -->
              <svg
                v-if="addingToCart.has(product.id)"
                class="h-4 w-4 animate-spin"
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

              <!-- Cart Icon -->
              <svg
                v-else
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>

              <span>{{
                addingToCart.has(product.id) ? "Adding..." : "Add"
              }}</span>
            </button>
          </div>
        </article>
      </div>
    </main>

    <AppFooter />

    <!-- Toast Notification -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="translate-y-2 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-2 opacity-0"
      >
        <div
          v-if="toast.show"
          class="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-xl px-6 py-3 text-sm font-medium text-white shadow-lg sm:bottom-8"
          :class="
            toast.type === 'success'
              ? 'bg-green-600'
              : toast.type === 'error'
                ? 'bg-blue-600'
                : 'bg-blue-600'
          "
        >
          <div class="flex items-center gap-2">
            <span>{{ toast.message }}</span>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Flying Item Animation -->
    <div
      v-if="flyingItem.show"
      class="fixed z-50 pointer-events-none"
      :style="{
        left: flyingItem.x + 'px',
        top: flyingItem.y + 'px',
        transform: `translate(-50%, -50%) scale(${flyingItem.scale})`,
        opacity: flyingItem.opacity,
        transition: flyingItem.animating
          ? 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
          : 'none',
      }"
    >
      <div class="h-16 w-16 rounded-xl bg-blue-600 p-2 shadow-lg">
        <img
          v-if="flyingItem.image"
          :src="flyingItem.image"
          class="h-full w-full rounded-lg object-cover"
          alt=""
        />
        <svg
          v-else
          class="h-full w-full text-white"
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCategories } from "../../composables/useCategories";
import { useProducts, type Product } from "../../composables/useProducts";
import { useCartStore } from "../../stores/useCartStore";
import type { Database } from "../../types/database.types";

const route = useRoute();
const slug = route.params.slug as string;

const { getCategoryBySlug } = useCategories();
const { fetchProductsByCategory, checkStock, formatPrice } = useProducts();
const cartStore = useCartStore();
const supabase = useSupabaseClient<Database>();

const category = ref<any>(null);
const products = ref<Product[]>([]);
const pending = ref(true);
const error = ref<string | null>(null);

// Local state for cart functionality
const addingToCart = ref<Set<string>>(new Set());
const toast = ref({
  show: false,
  message: "",
  type: "success" as "success" | "error" | "info",
});

// Flying item animation state
const flyingItem = ref({
  show: false,
  x: 0,
  y: 0,
  scale: 1,
  opacity: 1,
  image: "",
  animating: false,
});

// Get stock status for a product
const getStockStatus = (productId: string) => {
  const product = products.value.find((p) => p.id === productId);
  if (!product) return { available: 0, isOutOfStock: true, isLowStock: false };
  return {
    available: product.availableStock,
    isOutOfStock: !product.isAvailable,
    isLowStock: product.isAvailable && product.availableStock <= 3,
  };
};

// Show toast notification
const showToast = (
  message: string,
  type: "success" | "error" | "info" = "success",
  duration: number = 3000,
) => {
  toast.value = { show: true, message, type };
  setTimeout(() => {
    toast.value.show = false;
  }, duration);
};

// Fly-to-cart animation
const animateFlyToCart = (
  startX: number,
  startY: number,
  imageUrl?: string,
) => {
  const cartX = window.innerWidth - 60;
  const cartY = 20;

  flyingItem.value = {
    show: true,
    x: startX,
    y: startY,
    scale: 1,
    opacity: 1,
    image: imageUrl || "",
    animating: false,
  };

  requestAnimationFrame(() => {
    flyingItem.value.animating = true;
    flyingItem.value.x = cartX;
    flyingItem.value.y = cartY;
    flyingItem.value.scale = 0.3;
    flyingItem.value.opacity = 0.5;
  });

  setTimeout(() => {
    flyingItem.value.show = false;
  }, 600);
};

// Handle add to cart
const handleAddToCart = async (product: Product, event: MouseEvent) => {
  if (addingToCart.value.has(product.id)) return;

  addingToCart.value.add(product.id);

  const rect = (event.target as HTMLElement).getBoundingClientRect();
  const startX = rect.left + rect.width / 2;
  const startY = rect.top + rect.height / 2;

  const result = await cartStore.addItem(
    {
      id: product.id,
      product_id: product.id,
      name: product.name,
      price: product.price,
      store_id: product.storeId,
      store_name: product.storeName,
      image_url: product.imageUrl,
      availableStock: getStockStatus(product.id).available,
      digitalBuffer: product.digitalBuffer,
    },
    1,
    {
      checkStockFn: checkStock,
      onStoreMismatch: (currentStore, newStore) => {
        showToast(
          `Your cart has items from ${currentStore}. Clear cart to add from ${newStore}?`,
          "error",
          5000,
        );
      },
      onStockOut: (productName) => {
        showToast(`Sorry, ${productName} just sold out!`, "error", 5000);
      },
    },
  );

  addingToCart.value.delete(product.id);

  if (result.success) {
    animateFlyToCart(startX, startY, product.imageUrl);
    showToast(`${product.name} added to cart!`);
    // Persist cart to database for cross-device sync
    await cartStore.saveToDatabase(supabase);
  } else {
    showToast(result.error || "Failed to add item", "error", 4000);
  }
};

const fetchCategoryAndProducts = async () => {
  pending.value = true;
  error.value = null;

  try {
    // Fetch category info
    category.value = await getCategoryBySlug(slug);

    // Fetch products for this category
    if (category.value) {
      const categoryProducts = await fetchProductsByCategory(slug);
      products.value = categoryProducts;
    }
  } catch (err: any) {
    error.value = err.message || "Failed to load products";
  } finally {
    pending.value = false;
  }
};

onMounted(() => {
  fetchCategoryAndProducts();
});

const headingStyle = computed(() => ({
  fontFamily:
    "ui-serif, 'Playfair Display', Georgia, 'Times New Roman', Times, serif",
}));

useHead({
  title: computed(() =>
    category.value
      ? `${category.value.name} | BokkuXpress`
      : "Category | BokkuXpress",
  ),
});
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
