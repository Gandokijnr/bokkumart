<template>
  <span
    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    :class="{
      'bg-red-100 text-red-800': color === 'primary' && variant === 'soft',
      'bg-red-600 text-white': color === 'primary' && variant === 'solid',
      'bg-gray-100 text-gray-800': color === 'neutral' && variant === 'soft',
      'bg-gray-600 text-white': color === 'neutral' && variant === 'solid',
    }"
  >
    <slot />
  </span>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    color?: "primary" | "neutral";
    variant?: "soft" | "solid";
  }>(),
  {
    color: "primary",
    variant: "soft",
  },
);
</script>
