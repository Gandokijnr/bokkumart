<template>
  <div class="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden" :class="{ 'border-0': borderless }">
    <div v-if="$slots.header" class="px-4 py-3 border-b border-gray-100 bg-gray-50">
      <slot name="header" />
    </div>
    <div class="p-4">
      <slot />
    </div>
    <div v-if="$slots.footer" class="px-4 py-3 border-t border-gray-100 bg-gray-50">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  borderless?: boolean
}>(), {
  borderless: false
})
</script>
