// Middleware to protect staff/admin/manager routes
export default defineNuxtRouteMiddleware(async (to, from) => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  
  console.log('[Staff Middleware] Starting for path:', to.path)

  // Wait for auth state to resolve
  let attempts = 0
  const maxAttempts = 100
  
  const getUserId = (u: any) => u?.id || u?.sub
  
  while (!getUserId(user.value) && attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 100))
    attempts++
    
    if (attempts % 10 === 0) {
      console.log(`[Staff Middleware] Waiting for auth... attempt ${attempts}`)
    }
  }

  const userId = getUserId(user.value)
  
  // Try to restore session if needed
  if (!userId) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  const finalUserId = getUserId(user.value)
  
  // Not logged in
  if (!finalUserId) {
    console.log('[Staff Middleware] No user, redirecting to auth')
    return navigateTo({
      path: '/auth',
      query: { redirect: to.fullPath, reason: 'staff_required' }
    })
  }

  // Fetch user role from profiles table
  console.log('[Staff Middleware] Fetching profile for user:', finalUserId)
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', finalUserId)
    .single()

  if (error || !profile) {
    console.error('[Staff Middleware] Error fetching profile:', error)
    return navigateTo('/')
  }

  const role = ((profile as any).role || '').toString().trim()
  console.log('[Staff Middleware] Role found:', role)
  
  // Allow admin, manager, or staff
  const allowedRoles = ['admin', 'manager', 'staff']
  if (!allowedRoles.includes(role)) {
    console.log(`[Staff Middleware] Access denied - role '${role}' not in [${allowedRoles.join(', ')}]`)
    return navigateTo('/forbidden')
  }

  console.log('[Staff Middleware] Access granted for role:', role)
})
