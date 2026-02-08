export default defineNuxtRouteMiddleware(async (to, from) => {
  const user = useSupabaseUser()

  // Wait for auth state to resolve (user starts as undefined while loading)
  if (user.value === undefined) {
    // Give it a moment to resolve
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // If still undefined, wait for the next tick
    if (user.value === undefined) {
      await new Promise(resolve => {
        const unwatch = watch(user, (newUser) => {
          if (newUser !== undefined) {
            unwatch()
            resolve(newUser)
          }
        }, { immediate: true })
        
        // Timeout after 5 seconds to prevent infinite wait
        setTimeout(() => {
          unwatch()
          resolve(null)
        }, 5000)
      })
    }
  }

  // Check if user is authenticated (null = not logged in, object = logged in)
  if (!user.value) {
    // Redirect to login page, preserving the intended destination
    return navigateTo({
      path: '/auth',
      query: {
        redirect: to.fullPath,
        reason: 'unauthorized'
      }
    })
  }
})
