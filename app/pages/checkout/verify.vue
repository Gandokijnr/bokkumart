<template>
  <div class="min-h-screen bg-gray-50">
    <AppHeader />
    
    <main class="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div class="text-center">
        <div v-if="verifying" class="mx-auto h-20 w-20 animate-spin rounded-full border-4 border-red-200 border-t-red-600"></div>
        <div v-else-if="success" class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <svg class="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div v-else class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <svg class="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        
        <h1 class="mt-6 text-2xl font-bold text-gray-900">
          {{ verifying ? 'Verifying Payment...' : success ? 'Payment Successful!' : 'Payment Failed' }}
        </h1>
        <p class="mt-2 text-gray-600">{{ message }}</p>

        <!-- Bank transfer notice -->
        <div v-if="verifying" class="mt-6 rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
          <p class="text-sm text-blue-700">
            If you paid via Bank Transfer, please wait a moment for confirmation. 
            Do not close this page.
          </p>
        </div>
      </div>

      <div v-if="!verifying" class="mt-8 space-y-3">
        <button 
          @click="navigateTo(success ? '/' : '/checkout')"
          class="w-full rounded-xl py-3.5 text-sm font-bold text-white"
          :class="success ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'"
        >
          {{ success ? 'Continue Shopping' : 'Try Again' }}
        </button>
        <button 
          v-if="success"
          @click="navigateTo('/profile')"
          class="w-full rounded-xl border-2 border-gray-200 bg-white py-3.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
        >
          View My Orders
        </button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useCartStore } from '~/stores/useCartStore'

const cartStore = useCartStore()
const route = useRoute()
const supabase = useSupabaseClient()

const verifying = ref(true)
const success = ref(false)
const message = ref('Please wait while we confirm your payment...')

const reference = route.query.reference as string
const trxref = route.query.trxref as string

async function verifyPayment() {
  const paymentRef = reference || trxref
  
  if (!paymentRef) {
    verifying.value = false
    success.value = false
    message.value = 'No payment reference found.'
    return
  }

  try {
    // Server-side Paystack verification (works even if webhooks are delayed)
    try {
      const res = await $fetch<{ ok: boolean; verified: boolean; order_id?: string; reason?: string }>(
        '/api/paystack/verify',
        {
          method: 'POST',
          body: { reference: paymentRef }
        }
      )

      if (res?.ok && res?.verified && res?.order_id) {
        const { data: verifiedOrder } = await supabase
          .from('orders')
          .select('id, status, total_amount')
          .eq('id', res.order_id)
          .maybeSingle() as { data: { id: string; status: string; total_amount: number } | null }

        if (verifiedOrder) {
          verifying.value = false
          success.value = true
          message.value = `Your payment of ${formatPrice(verifiedOrder.total_amount)} has been confirmed!`
          cartStore.retainCartFor48Hours()
          setTimeout(() => navigateTo(`/checkout/success?order=${verifiedOrder.id}`), 1500)
          return
        }
      }
    } catch {
      // Ignore and fallback to webhook/polling
    }

    // Check for existing order first (webhook may have already processed)
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, status, total_amount')
      .eq('paystack_reference', paymentRef)
      .maybeSingle() as { data: { id: string; status: string; total_amount: number } | null }

    if (existingOrder?.status === 'paid') {
      verifying.value = false
      success.value = true
      message.value = `Your payment of ${formatPrice(existingOrder.total_amount)} has been confirmed!`
      cartStore.retainCartFor48Hours()
      setTimeout(() => navigateTo(`/checkout/success?order=${existingOrder.id}`), 1500)
      return
    }

    // If not processed yet, wait a bit for webhook (bank transfers take longer)
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 2000))

      // Attempt server-side verification again during polling window
      try {
        const res = await $fetch<{ ok: boolean; verified: boolean; order_id?: string }>(
          '/api/paystack/verify',
          {
            method: 'POST',
            body: { reference: paymentRef }
          }
        )
        if (res?.ok && res?.verified && res?.order_id) {
          const { data: verifiedOrder } = await supabase
            .from('orders')
            .select('id, status, total_amount')
            .eq('id', res.order_id)
            .maybeSingle() as { data: { id: string; status: string; total_amount: number } | null }

          if (verifiedOrder) {
            verifying.value = false
            success.value = true
            message.value = `Your payment of ${formatPrice(verifiedOrder.total_amount)} has been confirmed!`
            cartStore.retainCartFor48Hours()
            setTimeout(() => navigateTo(`/checkout/success?order=${verifiedOrder.id}`), 1500)
            return
          }
        }
      } catch {
        // ignore
      }
      
      const { data: checkOrder } = await supabase
        .from('orders')
        .select('id, status, total_amount')
        .eq('paystack_reference', paymentRef)
        .maybeSingle() as { data: { id: string; status: string; total_amount: number } | null }

      if (checkOrder?.status === 'paid') {
        verifying.value = false
        success.value = true
        message.value = `Your payment of ${formatPrice(checkOrder.total_amount)} has been confirmed!`
        cartStore.retainCartFor48Hours()
        setTimeout(() => navigateTo(`/checkout/success?order=${checkOrder.id}`), 1500)
        return
      }

      attempts++
    }

    // If still not found, payment may have failed or is still processing
    verifying.value = false
    success.value = false
    message.value = 'We could not confirm your payment. If you completed a bank transfer, please check your email for confirmation within 5 minutes.'

  } catch (error) {
    console.error('Verification error:', error)
    verifying.value = false
    success.value = false
    message.value = 'An error occurred while verifying your payment. Please contact support.'
  }
}

function formatPrice(price: number): string {
  return '₦' + price.toLocaleString('en-NG')
}

onMounted(() => {
  verifyPayment()
})
</script>
