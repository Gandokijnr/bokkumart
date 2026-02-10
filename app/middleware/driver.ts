// Middleware to protect driver-only routes
export default defineNuxtRouteMiddleware(async (to, from) => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  if (import.meta.client) {
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
  const userId = user.value?.id || (user.value as any)?.sub || session?.user?.id || (session?.user as any)?.sub

  if (!userId) {
    return navigateTo({
      path: '/auth',
      query: { redirect: to.fullPath, reason: 'driver_required' }
    })
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    return navigateTo('/')
  }

  const role = ((profile as any).role || '').toString().trim()
  if (role !== 'driver') {
    return navigateTo('/')
  }
})
