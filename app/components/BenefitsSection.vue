<template>
  <section id="about" class="bg-white py-10 md:py-14">
    <div class="mx-auto max-w-7xl px-4 sm:px-6">
      <div class="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <!-- Benefits -->
        <div>
          <h2
            class="text-2xl font-bold text-gray-900 sm:text-3xl"
            :style="headingStyle"
          >
            Why Choose HomeAffairs?
          </h2>
          <p class="mt-2 text-sm text-gray-600 sm:text-base">
            Premium groceries delivered with care. Designed for busy families
            who demand the best.
          </p>

          <div class="mt-6 space-y-4 md:mt-8">
            <div
              v-for="b in benefits"
              :key="b.title"
              class="flex items-start gap-4 rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-red-600 hover:shadow-md"
            >
              <div
                class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-red-50 text-2xl"
              >
                {{ b.icon }}
              </div>
              <div class="flex-1">
                <h3 class="text-sm font-bold text-gray-900 sm:text-base">
                  {{ b.title }}
                </h3>
                <p class="mt-1 text-xs text-gray-600 sm:text-sm">
                  {{ b.description }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- How it works -->
        <div class="rounded-3xl border-2 border-gray-200 bg-gray-50 p-6 md:p-8">
          <h3 class="text-lg font-bold text-gray-900 sm:text-xl">
            How It Works
          </h3>
          <p class="mt-1 text-sm text-gray-600">
            Get started in just 3 simple steps
          </p>

          <div class="mt-6 space-y-4">
            <div
              class="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div
                class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-red-600 text-base font-bold text-white"
              >
                1
              </div>
              <div class="flex-1">
                <h4 class="text-sm font-bold text-gray-900">
                  Browse & Discover
                </h4>
                <p class="mt-0.5 text-xs text-gray-600">
                  Explore categories and find your favorites
                </p>
              </div>
            </div>
            <div
              class="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div
                class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-red-600 text-base font-bold text-white"
              >
                2
              </div>
              <div class="flex-1">
                <h4 class="text-sm font-bold text-gray-900">Add to Cart</h4>
                <p class="mt-0.5 text-xs text-gray-600">
                  Build your basket with fresh essentials
                </p>
              </div>
            </div>
            <div
              class="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div
                class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-red-600 text-base font-bold text-white"
              >
                3
              </div>
              <div class="flex-1">
                <h4 class="text-sm font-bold text-gray-900">
                  Checkout & Deliver
                </h4>
                <p class="mt-0.5 text-xs text-gray-600">
                  Choose pickup or delivery at checkout
                </p>
              </div>
            </div>
          </div>

          <button
            @click="navigateTo('/#categories')"
            class="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
          >
            <span>Start Shopping Now</span>
            <svg
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
interface Benefit {
  icon: string;
  title: string;
  description: string;
}

defineProps<{
  benefits: Benefit[];
}>();

const headingStyle = computed(() => ({
  fontFamily:
    "ui-serif, 'Playfair Display', Georgia, 'Times New Roman', Times, serif",
}));
</script>
