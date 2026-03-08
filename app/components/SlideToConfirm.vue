<template>
  <div
    ref="containerRef"
    class="relative w-full h-16 bg-slate-700/50 rounded-2xl overflow-hidden select-none touch-none border border-slate-600/30"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
    @mousedown="handleMouseDown"
  >
    <!-- Background Track -->
    <div class="absolute inset-0 flex items-center justify-center">
      <span
        class="text-sm font-semibold text-slate-400 uppercase tracking-wider"
      >
        <template v-if="isConfirming">
          <span class="text-amber-400">⏳ Hold to Confirm...</span>
        </template>
        <template v-else-if="isComplete">
          <span class="text-green-400">✓ Confirmed!</span>
        </template>
        <template v-else>
          {{ label }}
        </template>
      </span>
    </div>

    <!-- Progress Fill -->
    <div
      class="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500/30 to-blue-500/50 transition-all duration-75"
      :style="{ width: `${progress}%` }"
    />

    <!-- Slider Handle -->
    <div
      class="absolute top-1 bottom-1 w-14 rounded-xl flex items-center justify-center transition-all duration-75 shadow-lg cursor-grab active:cursor-grabbing"
      :class="[
        isComplete
          ? 'bg-green-500 left-[calc(100%-3.5rem-0.25rem)]'
          : isConfirming
            ? 'bg-amber-500 left-[calc(100%-3.5rem-0.25rem)]'
            : 'bg-blue-500',
        isDragging ? 'scale-95' : 'scale-100',
      ]"
      :style="
        !isComplete && !isConfirming
          ? {
              left: `calc(${progress}% - ${14 * (progress / 100)}px + 0.25rem)`,
            }
          : {}
      "
    >
      <svg
        v-if="isComplete"
        class="w-6 h-6 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="3"
          d="M5 13l4 4L19 7"
        />
      </svg>
      <svg
        v-else-if="isConfirming"
        class="w-6 h-6 text-white animate-pulse"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <svg
        v-else
        class="w-6 h-6 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 5l7 7-7 7"
        />
      </svg>
    </div>

    <!-- Confirmation Timer Indicator -->
    <div
      v-if="isConfirming"
      class="absolute bottom-0 left-0 right-0 h-1 bg-amber-500/30"
    >
      <div
        class="h-full bg-amber-400 transition-all duration-100"
        :style="{ width: `${confirmationProgress}%` }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

interface Props {
  label?: string;
  confirmDelay?: number; // milliseconds to hold for confirmation
}

const props = withDefaults(defineProps<Props>(), {
  label: "Slide to Confirm",
  confirmDelay: 1500, // 1.5 seconds hold time
});

const emit = defineEmits<{
  confirm: [];
}>();

const containerRef = ref<HTMLElement | null>(null);
const isDragging = ref(false);
const progress = ref(0);
const isConfirming = ref(false);
const isComplete = ref(false);
const confirmationProgress = ref(0);

let startX = 0;
let containerWidth = 0;
let confirmationTimer: ReturnType<typeof setInterval> | null = null;
let confirmationStartTime = 0;

const handleTouchStart = (e: TouchEvent) => {
  if (isComplete.value) return;
  const touch = e.touches[0];
  if (!touch) return;
  initDrag(touch.clientX);
};

const handleMouseDown = (e: MouseEvent) => {
  if (isComplete.value) return;
  initDrag(e.clientX);
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
};

const initDrag = (clientX: number) => {
  if (!containerRef.value) return;
  isDragging.value = true;
  startX = clientX;
  containerWidth = containerRef.value.offsetWidth || 0;
};

const handleTouchMove = (e: TouchEvent) => {
  if (!isDragging.value) return;
  const touch = e.touches[0];
  if (!touch) return;
  updateProgress(touch.clientX);
};

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return;
  updateProgress(e.clientX);
};

const updateProgress = (clientX: number) => {
  if (!containerRef.value) return;
  const delta = clientX - startX;
  const maxDelta = containerWidth - 60; // minus handle width + padding
  const newProgress = Math.max(0, Math.min(100, (delta / maxDelta) * 100));
  progress.value = newProgress;

  // Auto-confirm when dragged to end
  if (newProgress >= 95 && !isConfirming.value) {
    startConfirmation();
  } else if (newProgress < 95 && isConfirming.value) {
    cancelConfirmation();
  }
};

const startConfirmation = () => {
  isConfirming.value = true;
  confirmationStartTime = Date.now();

  confirmationTimer = setInterval(() => {
    const elapsed = Date.now() - confirmationStartTime;
    confirmationProgress.value = Math.min(
      100,
      (elapsed / props.confirmDelay) * 100,
    );

    if (elapsed >= props.confirmDelay) {
      completeConfirmation();
    }
  }, 50);
};

const cancelConfirmation = () => {
  isConfirming.value = false;
  confirmationProgress.value = 0;
  if (confirmationTimer) {
    clearInterval(confirmationTimer);
    confirmationTimer = null;
  }
};

const completeConfirmation = () => {
  cancelConfirmation();
  isComplete.value = true;
  progress.value = 100;
  emit("confirm");

  // Reset after animation
  setTimeout(() => {
    reset();
  }, 2000);
};

const handleTouchEnd = () => {
  endDrag();
};

const handleMouseUp = () => {
  endDrag();
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
};

const endDrag = () => {
  isDragging.value = false;

  if (!isConfirming.value && !isComplete.value) {
    // Snap back if not confirmed
    progress.value = 0;
  }
};

const reset = () => {
  isComplete.value = false;
  isConfirming.value = false;
  progress.value = 0;
  confirmationProgress.value = 0;
};

// Expose reset method for parent
defineExpose({ reset });
</script>
