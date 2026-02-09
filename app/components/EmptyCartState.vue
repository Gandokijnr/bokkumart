<template>
  <div class="flex flex-col items-center justify-center py-12 sm:py-16">
    <div class="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 sm:mb-6 sm:h-32 sm:w-32">
      <svg class="h-12 w-12 text-gray-400 sm:h-16 sm:w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    </div>
    <h2 class="mb-2 text-lg font-bold text-gray-900 sm:text-xl">Your cart is empty</h2>
    <p class="mb-6 max-w-md px-4 text-center text-sm text-gray-500 sm:mb-8 sm:text-base">
      Looks like you haven't added anything to your cart yet. Explore our categories and find something you'll love.
    </p>
    <button
      @click="navigateTo('/#categories')"
      class="mb-8 inline-flex items-center justify-center rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl sm:mb-12 sm:px-8 sm:py-3.5"
    >
      <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
      Start Shopping
    </button>

    <!-- Top Categories Suggestions -->
    <div v-if="categories.length > 0" class="w-full max-w-4xl px-2">
      <h3 class="mb-3 text-center text-base font-semibold text-gray-900 sm:mb-4 sm:text-lg">Popular Categories</h3>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
        <button
          v-for="category in categories.slice(0, 8)"
          :key="category.id"
          @click="navigateTo(`/category/${category.slug}`)"
          class="group flex flex-col items-center rounded-xl border-2 border-gray-200 bg-white p-3 transition-all hover:border-red-600 hover:shadow-md sm:p-4"
        >
          <div class="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 transition-colors group-hover:bg-red-50 sm:mb-3 sm:h-14 sm:w-14">
            <span class="text-2xl sm:text-3xl">{{ getCategoryIcon(category) }}</span>
          </div>
          <span class="text-center text-xs font-medium text-gray-700 group-hover:text-red-600 sm:text-sm">{{ category.name }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Category } from '~/composables/useCategories'

defineProps<{
  categories: Category[]
  getCategoryIcon: (category: Category) => string
}>()
</script>
