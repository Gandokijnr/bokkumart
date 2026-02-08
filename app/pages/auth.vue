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
        <FormTabs v-model="activeTab" :items="tabs">
          <template #default="{ item }">
            <!-- Phone Tab -->
            <div v-if="item?.value === 'phone'" class="space-y-4">
              <!-- Phone Input Step -->
              <div v-if="!showOtpInput" class="space-y-4">
                <FormInput
                  v-model="phoneNumber"
                  type="tel"
                  label="Phone Number"
                  help="Enter your Nigerian phone number"
                  placeholder="80 1234 5678"
                  size="lg"
                >
                  <template #leading>
                    <span class="text-gray-500 text-sm whitespace-nowrap">🇳🇬 +234</span>
                  </template>
                </FormInput>

                <FormButton
                  block
                  size="lg"
                  :loading="loading"
                  :disabled="!isValidPhone"
                  @click="sendPhoneOtp"
                >
                  Send Code
                </FormButton>

                <p class="text-xs text-gray-500 text-center">
                  We'll send a 6-digit verification code to your phone
                </p>
              </div>

              <!-- OTP Verification Step -->
              <div v-else class="space-y-4">
                <div class="text-center">
                  <p class="text-sm text-gray-600">
                    Enter the 6-digit code sent to
                    <span class="font-semibold text-gray-900">{{ formattedPhone }}</span>
                  </p>
                </div>

                <div class="space-y-1.5">
                  <div class="flex justify-center gap-2">
                    <input
                      v-for="(digit, index) in otpDigits"
                      :key="index"
                      :ref="el => setOtpRef(el, index)"
                      v-model="otpDigits[index]"
                      type="text"
                      maxlength="1"
                      inputmode="numeric"
                      class="w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 border-gray-200 bg-white transition-all outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                      :class="{ 'border-red-500 ring-2 ring-red-200': otpDigits[index] }"
                      @input="handleOtpInput(index, $event)"
                      @keydown.backspace="handleOtpBackspace(index, $event)"
                      @paste="handleOtpPaste($event)"
                    />
                  </div>
                </div>

                <FormButton
                  block
                  size="lg"
                  :loading="loading"
                  :disabled="!isOtpComplete"
                  @click="verifyPhoneOtp"
                >
                  Verify & Sign In
                </FormButton>

                <div class="text-center">
                  <FormButton
                    variant="ghost"
                    color="neutral"
                    size="sm"
                    @click="resetPhoneFlow"
                  >
                    Change phone number
                  </FormButton>
                </div>
              </div>
            </div>

            <!-- Email Tab -->
            <div v-if="item?.value === 'email'" class="space-y-4">
              <FormInput
                v-model="email"
                type="email"
                label="Email Address"
                help="We'll send you a magic link"
                placeholder="you@example.com"
                size="lg"
              >
                <template #leading>
                  <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
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
                Send Magic Link
              </FormButton>

              <p class="text-xs text-gray-500 text-center">
                Click the link in your email to sign in instantly
              </p>
            </div>
          </template>
        </FormTabs>
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
import { ref, computed, watch } from 'vue'

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
const activeTab = ref('phone')
const loading = ref(false)
const phoneNumber = ref('')
const email = ref('')
const showOtpInput = ref(false)
const otpDigits = ref(['', '', '', '', '', ''])
const notification = ref<NotificationType>({
  show: false,
  title: '',
  description: '',
  color: 'green'
})

// Supabase
const supabase = useSupabaseClient()
const config = useRuntimeConfig()

// Tabs configuration
const tabs = [
  { label: 'Sign in with Phone', value: 'phone', icon: 'phone' },
  { label: 'Sign in with Email', value: 'email', icon: 'envelope' }
]

// Phone validation for Nigerian numbers
const isValidPhone = computed(() => {
  const cleaned = phoneNumber.value.replace(/\D/g, '')
  // Nigerian numbers: +234 followed by 10 digits, or 0 followed by 10 digits
  return /^([0]\d{10}|234\d{10})$/.test(cleaned)
})

const formattedPhone = computed(() => {
  const cleaned = phoneNumber.value.replace(/\D/g, '')
  if (cleaned.startsWith('0')) {
    return '+234 ' + cleaned.slice(1).replace(/(\d{3})(\d{4})(\d{3})/, '$1 $2 $3')
  }
  if (cleaned.startsWith('234')) {
    return '+' + cleaned.replace(/(\d{3})(\d{3})(\d{4})(\d{3})/, '$1 $2 $3 $4')
  }
  return phoneNumber.value
})

// Format phone to international format for Supabase
const getInternationalPhone = () => {
  const cleaned = phoneNumber.value.replace(/\D/g, '')
  if (cleaned.startsWith('0')) {
    return '+234' + cleaned.slice(1)
  }
  if (cleaned.startsWith('234')) {
    return '+' + cleaned
  }
  return cleaned.startsWith('+') ? cleaned : '+' + cleaned
}

// Email validation
const isValidEmail = computed(() => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)
})

// OTP validation
const isOtpComplete = computed(() => {
  return otpDigits.value.every(digit => digit.length === 1)
})

// OTP input refs
const otpRefs = ref<(HTMLInputElement | null)[]>([])
const setOtpRef = (el: any, index: number) => {
  otpRefs.value[index] = el
}

// OTP input handling
const handleOtpInput = (index: number, event: Event) => {
  const input = event.target as HTMLInputElement
  const value = input.value

  // Only allow numbers
  if (!/^\d*$/.test(value)) {
    otpDigits.value[index] = ''
    return
  }

  otpDigits.value[index] = value

  // Auto-focus next input
  if (value && index < 5) {
    otpRefs.value[index + 1]?.focus()
  }
}

const handleOtpBackspace = (index: number, event: KeyboardEvent) => {
  if (!otpDigits.value[index] && index > 0) {
    otpDigits.value[index - 1] = ''
    otpRefs.value[index - 1]?.focus()
  }
}

const handleOtpPaste = (event: ClipboardEvent) => {
  event.preventDefault()
  const pasted = event.clipboardData?.getData('text').replace(/\D/g, '').slice(0, 6)
  if (pasted) {
    pasted.split('').forEach((char, i) => {
      if (i < 6) otpDigits.value[i] = char
    })
    otpRefs.value[Math.min(pasted.length, 5)]?.focus()
  }
}

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

// Phone OTP flow
const sendPhoneOtp = async () => {
  loading.value = true
  try {
    const { error } = await supabase.auth.signInWithOtp({
      phone: getInternationalPhone(),
      options: {
        data: {
          phone: getInternationalPhone()
        }
      }
    })

    if (error) throw error

    showOtpInput.value = true
    showNotification('Code Sent!', 'Check your phone for the 6-digit verification code.', 'green')

    // Focus first OTP input
    setTimeout(() => {
      otpRefs.value[0]?.focus()
    }, 100)
  } catch (error: any) {
    showNotification('Error', error.message || 'Failed to send code. Please try again.', 'red')
  } finally {
    loading.value = false
  }
}

const verifyPhoneOtp = async () => {
  loading.value = true
  const otp = otpDigits.value.join('')

  try {
    const { error } = await supabase.auth.verifyOtp({
      phone: getInternationalPhone(),
      token: otp,
      type: 'sms'
    })

    if (error) throw error

    showNotification('Success!', 'You are now signed in.', 'green')
    
    // Redirect to intended destination or home
    const destination = redirectPath.value
    console.log('[Auth] Redirecting to:', destination)
    navigateTo(destination)
  } catch (error: any) {
    showNotification('Invalid Code', error.message || 'The code you entered is incorrect.', 'red')
  } finally {
    loading.value = false
  }
}

const resetPhoneFlow = () => {
  showOtpInput.value = false
  otpDigits.value = ['', '', '', '', '', '']
  phoneNumber.value = ''
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

    showNotification('Magic Link Sent!', 'Check your email for the sign-in link.', 'green')
    email.value = ''
  } catch (error: any) {
    showNotification('Error', error.message || 'Failed to send magic link. Please try again.', 'red')
  } finally {
    loading.value = false
  }
}
</script>

