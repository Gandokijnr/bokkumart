<template>
  <section :id="sectionId" class="bg-white py-10 md:py-14">
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
      <div v-if="pending" class="-mx-4 px-4 sm:mx-0 sm:px-0">
        <div class="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div
            v-for="i in 10"
            :key="i"
            class="w-[200px] flex-none rounded-2xl border border-gray-100 bg-white p-4 shadow-sm animate-pulse"
          >
            <div class="flex items-center gap-3">
              <div class="h-12 w-12 flex-none rounded-2xl bg-gray-200"></div>
              <div class="min-w-0 flex-1">
                <div class="h-4 w-28 max-w-full rounded bg-gray-200"></div>
                <div class="mt-2 h-3 w-20 max-w-[70%] rounded bg-gray-200"></div>
              </div>
            </div>
            <div class="mt-4 h-3 w-16 rounded bg-gray-200"></div>
          </div>
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
      <div v-else class="-mx-4 px-4 sm:mx-0 sm:px-0">
        <div class="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            v-for="c in displayCategories"
            :key="c.id"
            @click="navigateTo(`/category/${c.slug}`)"
            class="group w-[220px] flex-none snap-start rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-all hover:border-red-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
            type="button"
            :aria-label="`Browse ${c.name}`"
          >
            <div class="flex items-start gap-3">
              <div class="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-red-50 text-2xl transition-colors group-hover:bg-red-100">
                {{ c.icon }}
              </div>

              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-extrabold text-gray-900">{{ c.name }}</div>
                <div class="mt-1 line-clamp-2 text-xs text-gray-600">{{ c.sub }}</div>
              </div>
            </div>

            <div class="mt-4 flex items-center justify-between">
              <span class="text-xs font-bold text-red-700">Browse</span>
              <Icon name="mdi:chevron-right" class="h-5 w-5 text-gray-400 transition-colors group-hover:text-gray-700" />
            </div>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useCategories, type Category } from '../composables/useCategories'

const props = defineProps<{
  enableAnchor?: boolean
  anchorId?: string
}>()

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

const sectionId = computed(() => {
  if (props.enableAnchor === false) return undefined
  return props.anchorId || 'categories'
})

const headingStyle = computed(() => ({
  fontFamily: "ui-serif, 'Playfair Display', Georgia, 'Times New Roman', Times, serif"
}))
</script>
