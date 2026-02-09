<template>
  <div class="flex flex-col items-center gap-4">
    <!-- Pagination Controls -->
    <div v-if="totalPages > 1" class="flex items-center justify-center gap-2">
      <button
        :disabled="currentPage === 1"
        class="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        @click="prevPage"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        v-for="page in displayedPages"
        :key="page"
        :class="[
          'h-10 w-10 rounded-lg text-sm font-medium transition-colors',
          page === currentPage
            ? 'bg-red-600 text-white'
            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
        ]"
        @click="goToPage(page)"
      >
        {{ page }}
      </button>

      <button
        :disabled="currentPage === totalPages"
        class="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        @click="nextPage"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>

    <!-- Item Counter -->
    <p v-if="totalItems > 0" class="text-center text-sm text-gray-500">
      Showing {{ startItem }} - {{ endItem }} of {{ totalItems }} {{ itemLabel }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  itemLabel?: string
  maxVisiblePages?: number
}

const props = withDefaults(defineProps<Props>(), {
  itemLabel: 'items',
  maxVisiblePages: 5
})

const emit = defineEmits<{
  'update:currentPage': [page: number]
}>()

const startItem = computed(() => (props.currentPage - 1) * props.itemsPerPage + 1)
const endItem = computed(() => Math.min(props.currentPage * props.itemsPerPage, props.totalItems))

const displayedPages = computed(() => {
  const pages: number[] = []
  const maxVisible = props.maxVisiblePages
  let start = Math.max(1, props.currentPage - Math.floor(maxVisible / 2))
  let end = Math.min(props.totalPages, start + maxVisible - 1)

  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1)
  }

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

const prevPage = () => {
  if (props.currentPage > 1) {
    emit('update:currentPage', props.currentPage - 1)
  }
}

const nextPage = () => {
  if (props.currentPage < props.totalPages) {
    emit('update:currentPage', props.currentPage + 1)
  }
}

const goToPage = (page: number) => {
  emit('update:currentPage', page)
}
</script>
