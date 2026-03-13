<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { usePushNotifications } from '~/composables/usePushNotifications'

const props = defineProps<{
  user: any
}>()

const emit = defineEmits<{
  (e: 'subscribed'): void
  (e: 'unsubscribed'): void
}>()

const {
  isSupported,
  permission,
  isSubscribed,
  isLoading,
  subscribe,
  unsubscribe,
  requestPermission
} = usePushNotifications()

const showSettings = ref(false)

async function handleSubscribe() {
  if (!props.user) return
  
  const result = await subscribe(props.user)
  if (result) {
    emit('subscribed')
  }
}

async function handleUnsubscribe() {
  const result = await unsubscribe()
  if (result) {
    emit('unsubscribed')
  }
}

async function handleRequestPermission() {
  const newPermission = await requestPermission()
  if (newPermission === 'granted') {
    await handleSubscribe()
  }
}

const canSubscribe = computed(() => {
  return isSupported.value && permission.value === 'granted' && !isSubscribed.value
})

const needsPermission = computed(() => {
  return isSupported.value && permission.value !== 'granted'
})

const isBlocked = computed(() => {
  return permission.value === 'denied'
})
</script>

<template>
  <div class="notification-settings">
    <!-- Toggle Button -->
    <button
      @click="showSettings = !showSettings"
      class="flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors"
      :class="isSubscribed ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600'"
    >
      <Icon :name="isSubscribed ? 'lucide:bell-ring' : 'lucide:bell-off'" size="18" />
      <span class="text-sm font-medium">
        {{ isSubscribed ? 'Notifications On' : 'Notifications Off' }}
      </span>
      <Icon :name="showSettings ? 'lucide:chevron-up' : 'lucide:chevron-down'" size="16" />
    </button>

    <!-- Settings Panel -->
    <div v-if="showSettings" class="mt-3 p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="space-y-4">
        <!-- Status -->
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600">Push Notifications</span>
          <span
            class="text-sm font-medium px-2 py-1 rounded-full"
            :class="{
              'bg-green-100 text-green-700': isSubscribed,
              'bg-gray-100 text-gray-600': !isSubscribed && !needsPermission,
              'bg-yellow-100 text-yellow-700': needsPermission && !isBlocked,
              'bg-red-100 text-red-700': isBlocked
            }"
          >
            {{ isSubscribed ? 'Active' : needsPermission ? 'Permission Needed' : isBlocked ? 'Blocked' : 'Inactive' }}
          </span>
        </div>

        <!-- Not Supported Message -->
        <div v-if="!isSupported" class="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
          Push notifications are not supported on this device or browser.
        </div>

        <!-- Blocked Message -->
        <div v-else-if="isBlocked" class="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
          Notifications are blocked. Please enable them in your browser settings to receive updates.
        </div>

        <!-- Permission Needed -->
        <div v-else-if="needsPermission" class="space-y-3">
          <p class="text-sm text-gray-600">
            Enable push notifications to get real-time updates about your orders, even when the app is closed.
          </p>
          <button
            @click="handleRequestPermission"
            :disabled="isLoading"
            class="w-full py-2.5 px-4 bg-[#ED1C24] text-white rounded-lg font-medium text-sm hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isLoading">Enabling...</span>
            <span v-else>Enable Notifications</span>
          </button>
        </div>

        <!-- Subscribe/Unsubscribe -->
        <div v-else-if="isSupported" class="space-y-3">
          <p v-if="!isSubscribed" class="text-sm text-gray-600">
            Get notified about order updates, delivery status, and promotions.
          </p>
          <p v-else class="text-sm text-gray-600">
            You'll receive notifications for:
            <ul class="mt-2 ml-4 list-disc text-xs space-y-1 text-gray-500">
              <li>Order confirmations</li>
              <li>Payment updates</li>
              <li>Driver assignments</li>
              <li>Delivery status changes</li>
            </ul>
          </p>
          
          <button
            v-if="!isSubscribed"
            @click="handleSubscribe"
            :disabled="isLoading"
            class="w-full py-2.5 px-4 bg-[#ED1C24] text-white rounded-lg font-medium text-sm hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isLoading">Subscribing...</span>
            <span v-else>Subscribe to Notifications</span>
          </button>
          
          <button
            v-else
            @click="handleUnsubscribe"
            :disabled="isLoading"
            class="w-full py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isLoading">Unsubscribing...</span>
            <span v-else>Turn Off Notifications</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notification-settings {
  position: relative;
}
</style>
