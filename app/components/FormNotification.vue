<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-y-4 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-4 opacity-0"
    >
      <div
        v-if="show"
        class="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl shadow-lg border-2 p-4"
        :class="{
          'bg-green-50 border-green-200 text-green-800': color === 'green',
          'bg-red-50 border-red-200 text-red-800': color === 'red',
          'bg-blue-50 border-blue-200 text-blue-800': color === 'blue'
        }"
      >
        <div class="flex items-start gap-3">
          <!-- Icon -->
          <div class="flex-shrink-0">
            <svg v-if="color === 'green'" class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <svg v-else-if="color === 'red'" class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <svg v-else class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <!-- Content -->
          <div class="flex-1 min-w-0">
            <h3 v-if="title" class="text-sm font-semibold">{{ title }}</h3>
            <p v-if="description" class="text-sm mt-1">{{ description }}</p>
          </div>
          <!-- Close button -->
          <button
            @click="$emit('close')"
            class="flex-shrink-0 -mt-1 -mr-1 p-1 rounded-lg hover:bg-black/5 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  show: boolean
  title?: string
  description?: string
  color?: 'green' | 'red' | 'blue'
}>(), {
  color: 'green'
})

defineEmits<{
  close: []
}>()
</script>
