export default defineNuxtRouteMiddleware(async (to, from) => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  if (import.meta.client) {
    // Wait for auth state to resolve (user starts as undefined while loading)
    if (user.value === undefined) {
      await new Promise(resolve => setTimeout(resolve, 100))

      if (user.value === undefined) {
        await new Promise(resolve => {
          const unwatch = watch(user, (newUser) => {
            if (newUser !== undefined) {
              unwatch()
              resolve(newUser)
            }
          }, { immediate: true })

          setTimeout(() => {
            unwatch()
            resolve(null)
          }, 5000)
        })
      }
    }
  }

  const { data: { session } } = await supabase.auth.getSession()

  // Check if user is authenticated (null = not logged in, object = logged in)
  if (!user.value && !session?.user) {
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
