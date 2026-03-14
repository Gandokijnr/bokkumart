<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="text-center">
      <div class="w-16 h-16 bg-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center animate-pulse">
        <svg class="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>
      <h1 class="text-2xl font-bold text-gray-900">Completing Sign In...</h1>
      <p class="text-gray-600 mt-2">Please wait while we verify your session</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()

onMounted(async () => {
  // The Supabase client will automatically handle the PKCE code exchange
  // We just need to wait for the session to be established
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    console.error('Auth error:', error)
    navigateTo('/auth?error=' + encodeURIComponent(error.message))
    return
  }

  if (data.session) {
    // Get the redirect path from query params or default to home
    const redirect = route.query.redirect as string || '/'
    navigateTo(redirect)
  } else {
    // No session found, redirect to auth
    navigateTo('/auth')
  }
})
</script>
