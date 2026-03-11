<template>
  <div class="min-h-screen bg-gray-50">
    <AppHeader />

    <main class="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:max-w-4xl lg:py-8">
      <!-- Progress Bar -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div class="flex flex-1 items-center">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm transition-colors"
              :class="
                step >= 1
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              "
            >
              <svg
                v-if="step > 1"
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span v-else>1</span>
            </div>
            <div
              class="h-1 flex-1 mx-2 rounded-full transition-colors"
              :class="step >= 2 ? 'bg-red-600' : 'bg-gray-200'"
            ></div>
          </div>

          <div class="flex flex-1 items-center">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm transition-colors"
              :class="
                step >= 2
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              "
            >
              <svg
                v-if="step > 2"
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span v-else>2</span>
            </div>
            <div
              class="h-1 flex-1 mx-2 rounded-full transition-colors"
              :class="step >= 3 ? 'bg-red-600' : 'bg-gray-200'"
            ></div>
          </div>

          <div
            class="flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm transition-colors"
            :class="
              step >= 3 ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600'
            "
          >
            3
          </div>
        </div>
        <div class="mt-2 flex justify-between text-xs sm:text-sm">
          <span
            :class="step >= 1 ? 'text-red-600 font-medium' : 'text-gray-500'"
            >Fulfillment</span
          >
          <span
            :class="step >= 2 ? 'text-red-600 font-medium' : 'text-gray-500'"
            >Details</span
          >
          <span
            :class="step >= 3 ? 'text-red-600 font-medium' : 'text-gray-500'"
            >Payment</span
          >
        </div>
      </div>

      <!-- Step 1: Fulfillment Selection -->
      <div v-if="step === 1" class="space-y-6">
        <div class="text-center">
          <h1 class="text-xl sm:text-2xl font-bold text-gray-900">
            How would you like to receive your order?
          </h1>
          <p class="mt-2 text-sm text-gray-600">
            Choose your preferred delivery method
          </p>
        </div>

        <!-- Fulfillment Toggle -->
        <div class="grid gap-4 sm:grid-cols-2">
          <button
            @click="selectFulfillment('delivery')"
            class="relative rounded-xl border-2 p-5 text-left transition-all"
            :class="
              fulfillmentMode === 'delivery'
                ? 'border-red-600 bg-red-50'
                : 'border-gray-200 hover:border-gray-300'
            "
          >
            <div class="flex items-start gap-3">
              <div
                class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl"
                :class="
                  fulfillmentMode === 'delivery'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                "
              >
                <svg
                  class="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
                  />
                </svg>
              </div>
              <div>
                <p
                  class="font-bold"
                  :class="
                    fulfillmentMode === 'delivery'
                      ? 'text-red-600'
                      : 'text-gray-900'
                  "
                >
                  Home Delivery
                </p>
                <p class="text-sm text-gray-600 mt-1">
                  We bring it to your doorstep
                </p>
                <p class="text-sm font-medium text-gray-900 mt-2">
                  From ₦1,200
                </p>
              </div>
            </div>
            <div
              v-if="fulfillmentMode === 'delivery'"
              class="absolute top-3 right-3"
            >
              <svg
                class="h-5 w-5 text-red-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
          </button>

          <button
            @click="selectFulfillment('pickup')"
            class="relative rounded-xl border-2 p-5 text-left transition-all"
            :class="
              fulfillmentMode === 'pickup'
                ? 'border-red-600 bg-red-50'
                : 'border-gray-200 hover:border-gray-300'
            "
          >
            <div class="flex items-start gap-3">
              <div
                class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl"
                :class="
                  fulfillmentMode === 'pickup'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                "
              >
                <svg
                  class="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                  />
                </svg>
              </div>
              <div>
                <p
                  class="font-bold"
                  :class="
                    fulfillmentMode === 'pickup'
                      ? 'text-red-600'
                      : 'text-gray-900'
                  "
                >
                  Store Pickup
                </p>
                <p class="text-sm text-gray-600 mt-1">
                  Pick up from a HomeAffairs location
                </p>
                <p class="text-sm font-medium text-green-600 mt-2">FREE</p>
              </div>
            </div>
            <div
              v-if="fulfillmentMode === 'pickup'"
              class="absolute top-3 right-3"
            >
              <svg
                class="h-5 w-5 text-red-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
          </button>
        </div>

        <!-- Delivery Area Selection -->
        <div
          v-if="fulfillmentMode === 'delivery'"
          class="rounded-xl border-2 border-gray-200 bg-white p-5"
        >
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Select Your Area in Lagos <span class="text-red-600">*</span>
          </label>
          <select
            v-model="selectedArea"
            @change="updateDeliveryFee"
            class="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-red-600 focus:outline-none"
          >
            <option value="">Choose your area...</option>
            <option
              v-for="zone in deliveryZones"
              :key="zone.id"
              :value="zone.id"
            >
              {{ zone.name }} - {{ formatPrice(zone.fee) }}
            </option>
          </select>

          <p
            v-if="selectedArea"
            class="mt-3 text-sm text-green-600 font-medium"
          >
            Delivery fee: {{ formatPrice(currentDeliveryFee) }}
          </p>
        </div>

        <!-- Store Locations for Pickup -->
        <div v-if="fulfillmentMode === 'pickup'" class="space-y-4">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-gray-700">Pickup</p>
            <button
              v-if="userLocation"
              @click="getUserLocation"
              class="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <svg
                class="h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Refresh Location
            </button>
          </div>

          <!-- Selected Pickup Card (Smart Default) - ALWAYS show when selected -->
          <div
            v-if="selectedStore"
            class="rounded-xl border-2 border-gray-200 bg-white p-5"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0 flex-1">
                <p class="text-xs font-semibold text-gray-500">
                  Pickup from your selected store:
                </p>
                <div class="mt-1 flex items-center gap-2">
                  <p class="font-bold text-gray-900 truncate">
                    {{ selectedStore.name }}
                  </p>
                  <span
                    class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                  >
                    Ready in 30 mins
                  </span>
                </div>
                <p class="mt-1 text-sm text-gray-600">
                  {{ selectedStore.address }}
                </p>
                <div class="mt-2 flex items-center gap-3 text-xs">
                  <span class="text-gray-500">{{ selectedStore.hours }}</span>
                  <span
                    v-if="selectedStore.distance !== null"
                    class="text-red-600 font-medium"
                  >
                    {{ selectedStore.distance.toFixed(1) }} km away
                  </span>
                </div>
              </div>

              <div class="flex flex-col items-end gap-2">
                <span
                  class="px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="
                    selectedStore.isOpen
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  "
                >
                  {{ selectedStore.isOpen ? "Open" : "Closed" }}
                </span>
              </div>
            </div>
          </div>

          <!-- Delivery Suggestion Banner -->
          <div
            v-if="selectedStore"
            class="rounded-xl border-2 border-blue-200 bg-blue-50 p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-bold text-blue-900">
                  Prefer delivery instead?
                </p>
                <p class="mt-1 text-sm text-blue-800">
                  You are picking up from {{ selectedStore.name }}. Would you
                  rather have our rider deliver it to you for just ₦1,500?
                </p>
              </div>
              <button
                type="button"
                class="whitespace-nowrap rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                @click="switchToDeliveryFromPickup"
              >
                Switch to Delivery
              </button>
            </div>
          </div>

          <!-- Location Loading -->
          <div
            v-if="loadingLocation"
            class="flex items-center gap-2 text-sm text-gray-500 py-2"
          >
            <div
              class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-red-600"
            ></div>
            Finding nearest stores...
          </div>

          <!-- Skeleton Loaders -->
          <div v-else-if="loadingStores" class="space-y-3">
            <div
              v-for="n in 3"
              :key="n"
              class="rounded-xl border-2 border-gray-200 bg-white p-4 animate-pulse"
            >
              <div class="flex items-start gap-3">
                <div class="h-12 w-12 rounded-xl bg-gray-200"></div>
                <div class="flex-1 space-y-2">
                  <div class="h-4 w-3/4 rounded bg-gray-200"></div>
                  <div class="h-3 w-1/2 rounded bg-gray-200"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Pickup Time Selection -->
          <div
            v-if="selectedStore"
            class="rounded-xl border-2 border-gray-200 bg-white p-5"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-medium text-gray-900">
                  Pickup time <span class="text-red-600">*</span>
                </p>
                <p class="mt-1 text-xs text-gray-500">
                  Choose a time slot. We typically prepare orders within 30
                  minutes.
                </p>
              </div>

              <div
                v-if="selectedPickupTime"
                class="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
              >
                Selected
              </div>
            </div>

            <div
              v-if="!availablePickupTimes || availablePickupTimes.length === 0"
              class="mt-4"
            >
              <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p class="text-sm font-medium text-gray-900">
                  No pickup times available
                </p>
                <p class="mt-1 text-xs text-gray-600">
                  Please select a different branch or try again later.
                </p>
              </div>
            </div>

            <fieldset v-else class="mt-4">
              <legend class="sr-only">Select pickup time</legend>
              <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <label
                  v-for="(time, index) in availablePickupTimes"
                  :key="time.value"
                  :for="`pickup-time-${time.value}`"
                  class="cursor-pointer"
                >
                  <input
                    class="sr-only peer"
                    type="radio"
                    name="pickup_time"
                    :id="`pickup-time-${time.value}`"
                    :value="time.value"
                    v-model="selectedPickupTime"
                  />
                  <div
                    class="rounded-xl border-2 border-gray-200 bg-white px-3 py-3 text-left transition-colors peer-checked:border-red-600 peer-checked:bg-red-50 hover:border-gray-300"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <p class="text-sm font-medium text-gray-900">
                        {{ time.label }}
                      </p>
                      <span
                        v-if="index === 0"
                        class="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700"
                      >
                        Recommended
                      </span>
                    </div>
                    <p class="mt-1 text-[11px] text-gray-500">
                      Ready in ~30 mins
                    </p>
                  </div>
                </label>
              </div>
            </fieldset>

            <div class="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div class="flex items-start gap-2">
                <svg
                  class="h-4 w-4 text-gray-500 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p class="text-xs text-gray-600">
                  Store hours: 8:00 AM - 9:00 PM. If you're running late, you
                  can still pick up later the same day.
                </p>
              </div>
            </div>
          </div>

          <!-- Pickup Instructions Block -->
          <div
            v-if="selectedStore && selectedStore.pickupInstructions"
            class="rounded-xl border-2 border-amber-200 bg-amber-50 p-4"
          >
            <div class="flex items-start gap-2">
              <svg
                class="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p class="font-medium text-amber-900">
                  How to collect your order
                </p>
                <p class="text-sm text-amber-800 mt-1">
                  {{ selectedStore.pickupInstructions }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation -->
        <div class="flex gap-3 pt-4">
          <NuxtLink
            to="/cart"
            class="flex-1 rounded-xl border-2 border-gray-200 bg-white py-4 text-sm font-bold text-gray-700 hover:bg-gray-50 text-center inline-block"
          >
            Back to Cart
          </NuxtLink>
          <button
            @click="goToStep2"
            :disabled="!canProceedStep1"
            class="flex-1 rounded-xl bg-red-600 py-4 text-sm font-bold text-white hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>

      <!-- Step 2: User Details -->
      <div v-if="step === 2" class="space-y-6">
        <div class="text-center">
          <h1 class="text-xl sm:text-2xl font-bold text-gray-900">
            Your Details
          </h1>
          <p class="mt-2 text-sm text-gray-600">
            We'll use this to contact you about your order
          </p>
        </div>

        <form @submit.prevent="goToStep3" class="space-y-4">
          <!-- Full Name -->
          <div>
            <label
              for="fullName"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Full Name <span class="text-red-600">*</span>
            </label>
            <input
              id="fullName"
              v-model="userDetails.fullName"
              type="text"
              name="name"
              autocomplete="name"
              placeholder="John Doe"
              required
              class="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-red-600 focus:outline-none"
            />
          </div>

          <!-- Phone Number -->
          <div>
            <label
              for="phone"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Phone Number <span class="text-red-600">*</span>
            </label>
            <input
              id="phone"
              v-model="userDetails.phone"
              type="tel"
              name="tel"
              autocomplete="tel"
              placeholder="08012345678"
              required
              class="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-red-600 focus:outline-none"
            />
          </div>

          <!-- Street Address -->
          <div>
            <label
              for="streetAddress"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Street Address <span class="text-red-600">*</span>
            </label>
            <input
              id="streetAddress"
              v-model="userDetails.streetAddress"
              type="text"
              name="street-address"
              autocomplete="street-address"
              placeholder="123 Adeola Odeku Street"
              required
              class="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-red-600 focus:outline-none"
            />
          </div>

          <!-- Landmark (Mandatory for Lagos) -->
          <div>
            <label
              for="landmark"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Nearest Landmark or Bus Stop <span class="text-red-600">*</span>
            </label>
            <input
              id="landmark"
              v-model="userDetails.landmark"
              type="text"
              name="landmark"
              autocomplete="off"
              placeholder="e.g., Near Zenith Bank, Gbagada Branch"
              required
              class="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-red-600 focus:outline-none"
            />
            <p class="mt-1 text-xs text-gray-500">
              <svg
                class="inline h-3 w-3 mr-1 text-amber-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              This helps our rider find you quickly in Lagos
            </p>
          </div>

          <!-- Navigation -->
          <div class="flex gap-3 pt-6">
            <button
              type="button"
              @click="step = 1"
              class="flex-1 rounded-xl border-2 border-gray-200 bg-white py-4 text-sm font-bold text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              type="submit"
              class="flex-1 rounded-xl bg-red-600 py-4 text-sm font-bold text-white hover:bg-red-700"
            >
              Continue to Payment
            </button>
          </div>
        </form>
      </div>

      <!-- Step 3: Order Review & Payment -->
      <div v-if="step === 3" class="space-y-6">
        <div class="text-center">
          <h1 class="text-xl sm:text-2xl font-bold text-gray-900">
            Review & Pay
          </h1>
          <p class="mt-2 text-sm text-gray-600">
            To ensure priority packing and safety, HomeAffairs currently accepts
            secure online payments only.
          </p>
        </div>

        <div
          v-if="fulfillmentMode === 'pickup'"
          class="rounded-xl border-2 border-amber-200 bg-amber-50 p-4"
        >
          <p class="font-bold text-amber-900">
            Store Pickup requires upfront payment to secure your inventory and
            priority packing.
          </p>
        </div>

        <!-- // Final Bill Breakdown - "Logistics Bundle" Strategy -->
        <div class="rounded-xl border-2 border-gray-200 bg-white p-5">
          <h2 class="font-bold text-gray-900 mb-4">Final Bill</h2>

          <div class="space-y-3">
            <!-- In-Store Prices (Preserved for merchant) -->
            <div class="flex justify-between text-sm">
              <span class="text-gray-600"
                >Subtotal ({{ cartStore.cartCount }} items)</span
              >
              <span class="font-medium">{{
                formatPrice(cartStore.cartSubtotal)
              }}</span>
            </div>

            <!-- Single "Logistics Bundle" Line Item -->
            <div class="flex justify-between text-sm">
              <span class="text-gray-600 flex items-center gap-1">
                {{
                  fulfillmentMode === "pickup"
                    ? "Packaging & Handling"
                    : "Delivery, Packaging & Handling"
                }}
                <span
                  class="group relative cursor-help"
                  :title="
                    fulfillmentMode === 'pickup'
                      ? 'Includes platform processing and payment handling'
                      : 'Includes delivery fee, platform processing, and payment handling'
                  "
                >
                  <svg
                    class="h-4 w-4 text-gray-400 hover:text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </span>
              </span>
              <span class="font-medium">{{
                formatPrice(cartStore.logisticsBundleFee)
              }}</span>
            </div>

            <!-- Online Payment Discount (if applicable) -->
            <div
              v-if="
                onlinePaymentDiscountEligible && fulfillmentMode === 'delivery'
              "
              class="flex justify-between text-sm text-green-600"
            >
              <span class="font-medium">First Order Discount</span>
              <span class="font-bold">-₦500</span>
            </div>

            <div class="border-t pt-3">
              <div class="flex justify-between items-center">
                <span class="text-base font-bold text-gray-900"
                  >Total to Pay</span
                >
                <span class="text-2xl font-bold text-red-600">{{
                  formatPrice(cartStore.finalTotal)
                }}</span>
              </div>
              <p class="text-xs text-gray-500 mt-2">
                Store receives exact in-store prices. You pay only the logistics
                & handling fee shown above.
              </p>
            </div>
          </div>
        </div>

        <!-- Pay Button -->
        <div class="space-y-3">
          <div
            v-if="!canPayOnline"
            class="rounded-xl border-2 border-gray-200 bg-gray-50 p-4"
          >
            <p class="font-bold text-gray-900">Online payment unavailable</p>
            <p class="mt-1 text-sm text-gray-600">
              This branch is not configured for Paystack routing yet.
              <span v-if="fulfillmentMode === 'pickup'">
                Please switch to Delivery or pick a different branch.
              </span>
              <span v-else> Please pick a different branch. </span>
            </p>
          </div>

          <button
            @click="initiatePaystackPayment()"
            :disabled="!canSubmitPayment"
            class="w-full rounded-xl bg-red-600 py-4 text-sm font-bold text-white hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
          >
            <span
              v-if="processingPayment"
              class="flex items-center justify-center gap-2"
            >
              <svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
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
              Processing...
            </span>
            <span v-else>
              {{ `Proceed to Pay ${formatPrice(cartStore.finalTotal)}` }}
            </span>
          </button>

          <div
            class="flex items-center justify-center gap-4 text-xs text-gray-500"
          >
            <span class="flex items-center gap-1">
              <svg
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              Secure Payment
            </span>
          </div>
        </div>

        <!-- Navigation -->
        <div class="flex gap-3">
          <button
            @click="step = 2"
            class="flex-1 rounded-xl border-2 border-gray-200 bg-white py-4 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            Back to Details
          </button>
        </div>
      </div>
    </main>

    <!-- Payment Processing Modal -->
    <div
      v-if="showPaymentModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 text-center">
        <div
          class="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-red-200 border-t-red-600"
        ></div>
        <h3 class="mt-4 text-lg font-bold text-gray-900">Processing Payment</h3>
        <p class="mt-2 text-sm text-gray-600">
          Please complete the payment in the Paystack window...
        </p>
      </div>
    </div>

    <!-- Toast Notification -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="translate-y-2 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-2 opacity-0"
      >
        <div
          v-if="toast.show"
          class="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-xl px-6 py-3 text-sm font-medium text-white shadow-lg sm:bottom-8"
          :class="
            toast.type === 'success'
              ? 'bg-green-600'
              : toast.type === 'error'
                ? 'bg-red-600'
                : 'bg-blue-600'
          "
        >
          <div class="flex items-center gap-2">
            <svg
              v-if="toast.type === 'success'"
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <svg
              v-else-if="toast.type === 'error'"
              class="h-5 w-5"
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
            <svg
              v-else
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{{ toast.message }}</span>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { useCartStore } from "~/stores/useCartStore";
import { navigateTo } from "#app";
import { useStoreStore } from "~/stores/store";
import { useBranchStore } from "~/stores/useBranchStore";
import { useFees } from "~/composables/useFees";

const cartStore = useCartStore();
const storeStore = useStoreStore();
const branchStore = useBranchStore();
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const userLoading = computed(() => user.value === undefined); // Supabase user starts as undefined while loading

if (import.meta.client) {
  storeStore.loadFromLocalStorage();
}

const step = ref(1);
const fulfillmentMode = ref<"delivery" | "pickup" | null>(null);
const selectedArea = ref("");
const selectedStoreId = ref<string | null>(null);
const selectedPickupTime = ref<string | null>(null);
const currentDeliveryFee = ref(0);

const loadingStores = ref(false);
const loadingLocation = ref(false);
const processingPayment = ref(false);
const showPaymentModal = ref(false);

const userLocation = ref<{ lat: number; lng: number } | null>(null);

const userDetails = ref({
  fullName: "",
  phone: "",
  streetAddress: "",
  landmark: "",
});

// Toast notification state
const toast = ref({
  show: false,
  message: "",
  type: "success" as "success" | "error" | "info",
});

// Profile phone validation - required before checkout
const profileFetchPending = ref(false);
let profileFetchPromise: Promise<void> | null = null;

interface Store {
  id: string;
  name: string;
  address: string;
  hours: string;
  isFlagship?: boolean;
  latitude?: number;
  longitude?: number;
  distance: number | null;
  isOpen: boolean;
  pickupInstructions?: string;
  paystackSubaccountCode?: string | null;
}

const stores = ref<Store[]>([]);

const deliveryZones = [
  { id: "ikoyi-vi", name: "Ikoyi / Victoria Island", fee: 1500 },
  { id: "lekki-phase1", name: "Lekki Phase 1", fee: 1500 },
  { id: "lekki-phase2", name: "Lekki Phase 2", fee: 2000 },
  { id: "ajah", name: "Ajah", fee: 2500 },
  { id: "yaba-surulere", name: "Yaba / Surulere", fee: 1200 },
  { id: "ikeja", name: "Ikeja", fee: 1500 },
  { id: "gbagada", name: "Gbagada", fee: 1200 },
  { id: "ogudu", name: "Ogudu", fee: 1200 },
  { id: "maryland", name: "Maryland", fee: 1200 },
  { id: "ogba", name: "Ogba", fee: 1500 },
  { id: "magodo", name: "Magodo", fee: 1500 },
];

const {
  platformFee,
  platformFeeKobo,
  serviceFee,
  serviceFeeKobo,
  feeDescription,
} = useFees({
  subtotal: computed(() => cartStore.cartSubtotal),
  fulfillmentMode,
});

const onlinePaymentDiscountEligible = ref(false);
const onlinePaymentDiscountLoading = ref(false);

async function fetchOnlinePaymentDiscountEligibility() {
  if (!import.meta.client) return;
  const userId = user.value?.id || (user.value as any)?.sub;
  if (!userId) {
    onlinePaymentDiscountEligible.value = false;
    return;
  }

  onlinePaymentDiscountLoading.value = true;
  try {
    const { data, error } = await (supabase as any)
      .from("orders")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "paid")
      .limit(1);

    if (error) {
      onlinePaymentDiscountEligible.value = false;
      return;
    }

    onlinePaymentDiscountEligible.value = (data || []).length === 0;
  } finally {
    onlinePaymentDiscountLoading.value = false;
  }
}

const finalTotal = computed(() => {
  // Use cartStore's no-loss calculation which includes:
  // - Store subtotal (preserved for merchant)
  // - Platform profit + Paystack fee (grossed up)
  let total = cartStore.finalTotal;

  // Apply first-order discount for delivery if eligible
  const onlineDiscount =
    onlinePaymentDiscountEligible.value && fulfillmentMode.value === "delivery"
      ? 500
      : 0;

  return Math.max(0, total - onlineDiscount);
});

const selectedStore = computed(() => {
  return stores.value.find((s) => s.id === selectedStoreId.value);
});

const canPayOnline = computed(() => {
  // Delivery mode always allows online payment (platform handles it)
  if (fulfillmentMode.value === "delivery") return true;
  // Pickup mode requires the selected store to have Paystack configured
  return !!selectedStore.value?.paystackSubaccountCode;
});

const canSubmitPayment = computed(() => {
  if (processingPayment.value) return false;
  return canPayOnline.value;
});

const cartItemsStoreId = computed(() => {
  if (cartStore.items.length === 0) return null;
  const first = cartStore.items[0]?.store_id || null;
  if (!first) return null;
  const allSame = cartStore.items.every((it: any) => it?.store_id === first);
  return allSame ? String(first) : null;
});

const orderStoreId = computed(() => {
  return (
    cartItemsStoreId.value ||
    cartStore.currentStoreId ||
    branchStore.activeBranchId ||
    selectedStoreId.value ||
    null
  );
});

const sortedStores = computed(() => {
  if (!userLocation.value) return stores.value;
  return [...stores.value].sort((a, b) => {
    const distA = a.distance ?? Infinity;
    const distB = b.distance ?? Infinity;
    return distA - distB;
  });
});

// Generate available pickup time slots
const availablePickupTimes = computed(() => {
  const times: { value: string; label: string }[] = [];
  const now = new Date();
  const currentHour = now.getHours();

  // Store hours: 8 AM - 9 PM
  const startHour = Math.max(8, currentHour + 1); // Start from next hour
  const endHour = 21;

  for (let hour = startHour; hour < endHour; hour++) {
    const timeStr = `${hour.toString().padStart(2, "0")}:00`;
    const label =
      hour < 12
        ? `${hour}:00 AM`
        : hour === 12
          ? `12:00 PM`
          : `${hour - 12}:00 PM`;
    times.push({ value: timeStr, label });
  }

  return times;
});

const canProceedStep1 = computed(() => {
  if (!fulfillmentMode.value) return false;
  if (fulfillmentMode.value === "pickup")
    return !!selectedStoreId.value && !!selectedPickupTime.value;
  return !!selectedArea.value;
});

function formatPrice(price: number): string {
  return "₦" + price?.toLocaleString("en-NG") || "0";
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isStoreOpen(): boolean {
  const hour = new Date().getHours();
  return hour >= 8 && hour < 21;
}

function getUserLocation() {
  loadingLocation.value = true;
  if (!navigator.geolocation) {
    loadingLocation.value = false;
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLocation.value = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      // Update distances for all stores
      stores.value = stores.value.map((store) => {
        if (store.latitude && store.longitude) {
          return {
            ...store,
            distance: calculateDistance(
              userLocation.value!.lat,
              userLocation.value!.lng,
              store.latitude,
              store.longitude,
            ),
          };
        }
        return store;
      });
      loadingLocation.value = false;
    },
    () => {
      loadingLocation.value = false;
    },
  );
}

async function selectFulfillment(mode: "delivery" | "pickup") {
  fulfillmentMode.value = mode;
  if (mode === "pickup") {
    const preferredStoreId =
      branchStore.activeBranchId ||
      (cartStore.items.length > 0
        ? cartStore.currentStoreId
        : storeStore.selectedStore?.id) ||
      null;
    await loadStores();
    if (
      preferredStoreId &&
      stores.value.some((s) => s.id === preferredStoreId)
    ) {
      selectedStoreId.value = preferredStoreId;
    }
    getUserLocation();
  }
}

function switchToDeliveryFromPickup() {
  fulfillmentMode.value = "delivery";
  currentDeliveryFee.value = 0;
}

async function loadStores() {
  loadingStores.value = true;
  let query = supabase
    .from("stores")
    .select(
      "id, name, address, operating_hours, is_flagship, latitude, longitude, pickup_instructions, paystack_subaccount_code",
    )
    .eq("is_active", true);

  query = query.order("is_flagship", { ascending: false });

  const { data } = await query;

  if (data) {
    stores.value = data.map((s: any) => ({
      id: s.id,
      name: s.name,
      address: s.address,
      hours: "8:00 AM - 9:00 PM",
      isFlagship: s.is_flagship,
      latitude: s.latitude,
      longitude: s.longitude,
      distance: null,
      isOpen: isStoreOpen(),
      pickupInstructions:
        s.pickup_instructions || getDefaultPickupInstructions(s.name),
      paystackSubaccountCode: s.paystack_subaccount_code || null,
    }));

    const firstStore = stores.value[0];
    if (firstStore && !selectedStoreId.value) {
      selectedStoreId.value = firstStore.id;
    }
  }
  loadingStores.value = false;
}

function getDefaultPickupInstructions(storeName: string): string {
  const instructions: Record<string, string> = {
    Gbagada:
      "Park at the side entrance of the Gbagada Mall. Our pickup window is next to the security desk.",
    Lekki:
      "Enter through the main gate. Pickup is at the customer service counter on the ground floor.",
    Ikeja:
      "Use the rear parking lot. Pickup window is marked with HomeAffairs signage.",
    "Victoria Island": "Valet parking available. Pickup at the concierge desk.",
  };
  for (const [key, value] of Object.entries(instructions)) {
    if (storeName.includes(key)) return value;
  }
  return "Present your order confirmation at the pickup counter. Our staff will assist you.";
}

function updateDeliveryFee() {
  const zone = deliveryZones.find((z) => z.id === selectedArea.value);
  if (zone) {
    currentDeliveryFee.value = zone.fee;
    // Save delivery details to cart store so fees are calculated correctly
    cartStore.setDeliveryDetails({
      method: "delivery",
      deliveryZone: selectedArea.value,
      contactPhone: userDetails.value.phone || "",
    });
  }
}

function goToStep2() {
  if (fulfillmentMode.value === "pickup") {
    currentDeliveryFee.value = 0;
    // Save pickup details to cart store
    cartStore.setDeliveryDetails({
      method: "pickup",
      contactPhone: userDetails.value.phone || "",
    });
  }
  step.value = 2;
}

async function goToStep3() {
  await fetchProfile();
  step.value = 3;
}

async function initiatePaystackPayment() {
  // Extract user ID from JWT (sub field) or id field
  const userId = user.value?.id || (user.value as any)?.sub;
  const userEmail = user.value?.email;

  if (!userEmail || !userId) {
    console.error("[Paystack] User not authenticated:", {
      userId,
      userEmail,
      user: user.value,
    });
    alert("Please log in to continue");
    return;
  }

  processingPayment.value = true;
  showPaymentModal.value = true;

  if (!orderStoreId.value) {
    throw new Error("Please select a store to continue.");
  }

  if (
    cartStore.items.length > 0 &&
    cartItemsStoreId.value &&
    cartItemsStoreId.value !== orderStoreId.value
  ) {
    throw new Error(
      "Your cart contains items from a different store. Please clear your cart and try again.",
    );
  }

  if (cartStore.currentStoreId !== orderStoreId.value) {
    cartStore.currentStoreId = orderStoreId.value;
  }

  try {
    // Server-authoritative stock validation (prevents stale client stock)
    const { data: sessionData } = await useSupabaseClient().auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) throw new Error("Session expired. Please log in again.");

    const validation: { ok: boolean; issues?: any[] } = await $fetch(
      "/api/orders/validate-cart-stock",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: {
          store_id: orderStoreId.value,
          items: cartStore.items.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
          })),
        },
      },
    );

    if (!validation?.ok) {
      throw new Error(
        "Some items are no longer available. Please refresh your cart.",
      );
    }

    const reserved = await cartStore.createReservation(supabase);
    if (!reserved) {
      alert("Some items are no longer available");
      processingPayment.value = false;
      showPaymentModal.value = false;
      return;
    }

    const timeoutMinutes = Number(
      (useRuntimeConfig() as any).orderPaymentTimeoutMinutes || 15,
    );
    const paymentExpiresAt = new Date(
      Date.now() + timeoutMinutes * 60 * 1000,
    ).toISOString();

    const orderDeliveryDetails =
      fulfillmentMode.value === "delivery"
        ? {
            address: {
              area: selectedArea.value,
              street: userDetails.value.streetAddress,
              landmark: userDetails.value.landmark,
            },
            contactPhone: userDetails.value.phone,
            contactName: userDetails.value.fullName,
          }
        : {
            contactPhone: userDetails.value.phone,
            contactName: userDetails.value.fullName,
            pickup_store_id: selectedStoreId.value || null,
          };

    const {
      data: orderData,
      error: orderCreateErr,
    }: { data: { id: string } | null; error: any } = await (supabase
      .from("orders")
      .insert({
        user_id: userId,
        store_id: orderStoreId.value,
        status: "pending",
        items: cartStore.items.map((item) => ({
          product_id: item.product_id,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
          options: item.options || {},
        })),
        delivery_method: fulfillmentMode.value,
        subtotal: cartStore.cartSubtotal,
        logistics_bundle_fee: cartStore.logisticsBundleFee,
        platform_profit: cartStore.platformProfit,
        paystack_fee: cartStore.paystackFee,
        total_amount: finalTotal.value,
        payment_method: "paystack",
        contact_name: userDetails.value.fullName,
        contact_phone: userDetails.value.phone,
        delivery_details: orderDeliveryDetails as any,
        pickup_time:
          fulfillmentMode.value === "pickup" && selectedPickupTime.value
            ? new Date(
                `${new Date().toISOString().split("T")[0]}T${selectedPickupTime.value}:00`,
              ).toISOString()
            : null,
        metadata: {
          payment_expires_at: paymentExpiresAt,
          service_fee: serviceFee.value,
          delivery_zone: selectedArea.value,
        },
      } as any)
      .select("id")
      .single() as any);

    if (orderCreateErr) {
      console.error("[Checkout] Failed to create order:", orderCreateErr);
      const code = (orderCreateErr as any)?.code;
      throw new Error(
        `${orderCreateErr.message || "Failed to create order"}${code ? ` (code: ${code})` : ""}`,
      );
    }

    if (!orderData?.id) {
      console.error("[Checkout] Order create returned no id:", orderData);
      throw new Error("Failed to create order");
    }

    // Optional: recheck stock right before payment init (server will also enforce)
    const shouldRecheck = !!(useRuntimeConfig() as any)
      .inventoryRecheckBeforePayment;
    if (shouldRecheck) {
      const again: { ok: boolean } = await $fetch(
        "/api/orders/validate-cart-stock",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: {
            store_id: orderStoreId.value,
            items: cartStore.items.map((i) => ({
              product_id: i.product_id,
              quantity: i.quantity,
            })),
          },
        },
      );
      if (!again?.ok) {
        throw new Error(
          "Stock changed. Please refresh your cart and try again.",
        );
      }
    }

    // Customer pays full amount including service fee
    // Service fee will be deducted and sent to platform via transaction_charge
    const customerTotalAmount = finalTotal.value;

    const response: { authorization_url: string; reference?: string } =
      await $fetch("/api/paystack/initialize", {
        method: "POST",
        body: {
          email: userEmail,
          amount: Math.round(customerTotalAmount * 100), // Full amount customer pays
          service_fee_kobo: cartStore.platformProfit * 100, // Amount platform keeps
          metadata: {
            order_id: orderData?.id,
            user_id: userId,
            customer_name: userDetails.value.fullName,
            customer_phone: userDetails.value.phone,
            store_id: orderStoreId.value,
            items: cartStore.items.map((item) => ({
              product_id: item.product_id,
              name: item.name,
              quantity: item.quantity,
              price: item.price,
            })),
            delivery_method: fulfillmentMode.value as any,
            delivery_details:
              fulfillmentMode.value === "delivery"
                ? {
                    area: selectedArea.value,
                    street: userDetails.value.streetAddress,
                    landmark: userDetails.value.landmark,
                    contactPhone: userDetails.value.phone,
                  }
                : {
                    contactPhone: userDetails.value.phone,
                  },
            store_address: selectedStore.value?.address,
            subtotal: cartStore.cartSubtotal,
            processing_and_packaging_fee: cartStore.platformProfit,
            logistics_and_handling_fee: cartStore.logisticsBundleFee,
            paystack_fee: cartStore.paystackFee,
            total_paid_by_customer: finalTotal.value,
            pickup_store_id:
              fulfillmentMode.value === "pickup" ? selectedStoreId.value : null,
            payment_expires_at: paymentExpiresAt,
          },
        },
      });

    if (response?.reference && orderData?.id) {
      await (supabase as any)
        .from("orders")
        .update({ paystack_reference: response.reference })
        .eq("id", orderData.id);
    }

    if (response.authorization_url) {
      window.location.href = response.authorization_url;
    }

    if (paymentExpiresAt && orderData?.id && import.meta.client) {
      setTimeout(
        async () => {
          try {
            await $fetch("/api/orders/expire-unpaid", {
              method: "POST",
              body: { orderId: orderData.id },
            });
          } catch (e) {
            console.error("[Order Expiry] Failed to expire unpaid order", e);
          }
        },
        timeoutMinutes * 60 * 1000,
      );
    }
  } catch (error: any) {
    const message = getUserFacingErrorMessage(error, "Payment failed");
    alert(message);
    processingPayment.value = false;
    showPaymentModal.value = false;
  }
}

onMounted(async () => {
  // Initial attempt - may fail if user not loaded yet
  await fetchProfile();
  await fetchOnlinePaymentDiscountEligibility();
});

// Watch for user becoming available (handles timing issues)
watch(
  () => user.value?.id,
  async (newUserId, oldUserId) => {
    if (newUserId && newUserId !== oldUserId) {
      await fetchProfile();
      await fetchOnlinePaymentDiscountEligibility();
    }
  },
  { immediate: true },
);

async function fetchProfile() {
  if (!user.value?.id) return;

  if (profileFetchPromise) {
    await profileFetchPromise;
    return;
  }

  profileFetchPromise = (async () => {
    profileFetchPending.value = true;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone_number")
        .eq("id", user.value!.id)
        .single();

      if (error) {
        console.error("[Checkout] Failed to fetch profile:", error);
        return;
      }

      if (data) {
        // Pre-fill checkout form
        userDetails.value.fullName = (data as any).full_name || "";
        userDetails.value.phone = (data as any).phone_number || "";
      }
    } finally {
      profileFetchPending.value = false;
      profileFetchPromise = null;
    }
  })();

  await profileFetchPromise;
}

definePageMeta({ middleware: ["auth"] });

function getUserFacingErrorMessage(error: any, fallback: string) {
  const fromServer = error?.data?.statusMessage || error?.data?.message;
  if (typeof fromServer === "string" && fromServer.trim()) return fromServer;

  const msg = error?.statusMessage || error?.message;
  if (typeof msg === "string" && msg.trim()) {
    if (
      msg.includes("/api/") ||
      msg.includes("fetch") ||
      msg.includes("FetchError")
    )
      return fallback;
    return msg;
  }

  return fallback;
}

// Show toast notification
const showToast = (
  message: string,
  type: "success" | "error" | "info" = "success",
  duration: number = 3000,
) => {
  toast.value = { show: true, message, type };
  setTimeout(() => {
    toast.value.show = false;
  }, duration);
};
</script>
