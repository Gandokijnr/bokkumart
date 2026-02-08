<template>
  <section id="categories" class="bg-white py-10 md:py-14">
    <div class="mx-auto max-w-7xl px-4 sm:px-6">
      <div class="mb-6 flex items-end justify-between gap-4 md:mb-8">
        <div>
          <h2 class="text-2xl font-bold text-gray-900 sm:text-3xl" :style="headingStyle">Shop by Category</h2>
          <p class="mt-1.5 text-sm text-gray-600 sm:text-base">
            {{ pending ? 'Loading categories...' : error ? 'Failed to load categories' : `Browse ${categories.length} curated collections` }}
          </p>
        </div>
        <button @click="navigateTo('/#deals')" class="hidden text-sm font-semibold text-red-600 hover:text-red-700 md:block">
          View all deals →
        </button>
      </div>

      <!-- Loading state -->
      <div v-if="pending" class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
        <div v-for="i in 10" :key="i" class="rounded-2xl border-2 border-gray-100 bg-gray-50 p-4 sm:p-5 animate-pulse">
          <div class="h-12 w-12 rounded-xl bg-gray-200 sm:h-14 sm:w-14"></div>
          <div class="mt-3 h-4 w-20 rounded bg-gray-200"></div>
          <div class="mt-0.5 h-3 w-16 rounded bg-gray-200"></div>
        </div>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="rounded-xl bg-red-50 p-6 text-center">
        <p class="text-red-700">{{ error }}</p>
        <button @click="fetchCategories" class="mt-2 text-sm font-semibold text-red-600 hover:text-red-800">
          Retry
        </button>
      </div>

      <!-- Categories grid -->
      <div v-else class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
        <button
          v-for="c in displayCategories"
          :key="c.id"
          @click="navigateTo(`/category/${c.slug}`)"
          class="group rounded-2xl border-2 border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:border-red-600 hover:shadow-lg sm:p-5"
          type="button"
          :aria-label="`Browse ${c.name}`"
        >
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-2xl transition-all group-hover:bg-red-100 sm:h-14 sm:w-14">{{ c.icon }}</div>
          <div class="mt-3 text-sm font-bold text-gray-900 sm:text-base">{{ c.name }}</div>
          <div class="mt-0.5 text-xs text-gray-600">{{ c.sub }}</div>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useCategories, type Category } from '../composables/useCategories'

const { categories, pending, error, fetchCategories, getCategoryIcon, getCategorySubtitle } = useCategories()

// Fetch categories on mount
onMounted(() => {
  fetchCategories(true) // include product count
})

// Transform categories for display
const displayCategories = computed(() => {
  return categories.value.map((cat: Category) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    icon: getCategoryIcon(cat),
    sub: getCategorySubtitle(cat)
  }))
})

const headingStyle = computed(() => ({
  fontFamily: "ui-serif, 'Playfair Display', Georgia, 'Times New Roman', Times, serif"
}))
</script>
