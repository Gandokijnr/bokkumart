<template>
  <section class="relative overflow-hidden bg-gradient-to-br from-red-600 via-red-700 to-red-800">
    <!-- Background pattern -->
    <div class="absolute inset-0 opacity-10">
      <div class="absolute inset-0" style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 40px 40px;"></div>
    </div>

    <div class="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:py-20">
      <div class="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <!-- Hero content -->
        <div class="text-white">
          <h1 class="text-3xl font-bold leading-tight sm:text-4xl md:text-5xl lg:text-6xl" :style="headingStyle">
            Shop Smarter,<br class="hidden sm:inline" />
            Live Better.
          </h1>
          <p class="mt-4 text-base leading-relaxed text-red-50 sm:text-lg md:mt-6 md:max-w-xl">
            Your favorite premium supermarket is now online. Fresh essentials, curated brands, and fast delivery all at your fingertips.
          </p>

          <!-- CTA Buttons -->
          <div class="mt-6 flex flex-col gap-3 sm:flex-row md:mt-8">
            <button @click="navigateTo('/#categories')" class="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-red-600 shadow-lg transition-all hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-red-600 sm:px-8 sm:py-3.5">
              <span>Start Shopping</span>
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
            <button @click="navigateTo('/#about')" class="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-red-600 sm:px-8 sm:py-3.5">
              <span>Learn More</span>
            </button>
          </div>

          <!-- Feature pills -->
          <div class="mt-8 grid grid-cols-2 gap-3 md:mt-10 lg:grid-cols-3">
            <div class="flex items-center gap-2.5 rounded-xl border border-white/20 bg-white p-3 shadow-sm">
              <svg class="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <div>
                <div class="text-xs font-bold text-gray-900 sm:text-sm">Easy Pickup</div>
                <div class="text-xs text-gray-600">Fast & flexible</div>
              </div>
            </div>
            <div class="flex items-center gap-2.5 rounded-xl border border-white/20 bg-white p-3 shadow-sm">
              <svg class="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
              <div>
                <div class="text-xs font-bold text-gray-900 sm:text-sm">Fast Delivery</div>
                <div class="text-xs text-gray-600">Same-day available</div>
              </div>
            </div>
            <div class="col-span-2 flex items-center gap-2.5 rounded-xl border border-white/20 bg-white p-3 shadow-sm lg:col-span-1">
              <svg class="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <div class="text-xs font-bold text-gray-900 sm:text-sm">Premium Quality</div>
                <div class="text-xs text-gray-600">100% guaranteed</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Hero image/card (desktop) -->
        <div class="hidden lg:block">
          <div class="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
            <h3 class="text-sm font-semibold text-white/90">Why shop with us?</h3>
            <div class="mt-4 space-y-3">
              <div class="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
                <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 text-xl">⚡</div>
                <div>
                  <div class="text-sm font-bold text-white">Flash Deals Daily</div>
                  <div class="mt-0.5 text-xs text-white/75">Save on your weekly essentials</div>
                </div>
              </div>
              <div class="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
                <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 text-xl">🥬</div>
                <div>
                  <div class="text-sm font-bold text-white">Farm Fresh Produce</div>
                  <div class="mt-0.5 text-xs text-white/75">Hand-picked for quality</div>
                </div>
              </div>
              <div class="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
                <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 text-xl">🔄</div>
                <div>
                  <div class="text-sm font-bold text-white">Quick Reorder</div>
                  <div class="mt-0.5 text-xs text-white/75">Repeat past orders instantly</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const headingStyle = computed(() => ({
  fontFamily: "ui-serif, 'Playfair Display', Georgia, 'Times New Roman', Times, serif"
}))
</script>
