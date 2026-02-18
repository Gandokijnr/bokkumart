<template>
  <div class="space-y-1.5">
    <label v-if="label" class="block text-sm font-medium text-gray-700">
      {{ label }}
    </label>
    <div class="relative">
      <div
        v-if="$slots.leading"
        class="absolute left-3 top-1/2 -translate-y-1/2"
      >
        <slot name="leading" />
      </div>
      <input
        :value="modelValue"
        @input="
          $emit('update:modelValue', ($event.target as HTMLInputElement).value)
        "
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        :maxlength="maxlength"
        :inputmode="inputmode"
        class="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 transition-all outline-none placeholder:text-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
        :class="{
          'pl-16': $slots.leading,
          'text-center': center,
          'h-14 text-2xl font-bold': size === 'otp',
          'py-3 text-base': size === 'lg',
          'border-red-500 ring-2 ring-red-200': active,
        }"
        @keydown="$emit('keydown', $event)"
        @paste="$emit('paste', $event)"
        ref="inputRef"
      />
    </div>
    <p v-if="help" class="text-xs text-gray-500">{{ help }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    type?: string;
    placeholder?: string;
    size?: "default" | "lg" | "otp";
    disabled?: boolean;
    maxlength?: number;
    inputmode?:
      | "text"
      | "search"
      | "email"
      | "tel"
      | "url"
      | "none"
      | "numeric"
      | "decimal";
    label?: string;
    help?: string;
    center?: boolean;
    active?: boolean;
    autofocus?: boolean;
  }>(),
  {
    type: "text",
    size: "default",
    disabled: false,
    center: false,
    active: false,
    autofocus: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  keydown: [event: KeyboardEvent];
  paste: [event: ClipboardEvent];
}>();

const inputRef = ref<HTMLInputElement>();

defineExpose({
  focus: () => inputRef.value?.focus(),
});

onMounted(() => {
  if (props.autofocus) {
    inputRef.value?.focus();
  }
});
</script>
