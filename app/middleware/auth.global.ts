/**
 * Global Authentication & Authorization Middleware
 * Handles role-based access control and prevents unauthorized route access
 */
import { useUserStore } from '~/stores/user'


export default defineNuxtRouteMiddleware(async (to, from) => {
    // Public routes that don't require authentication
    const publicRoutes = ['/', '/auth', '/']
    const isPublicRoute = publicRoutes.some(route => to.path === route || to.path.startsWith('/product'))

    // Skip middleware for public routes on initial load
    if (isPublicRoute && !to.path.includes('/admin')) {
        return
    }

    if (process.server) {
        return
    }

    const userStore = useUserStore()
    const supabase = useSupabaseClient()

    // CRITICAL: On page refresh or initial load, check Supabase session FIRST
    // This prevents false redirects when the store hasn't been hydrated yet
    if (!userStore.user) {
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
            // Restore user to store from valid Supabase session
            userStore.user = session.user

            // Fetch profile if not already loaded
            if (!userStore.profile) {
                await userStore.fetchProfile()
            }
        }
    }

    // Now check authentication status after ensuring session is checked
    if (!userStore.isAuthenticated && !isPublicRoute) {
        return navigateTo({
            path: '/auth',
            query: { redirect: to.fullPath, reason: 'auth_required' }
        })
    }

    // Ensure profile is loaded for authenticated users
    if (userStore.isAuthenticated && !userStore.profile) {
        await userStore.fetchProfile()
    }

    // DRIVER-SPECIFIC ROUTING LOGIC
    const isDriver = userStore.profile?.role === 'driver'

    // Handle root path redirect for authenticated users
    if (to.path === '/' && userStore.isAuthenticated && userStore.profile) {
        // If driver, redirect to driver dashboard
        if (isDriver) {
            return navigateTo('/driver/dashboard')
        }

        userStore.handleRedirectAfterLogin()
        return
    }

    // HARD GUARD: Prevent drivers from accessing admin and shop routes
    if (isDriver) {
        const restrictedPaths = ['/admin', '/shop']
        const isRestricted = restrictedPaths.some(path => to.path.startsWith(path))

        if (isRestricted) {
            const toast = useToast()
            toast.add({
                title: 'Access Restricted',
                description: 'Access Restricted to Rider Mode',
                color: 'warning'
            } as any)

            return navigateTo('/driver/dashboard')
        }

        // Allow driver routes
        if (to.path.startsWith('/driver')) {
            return
        }
    }

    // Route-specific authorization checks for protected routes
    if (to.path.startsWith('/admin') && !userStore.canAccess(to.path)) {
        // Redirect to appropriate dashboard based on role
        if (userStore.isSuperAdmin) {
            return navigateTo('/admin/global-dashboard')
        } else if (userStore.isBranchManager) {
            return navigateTo('/admin/branch-dashboard')
        } else if (userStore.hasAdminAccess) {
            return navigateTo('/admin/dashboard')
        } else {
            return navigateTo('/')
        }
    }
})


// Helper to determine required role for a route
function getRequiredRole(path: string): string {
    if (path.startsWith('/admin/staff-management') || path.startsWith('/admin/global-dashboard')) {
        return 'Super Admin'
    }
    if (path.startsWith('/admin/branch-dashboard')) {
        return 'Branch Manager'
    }
    if (path.startsWith('/admin')) {
        return 'Admin/Manager/Staff'
    }
    return 'Unknown'
}
