<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="w-full max-w-md text-center">
      <!-- Lock Icon -->
      <div class="w-20 h-20 bg-red-100 rounded-full mx-auto mb-6 flex items-center justify-center">
        <svg class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>

      <h1 class="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
      <p class="text-gray-600 mb-8">
        You don't have permission to access this page.
      </p>

      <!-- Reason Card -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div v-if="reason === 'insufficient_permissions'" class="text-left">
          <h3 class="font-medium text-gray-900 mb-2">Staff Access Required</h3>
          <p class="text-sm text-gray-600 mb-4">
            This area is restricted to Home Affairs staff members. If you believe you should have access, please contact your administrator.
          </p>
          <ul class="text-sm text-gray-500 space-y-1">
            <li class="flex items-center gap-2">
              <svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Required role: Staff, Admin, or Manager
            </li>
            <li class="flex items-center gap-2">
              <svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Your account must be active
            </li>
          </ul>
        </div>

        <div v-else>
          <h3 class="font-medium text-gray-900 mb-2">Restricted Area</h3>
          <p class="text-sm text-gray-600">
            You are not authorized to view this page. Please sign in with an appropriate account.
          </p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="space-y-3">
        <button
          @click="goHome"
          class="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors"
        >
          Go to Homepage
        </button>
        
        <button
          @click="goBack"
          class="w-full py-3 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-xl transition-colors"
        >
          Go Back
        </button>

        <button
          v-if="user"
          @click="signOut"
          class="w-full py-3 px-4 text-red-600 hover:bg-red-50 font-medium rounded-xl transition-colors"
        >
          Sign Out
        </button>
      </div>

      <!-- Help Text -->
      <p class="mt-8 text-xs text-gray-500">
        Need help? Contact support at 
        <a href="tel:+23412345678" class="text-red-600 hover:underline">+234 1 234 5678</a>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const user = useSupabaseUser()
const supabase = useSupabaseClient()

const reason = computed(() => route.query.reason as string)

function goHome() {
  navigateTo('/')
}

function goBack() {
  router.back()
}

async function signOut() {
  await supabase.auth.signOut()
  navigateTo('/auth')
}

// Log the access attempt for security
onMounted(() => {
  console.warn('[Forbidden] Access denied:', {
    reason: reason.value,
    user: user.value?.email || 'Not logged in',
    path: route.fullPath,
    timestamp: new Date().toISOString()
  })
})
</script>
