<template>
  <!-- Categories Bottom Sheet - Mobile Only -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[110] md:hidden"
        @click="close"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" />

        <!-- Bottom Sheet -->
        <Transition
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="translate-y-full"
          enter-to-class="translate-y-0"
          leave-active-class="transition duration-200 ease-in"
          leave-from-class="translate-y-0"
          leave-to-class="translate-y-full"
        >
          <div
            v-if="modelValue"
            class="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
            style="padding-bottom: env(safe-area-inset-bottom, 0px)"
            @click.stop
          >
            <!-- Handle bar -->
            <div class="flex justify-center pt-3 pb-2">
              <div class="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            <!-- Header -->
            <div class="px-5 pb-4 border-b border-gray-100">
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-lg font-bold text-gray-900">Categories</h2>
                  <p class="text-sm text-gray-500">
                    {{ categories.length }} categories available
                  </p>
                </div>
                <button
                  @click="close"
                  class="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <svg
                    class="w-5 h-5 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Search Categories -->
            <div class="px-5 py-3">
              <div class="relative">
                <input
                  v-model="searchQuery"
                  type="search"
                  placeholder="Search categories..."
                  class="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
                <svg
                  class="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            <!-- Categories Grid -->
            <div class="flex-1 overflow-y-auto px-5 py-2">
              <div v-if="pending" class="flex items-center justify-center py-8">
                <svg
                  class="animate-spin h-8 w-8 text-blue-600"
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
                  />
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>

              <div
                v-else-if="filteredCategories.length === 0"
                class="text-center py-8"
              >
                <div
                  class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3"
                >
                  <svg
                    class="w-8 h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p class="text-gray-600">No categories found</p>
              </div>

              <div v-else class="grid grid-cols-3 gap-3">
                <NuxtLink
                  v-for="category in filteredCategories"
                  :key="category.id"
                  :to="`/category/${category.slug}`"
                  @click="handleCategoryClick(category)"
                  class="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gray-50 hover:bg-blue-50 active:scale-95 transition-all tap-highlight-transparent"
                >
                  <div
                    class="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-2xl"
                  >
                    {{ getCategoryIcon(category) }}
                  </div>
                  <div class="text-center">
                    <p class="text-xs font-semibold text-gray-900 line-clamp-2">
                      {{ category.name }}
                    </p>
                    <p class="text-[10px] text-gray-500 mt-0.5">
                      {{ getCategorySubtitle(category) }}
                    </p>
                  </div>
                </NuxtLink>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useCategories } from "~/composables/useCategories";

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const {
  categories,
  pending,
  fetchCategories,
  getCategoryIcon,
  getCategorySubtitle,
} = useCategories();
const searchQuery = ref("");

// Fetch categories when opened
watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen && categories.value.length === 0) {
      await fetchCategories(true);
    }
  },
);

// Filtered categories based on search
const filteredCategories = computed(() => {
  if (!searchQuery.value.trim()) return categories.value;
  const query = searchQuery.value.toLowerCase();
  return categories.value.filter(
    (cat) =>
      cat.name.toLowerCase().includes(query) ||
      cat.description?.toLowerCase().includes(query),
  );
});

// Close sheet
const close = () => {
  emit("update:modelValue", false);
  searchQuery.value = "";
};

// Handle category click with haptic feedback
const handleCategoryClick = (category: any) => {
  // Trigger haptic feedback
  if (window.navigator && "vibrate" in window.navigator) {
    window.navigator.vibrate(10);
  }
  close();
};

// Handle escape key
onMounted(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape" && props.modelValue) {
      close();
    }
  };
  window.addEventListener("keydown", handleEscape);
  onUnmounted(() => window.removeEventListener("keydown", handleEscape));
});
</script>

<style scoped>
.tap-highlight-transparent {
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
