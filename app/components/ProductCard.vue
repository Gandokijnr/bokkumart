<!--
  BokkuMart ProductCard Component
  
  This is a demo component showcasing the new Blue/White BokkuMart design.
  It features:
  - Bokku blue (#0052CC) primary color
  - Yellow (#FFC107) accent for sale badges
  - Clean Inter/Plus Jakarta Sans typography
  - Modern rounded-lg and rounded-full button styling
  - Technology markup pricing display
  
  Usage:
    <ProductCard
      :product="{
        id: '123',
        name: 'Fresh Organic Bananas',
        price: 1200,
        oldPrice: 1500,
        unit: '1 bunch',
        imageUrl: '/images/bananas.jpg',
        badge: 'Sale',
        isAvailable: true,
        availableStock: 10
      }"
      @add-to-cart="handleAddToCart"
    />
-->
<template>
  <article
    class="group relative flex flex-col rounded-2xl border-2 border-gray-200 bg-white p-3 shadow-sm transition-all duration-300 hover:border-[#0052CC] hover:shadow-lg sm:p-4"
    :class="{ 'opacity-60': !product.isAvailable || product.availableStock === 0 }"
  >
    <!-- Out of Stock Overlay -->
    <div
      v-if="!product.isAvailable || product.availableStock === 0"
      class="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/60"
    >
      <span
        class="rounded-full bg-gray-600 px-3 py-1 text-xs font-bold text-white"
      >
        Out of Stock
      </span>
    </div>

    <!-- Sale Badge (Yellow accent) -->
    <div
      v-else-if="product.badge"
      class="absolute left-2 top-2 z-10"
    >
      <span class="badge-sale">
        {{ product.badge }}
      </span>
    </div>

    <!-- Low Stock Badge -->
    <div
      v-else-if="product.availableStock <= 3 && product.availableStock > 0"
      class="absolute left-2 top-2 z-10"
    >
      <span class="rounded-full bg-orange-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
        Only {{ product.availableStock }} left
      </span>
    </div>

    <!-- Product Image -->
    <div class="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
      <img
        :src="product.imageUrl || '/placeholder-product.png'"
        :alt="product.name"
        class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
        decoding="async"
      />
    </div>

    <!-- Product Info -->
    <div class="mt-3 flex flex-1 flex-col">
      <h3 class="line-clamp-2 text-sm font-semibold text-gray-900 sm:text-base">
        {{ product.name }}
      </h3>
      
      <p v-if="product.unit" class="mt-0.5 text-xs text-gray-500">
        {{ product.unit }}
      </p>

      <!-- Price Display with Markup -->
      <div class="mt-2 flex flex-wrap items-baseline gap-2">
        <span class="text-lg font-bold text-[#0052CC] sm:text-xl">
          {{ displayPrice }}
        </span>
        <span
          v-if="product.oldPrice"
          class="text-xs text-gray-400 line-through sm:text-sm"
        >
          {{ oldDisplayPrice }}
        </span>
        <span
          v-if="product.oldPrice"
          class="rounded-full bg-[#FFC107] px-2 py-0.5 text-[10px] font-bold text-gray-900"
        >
          Save {{ savingsPercentage }}%
        </span>
      </div>

      <!-- Admin Price Transparency (only for admin users) -->
      <div v-if="showAdminPricing" class="mt-1 text-xs text-gray-500">
        <span class="text-gray-400">Bokku:</span> {{ basePrice }} 
        <span class="mx-1 text-gray-300">|</span>
        <span class="text-gray-400">Markup:</span> {{ markupAmount }}
      </div>

      <!-- Add to Cart Button (Bokku Blue) -->
      <button
        class="mt-auto flex w-full items-center justify-center gap-2 rounded-lg bg-[#0052CC] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-[#003D8F] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none sm:py-3"
        type="button"
        :disabled="!product.isAvailable || product.availableStock === 0 || isAdding"
        @click="handleAddToCart"
      >
        <!-- Loading Spinner -->
        <svg
          v-if="isAdding"
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
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
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

        <span>{{ isAdding ? 'Adding...' : 'Add to Cart' }}</span>
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { getDisplayPrice, formatPrice, comparePrices } from '~/utils/pricing';

interface Product {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  unit?: string;
  imageUrl?: string;
  badge?: string;
  isAvailable: boolean;
  availableStock: number;
}

const props = defineProps<{
  product: Product;
  showAdminPricing?: boolean;
}>();

const emit = defineEmits<{
  (e: 'add-to-cart', product: Product): void;
}>();

const isAdding = ref(false);

// Calculate display prices with technology markup
const displayPrice = computed(() => {
  return formatPrice(getDisplayPrice(props.product.price));
});

const oldDisplayPrice = computed(() => {
  if (!props.product.oldPrice) return '';
  return formatPrice(getDisplayPrice(props.product.oldPrice));
});

// Admin pricing breakdown
const priceBreakdown = computed(() => {
  return comparePrices(props.product.price);
});

const basePrice = computed(() => priceBreakdown.value.bokkuPrice);
const markupAmount = computed(() => priceBreakdown.value.markupAmount);

// Calculate savings percentage
const savingsPercentage = computed(() => {
  if (!props.product.oldPrice) return 0;
  const current = getDisplayPrice(props.product.price);
  const original = getDisplayPrice(props.product.oldPrice);
  return Math.round(((original - current) / original) * 100);
});

async function handleAddToCart() {
  if (isAdding.value) return;
  
  isAdding.value = true;
  
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  
  emit('add-to-cart', props.product);
  
  isAdding.value = false;
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
