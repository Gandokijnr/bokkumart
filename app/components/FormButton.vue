<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
    :class="{
      // Size variants
      'px-3 py-1.5 text-sm': size === 'sm',
      'px-4 py-2.5 text-sm': size === 'default',
      'px-6 py-3.5 text-base': size === 'lg',
      // Width
      'w-full': block,
      // Color variants
      'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600':
        variant === 'solid' && color === 'primary',
      'bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-400':
        variant === 'solid' && color === 'neutral',
      'border-2 border-red-600 text-red-600 hover:bg-red-50 focus:ring-red-600':
        variant === 'outline' && color === 'primary',
      'border-2 border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-400':
        variant === 'outline' && color === 'neutral',
      'text-red-600 hover:bg-red-50 focus:ring-red-600':
        variant === 'ghost' && color === 'primary',
      'text-gray-600 hover:bg-gray-100 focus:ring-gray-400':
        variant === 'ghost' && color === 'neutral',
    }"
    @click="$emit('click')"
  >
    <!-- Loading spinner -->
    <svg
      v-if="loading"
      class="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      ></circle>
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
    <slot />
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: "button" | "submit" | "reset";
    size?: "sm" | "default" | "lg";
    color?: "primary" | "neutral";
    variant?: "solid" | "outline" | "ghost";
    block?: boolean;
    loading?: boolean;
    disabled?: boolean;
  }>(),
  {
    type: "button",
    size: "default",
    color: "primary",
    variant: "solid",
    block: false,
    loading: false,
    disabled: false,
  },
);

defineEmits<{
  click: [];
}>();
</script>
