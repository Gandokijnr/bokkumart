<template>
  <div
    v-if="products.length > 0"
    class="mt-6 rounded-xl border-2 border-gray-200 bg-white p-4 sm:mt-8 sm:p-5"
  >
    <h3
      class="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900 sm:mb-4 sm:text-base"
    >
      <svg
        class="h-4 w-4 text-blue-600 sm:h-5 sm:w-5"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        />
      </svg>
      You might also need
    </h3>
    <div class="flex gap-3 overflow-x-auto pb-2 sm:gap-4">
      <div
        v-for="product in products"
        :key="product.id"
        class="flex w-32 flex-shrink-0 flex-col rounded-lg border border-gray-200 bg-white p-2.5 transition-shadow hover:shadow-md sm:w-36 sm:p-3"
      >
        <img
          :src="product.image_url || '/placeholder-basket.svg'"
          :alt="product.name"
          class="mb-2 h-20 w-full rounded-lg object-cover sm:h-24"
        />
        <h4 class="mb-1 line-clamp-2 text-xs font-medium text-gray-900">
          {{ product.name }}
        </h4>
        <p class="mb-2 text-xs font-semibold text-blue-600 sm:text-sm">
          {{ formatPrice(product.price) }}
        </p>
        <button
          @click="$emit('add', product)"
          class="mt-auto rounded-lg bg-blue-600 py-1.5 text-xs font-bold text-white transition-colors sm:py-2"
        >
          Add to Cart
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Product {
  id: string;
  product_id: string;
  name: string;
  price: number;
  image_url?: string;
  category?: string;
}

defineProps<{
  products: Product[];
}>();

const emit = defineEmits<{
  add: [product: Product];
}>();

function formatPrice(price: number): string {
  return "₦" + price.toLocaleString("en-NG");
}
</script>
