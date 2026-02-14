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
        <p class="text-gray-600 mt-1">{{ isSignUp ? 'Create an account' : 'Sign in to continue' }}</p>
      </div>

      <!-- Auth Card -->
      <FormCard class="shadow-xl border-0">
        <div class="space-y-4">
          <!-- Email Input -->
          <FormInput
            v-model="email"
            type="email"
            label="Email Address"
            placeholder="you@example.com"
            size="lg"
          >
            <template #leading>
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </template>
          </FormInput>

          <!-- Password Input -->
          <FormInput
            v-model="password"
            type="password"
            label="Password"
            placeholder="Enter your password"
            size="lg"
          >
            <template #leading>
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </template>
          </FormInput>

          <!-- Confirm Password (Sign Up only) -->
          <FormInput
            v-if="isSignUp"
            v-model="confirmPassword"
            type="password"
            label="Confirm Password"
            placeholder="Confirm your password"
            size="lg"
          >
            <template #leading>
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </template>
          </FormInput>

          <!-- Password Strength (Sign Up only) -->
          <div v-if="isSignUp && password" class="space-y-2">
            <div class="flex gap-1">
              <div v-for="i in 4" :key="i" class="h-1 flex-1 rounded-full" :class="passwordStrength >= i ? 'bg-green-500' : 'bg-gray-200'"></div>
            </div>
            <p class="text-xs text-gray-500">Password strength: {{ passwordStrengthLabel }}</p>
          </div>

          <!-- Main Action Button -->
          <FormButton
            block
            size="lg"
            :loading="loading"
            :disabled="!canSubmit"
            @click="handleAuth"
          >
            {{ isSignUp ? 'Create Account' : 'Sign In' }}
          </FormButton>

          <!-- Forgot Password Link -->
          <div v-if="!isSignUp" class="text-center">
            <FormButton
              variant="ghost"
              color="neutral"
              size="sm"
              @click="showForgotPassword = true"
            >
              Forgot password?
            </FormButton>
          </div>

          <!-- Toggle Sign Up / Sign In -->
          <div class="text-center pt-4 border-t">
            <p class="text-sm text-gray-600">
              {{ isSignUp ? 'Already have an account?' : "Don't have an account?" }}
              <FormButton
                variant="ghost"
                color="primary"
                size="sm"
                @click="toggleAuthMode"
              >
                {{ isSignUp ? 'Sign In' : 'Create Account' }}
              </FormButton>
            </p>
          </div>
        </div>
      </FormCard>

      <!-- Forgot Password Modal -->
      <div v-if="showForgotPassword" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" @click.self="showForgotPassword = false">
        <FormCard class="w-full max-w-sm shadow-2xl border-0">
          <div class="space-y-4">
            <div class="text-center">
              <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900">Reset Password</h3>
              <p class="text-sm text-gray-600 mt-1">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            <FormInput
              v-model="resetEmail"
              type="email"
              label="Email Address"
              placeholder="you@example.com"
              size="lg"
            />

            <div class="flex gap-3">
              <FormButton
                variant="outline"
                color="neutral"
                @click="showForgotPassword = false"
              >
                Cancel
              </FormButton>
              <FormButton
                flex-1
                :loading="resetLoading"
                :disabled="!isValidResetEmail"
                @click="sendPasswordReset"
              >
                Send Reset Link
              </FormButton>
            </div>

            <!-- Reset Success State -->
            <div v-if="resetSent" class="text-center space-y-3 pt-2">
              <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p class="text-sm text-green-700">Reset link sent! Check your email.</p>
            </div>
          </div>
        </FormCard>
      </div>

      <!-- Notification -->
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
import { ref, computed } from 'vue'
import { useUserStore } from '~/stores/user'
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
const isSignUp = ref(false)
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const notification = ref<NotificationType>({
  show: false,
  title: '',
  description: '',
  color: 'green'
})

// Forgot password state
const showForgotPassword = ref(false)
const resetEmail = ref('')
const resetLoading = ref(false)
const resetSent = ref(false)

// Supabase
const supabase = useSupabaseClient()

// Validation
const isValidEmail = computed(() => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)
})

const isValidResetEmail = computed(() => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail.value)
})

const isValidPassword = computed(() => {
  return password.value.length >= 8
})

const passwordsMatch = computed(() => {
  return password.value === confirmPassword.value
})

const canSubmit = computed(() => {
  if (!isValidEmail.value || !isValidPassword.value) return false
  if (isSignUp.value && !passwordsMatch.value) return false
  return true
})

// Password strength
const passwordStrength = computed(() => {
  const pwd = password.value
  let strength = 0
  if (pwd.length >= 8) strength++
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++
  if (/\d/.test(pwd)) strength++
  if (/[^a-zA-Z0-9]/.test(pwd)) strength++
  return strength
})

const passwordStrengthLabel = computed(() => {
  const labels = ['Weak', 'Fair', 'Good', 'Strong']
  return labels[passwordStrength.value - 1] || 'Weak'
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

// Toggle between sign in and sign up
const toggleAuthMode = () => {
  isSignUp.value = !isSignUp.value
  password.value = ''
  confirmPassword.value = ''
}

// Main auth handler
const handleAuth = async () => {
  loading.value = true
  try {
    if (isSignUp.value) {
      // Sign up
      const { error, data } = await supabase.auth.signUp({
        email: email.value,
        password: password.value
      })

      if (error) throw error

      showNotification('Account Created!', 'Your account has been created successfully. You are now signed in.', 'green')
      
      // Initialize user store and set the user BEFORE fetching profile
      const userStore = useUserStore()
      
      // Set the authenticated user in the store
      if (data.user) {
        userStore.user = data.user
      }
      
      // Now fetch the profile (it will use the user we just set)
      await userStore.fetchProfile()
      
      // Load user's cart from server
      const cartStore = useCartStore()
      const sessionRes = await supabase.auth.getSession()
      const token = sessionRes.data?.session?.access_token
      const userId = (data.user as any)?.id || (data.user as any)?.sub
      if (token && userId && cartStore.fetchedForUserId !== userId) {
        const { data: cartRes, error: cartErr } = await useFetch('/api/cart', {
          immediate: true,
          headers: { Authorization: `Bearer ${token}` }
        })
        cartStore.hydrateFromServerCart((cartRes.value as any)?.cart)
        cartStore.markFetchedForUser(userId)
        if (cartErr.value) {
          console.error('Error loading cart:', cartErr.value)
        }
      }
      
      // Handle redirect based on role
      userStore.handleRedirectAfterLogin()
    } else {
      // Sign in
      const { error, data } = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value
      })

      if (error) throw error

      showNotification('Welcome Back!', 'You have signed in successfully.', 'green')
      
      // Initialize user store and set the user before fetching profile
      const userStore = useUserStore()
      
      // Set the authenticated user in the store
      if (data.user) {
        userStore.user = data.user
      }
      
      // Now fetch the profile (it will use the user we just set)
      await userStore.fetchProfile()
      
      // Load user's cart from server
      const cartStore = useCartStore()
      const sessionRes = await supabase.auth.getSession()
      const token = sessionRes.data?.session?.access_token
      const userId = (data.user as any)?.id || (data.user as any)?.sub
      if (token && userId && cartStore.fetchedForUserId !== userId) {
        const { data: cartRes, error: cartErr } = await useFetch('/api/cart', {
          immediate: true,
          headers: { Authorization: `Bearer ${token}` }
        })
        cartStore.hydrateFromServerCart((cartRes.value as any)?.cart)
        cartStore.markFetchedForUser(userId)
        if (cartErr.value) {
          console.error('Error loading cart:', cartErr.value)
        }
      }
      
      // Handle redirect based on role
      userStore.handleRedirectAfterLogin()
    }
  } catch (error: any) {
    const message = error.message || 'Authentication failed. Please try again.'
    showNotification('Error', message, 'red')
  } finally {
    loading.value = false
  }
}

// Send password reset email
const sendPasswordReset = async () => {
  resetLoading.value = true
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.value, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })

    if (error) throw error

    resetSent.value = true
    setTimeout(() => {
      showForgotPassword.value = false
      resetSent.value = false
      resetEmail.value = ''
    }, 3000)
  } catch (error: any) {
    showNotification('Error', error.message || 'Failed to send reset email. Please try again.', 'red')
  } finally {
    resetLoading.value = false
  }
}
</script>

