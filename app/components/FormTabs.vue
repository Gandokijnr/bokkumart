<template>
  <div class="w-full">
    <!-- Tab Headers -->
    <div class="flex border-b border-gray-200">
      <button
        v-for="item in items"
        :key="item.value"
        @click="$emit('update:modelValue', item.value)"
        class="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px"
        :class="{
          'border-red-600 text-red-600': modelValue === item.value,
          'border-transparent text-gray-500 hover:text-gray-700':
            modelValue !== item.value,
        }"
      >
        <svg
          v-if="item.icon"
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            v-if="item.icon.includes('phone')"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
          />
          <path
            v-if="item.icon.includes('envelope')"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        {{ item.label }}
      </button>
    </div>
    <!-- Tab Content -->
    <div class="pt-4">
      <slot :item="activeItem" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface TabItem {
  label: string;
  value: string;
  icon?: string;
}

const props = defineProps<{
  modelValue: string;
  items: TabItem[];
}>();

defineEmits<{
  "update:modelValue": [value: string];
}>();

const activeItem = computed(() => {
  return (
    props.items.find((item) => item.value === props.modelValue) ||
    props.items[0]
  );
});
</script>
