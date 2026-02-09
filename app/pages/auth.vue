<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
        <!-- Redirect Notice -->
        <div v-if="unauthorizedReason" class="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <p class="font-medium text-amber-900">Authentication Required</p>
              <p class="text-sm text-amber-700">
                Please sign in to continue to {{ redirectPath !== '/' ? 'your requested page' : 'Home Affairs' }}.
              </p>
            </div>
          </div>
        </div>
      <div class="text-center mb-8">
        <div class="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900">Home Affairs</h1>
        <p class="text-gray-600 mt-1">Sign in to continue</p>
      </div>

      <!-- Auth Card -->
      <FormCard class="shadow-xl border-0">
        <div class="space-y-4">
          <!-- Success State - Link Sent -->
          <div v-if="emailSent" class="text-center space-y-5 py-4">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-2">Check your email</h3>
              <p class="text-sm text-gray-600">
                We've sent a login link to<br>
                <span class="font-medium text-gray-900">{{ sentEmail }}</span>
              </p>
            </div>
            <div class="bg-blue-50 p-4 rounded-lg text-left">
              <p class="text-sm text-blue-800">
                <span class="font-semibold">Next steps:</span><br>
                1. Open your email inbox<br>
                2. Look for an email from Home Affairs<br>
                3. Click the login link to sign in instantly
              </p>
            </div>
            <div class="space-y-3 pt-2">
              <p v-if="resendCountdown > 0" class="text-sm text-gray-500">
                Didn't receive it? You can request a new link in {{ resendCountdown }} seconds
              </p>
              <FormButton
                v-else
                variant="outline"
                color="neutral"
                size="sm"
                :loading="loading"
                @click="sendMagicLink"
              >
                Resend login link
              </FormButton>
              <div>
                <FormButton
                  variant="ghost"
                  color="neutral"
                  size="sm"
                  @click="resetForm"
                >
                  Use a different email address
                </FormButton>
              </div>
            </div>
          </div>

          <!-- Email Input Form -->
          <div v-else class="space-y-4">
            <FormInput
              v-model="email"
              type="email"
              label="Email Address"
              help="We'll send you a login link"
              placeholder="you@example.com"
              size="lg"
            >
              <template #leading>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
              </template>
            </FormInput>

            <FormButton
              block
              size="lg"
              :loading="loading"
              :disabled="!isValidEmail"
              @click="sendMagicLink"
            >
              Send Login Link
            </FormButton>

            <p class="text-xs text-gray-500 text-center">
              Click the link in your email to sign in instantly
            </p>
          </div>
        </div>
      </FormCard>

      <!-- Success Notification -->
      <FormNotification
        v-if="notification.show"
        :show="notification.show"
        :title="notification.title"
        :description="notification.description"
        :color="notification.color"
        @close="notification.show = false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { useCartStore } from '~/stores/useCartStore'

// Types
type NotificationType = {
  show: boolean
  title: string
  description: string
  color: 'green' | 'red' | 'blue'
}

// Get redirect URL from query
const route = useRoute()
const redirectPath = computed(() => {
  const redirect = route.query.redirect as string
  return redirect && redirect !== '/auth' ? redirect : '/'
})
const unauthorizedReason = computed(() => route.query.reason as string)

// State
const loading = ref(false)
const email = ref('')
const sentEmail = ref('')
const emailSent = ref(false)
const resendCountdown = ref(0)
let resendTimer: ReturnType<typeof setInterval> | null = null
const notification = ref<NotificationType>({
  show: false,
  title: '',
  description: '',
  color: 'green'
})

// Supabase
const supabase = useSupabaseClient()
const config = useRuntimeConfig()

// Email validation
const isValidEmail = computed(() => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)
})

// Show notification helper
const showNotification = (title: string, description: string, color: 'green' | 'red' | 'blue' = 'green') => {
  notification.value = {
    show: true,
    title,
    description,
    color
  }
  setTimeout(() => {
    notification.value.show = false
  }, 5000)
}

// Magic link flow
const sendMagicLink = async () => {
  loading.value = true
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.value,
      options: {
        emailRedirectTo: `${config.public.siteUrl}/confirm`
      }
    })

    if (error) throw error

    // Store the email and show success state
    sentEmail.value = email.value
    emailSent.value = true
    startResendCountdown()
    showNotification('Login Link Sent!', 'Check your email for the sign-in link.', 'green')
  } catch (error: any) {
    showNotification('Error', error.message || 'Failed to send login link. Please try again.', 'red')
  } finally {
    loading.value = false
  }
}

// Resend countdown timer
const startResendCountdown = () => {
  resendCountdown.value = 60
  if (resendTimer) clearInterval(resendTimer)
  resendTimer = setInterval(() => {
    if (resendCountdown.value > 0) {
      resendCountdown.value--
    } else {
      if (resendTimer) clearInterval(resendTimer)
    }
  }, 1000)
}

// Reset form to enter different email
const resetForm = () => {
  emailSent.value = false
  email.value = ''
  sentEmail.value = ''
  if (resendTimer) clearInterval(resendTimer)
  resendCountdown.value = 0
}

// Cleanup on unmount
onBeforeUnmount(() => {
  if (resendTimer) clearInterval(resendTimer)
})
</script>

