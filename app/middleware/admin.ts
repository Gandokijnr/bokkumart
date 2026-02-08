// Middleware to protect admin-only routes
export default defineNuxtRouteMiddleware(async (to, from) => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  console.log('[Admin Middleware] Starting for path:', to.path)

  // Wait for auth state to resolve (session restoration from localStorage can take time)
  let attempts = 0
  const maxAttempts = 100 // Wait up to 10 seconds
  
  // Get user ID from either id or sub (Supabase uses sub in JWT)
  const getUserId = (u: any) => u?.id || u?.sub
  
  while (!getUserId(user.value) && attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 100))
    attempts++
    
    // Log every 10 attempts to see progress
    if (attempts % 10 === 0) {
      console.log(`[Admin Middleware] Waiting for auth... attempt ${attempts}, userId:`, getUserId(user.value))
    }
  }

  const userId = getUserId(user.value)
  console.log('[Admin Middleware] User after wait:', userId || 'null/undefined', `(waited ${attempts * 100}ms)`)

  // Try to get session explicitly if user still not available
  if (!userId) {
    console.log('[Admin Middleware] Trying to restore session from localStorage...')
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('[Admin Middleware] Session error:', sessionError)
    }
    
    if (session?.user) {
      console.log('[Admin Middleware] Session found in localStorage:', (session.user as any).id || (session.user as any).sub)
      // Wait a bit more for the user reactive state to update
      await new Promise(r => setTimeout(r, 500))
    } else {
      console.log('[Admin Middleware] No session in localStorage')
    }
  }

  // Check again after potential session restore
  const finalUserId = getUserId(user.value)
  
  // Not logged in - redirect to login
  if (!finalUserId) {
    console.log('[Admin Middleware] No user ID, redirecting to auth')
    return navigateTo({
      path: '/auth',
      query: { redirect: to.fullPath, reason: 'admin_required' }
    })
  }

  // Fetch user role
  console.log('[Admin Middleware] Fetching profile for user:', finalUserId)
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', finalUserId)
    .single()

  console.log('[Admin Middleware] Profile fetch result:', { profile, error })

  if (error) {
    console.error('[Admin Middleware] Error fetching profile:', error.message, error.details)
    return navigateTo('/')
  }

  if (!profile) {
    console.error('[Admin Middleware] No profile found for user:', finalUserId)
    return navigateTo('/')
  }

  const role = ((profile as any).role || '').toString().trim()
  console.log('[Admin Middleware] Role found:', `'${role}'`, 'Length:', role.length)

  // Only allow admin role
  if (role !== 'admin') {
    console.log(`[Admin Middleware] Access denied - role '${role}' !== 'admin'`)
    return navigateTo('/')
  }

  // Admin access granted
  console.log('[Admin Middleware] Access granted!')
})
