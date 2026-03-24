<template>
  <div
    class="relative rounded-xl border-2 border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md sm:p-4"
    :class="{ 'opacity-60': item.quantity > item.max_quantity }"
  >
    <!-- Stock Warning Badge -->
    <div
      v-if="item.quantity > item.max_quantity"
      class="absolute -top-2 left-3 rounded-full bg-blue-600 px-2 py-1 text-xs font-bold text-white shadow-md sm:left-4 sm:px-3"
    >
      Only {{ item.max_quantity }} in stock
    </div>

    <div class="flex gap-3 sm:gap-4">
      <!-- Product Image -->
      <div class="relative flex-shrink-0">
        <img
          :src="item.image_url || '/placeholder-basket.svg'"
          :alt="item.name"
          class="h-20 w-20 rounded-lg object-cover sm:h-24 sm:w-24"
        />
        <div
          v-if="item.quantity > item.max_quantity"
          class="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50"
        >
          <span class="text-xs font-bold text-white">Out of Stock</span>
        </div>
      </div>

      <!-- Product Details -->
      <div class="flex flex-1 flex-col justify-between">
        <div>
          <h3
            class="line-clamp-2 text-sm font-semibold text-gray-900 sm:text-base"
          >
            {{ item.name }}
          </h3>
          <p class="mt-1 text-xs text-gray-500 sm:text-sm">
            {{ formatPrice(item.price) }} per unit
          </p>
        </div>

        <div class="mt-3 flex items-center justify-between gap-2 sm:mt-4">
          <!-- Quantity Controls -->
          <div class="flex items-center rounded-lg border-2 border-gray-200">
            <button
              @click="decreaseQuantity"
              class="flex h-10 w-10 items-center justify-center text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:w-11"
              :disabled="item.quantity <= 1"
              aria-label="Decrease quantity"
            >
              <svg
                class="h-4 w-4 sm:h-5 sm:w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M20 12H4"
                />
              </svg>
            </button>
            <input
              type="number"
              :value="item.quantity"
              @change="handleQuantityInput"
              @blur="handleQuantityInput"
              min="1"
              :max="item.max_quantity"
              class="h-10 w-14 appearance-none border-x-2 border-gray-200 bg-white text-center text-sm font-semibold text-gray-900 focus:border-blue-600 focus:outline-none sm:h-11 sm:w-16 sm:text-base"
            />
            <button
              @click="increaseQuantity"
              class="flex h-10 w-10 items-center justify-center text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:w-11"
              :disabled="item.quantity >= item.max_quantity"
              aria-label="Increase quantity"
            >
              <svg
                class="h-4 w-4 sm:h-5 sm:w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </div>

          <!-- Item Total -->
          <p class="text-sm font-bold text-gray-900 sm:text-base lg:text-lg">
            {{ formatPrice(item.price * item.quantity) }}
          </p>
        </div>
      </div>

      <!-- Delete Button -->
      <button
        @click="remove"
        class="absolute right-3 top-3 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-500 sm:static sm:h-10 sm:w-10"
        aria-label="Remove item"
      >
        <svg
          class="h-4 w-4 sm:h-5 sm:w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  max_quantity: number;
  image_url?: string;
}

const props = defineProps<{
  item: CartItem;
}>();

const emit = defineEmits<{
  updateQuantity: [id: string, quantity: number];
  remove: [id: string];
}>();

function formatPrice(price: number): string {
  return "₦" + price.toLocaleString("en-NG");
}

function decreaseQuantity() {
  if (props.item.quantity > 1) {
    emit("updateQuantity", props.item.id, props.item.quantity - 1);
  }
}

function increaseQuantity() {
  if (props.item.quantity < props.item.max_quantity) {
    emit("updateQuantity", props.item.id, props.item.quantity + 1);
  }
}

function handleQuantityInput(event: Event) {
  const input = event.target as HTMLInputElement;
  const value = parseInt(input.value, 10);

  if (isNaN(value) || value < 1) {
    // Reset to 1 if invalid or less than 1
    emit("updateQuantity", props.item.id, 1);
    return;
  }

  if (value > props.item.max_quantity) {
    // Cap at max quantity
    emit("updateQuantity", props.item.id, props.item.max_quantity);
    return;
  }

  // Valid quantity
  emit("updateQuantity", props.item.id, value);
}

function remove() {
  emit("remove", props.item.id);
}
</script>
