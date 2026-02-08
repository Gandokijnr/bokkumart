<template>
  <div class="space-y-1.5">
    <label v-if="label" class="block text-sm font-medium text-gray-700">
      {{ label }}
    </label>
    <textarea
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      :placeholder="placeholder"
      :disabled="disabled"
      :rows="rows"
      class="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 transition-all outline-none placeholder:text-gray-400 focus:border-red-600 focus:ring-2 focus:ring-red-200 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
    />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: string
  label?: string
  placeholder?: string
  rows?: number
  disabled?: boolean
}>(), {
  rows: 4,
  disabled: false
})

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
