/**
 * Staff Management Middleware
 * Protects routes that require super_admin or branch_manager role
 * Used for staff management functions
 */

import { useUserStore } from '~/stores/user'

export default defineNuxtRouteMiddleware(async (to, from) => {
    const userStore = useUserStore()

    // Check if user is authenticated
    if (!userStore.isAuthenticated) {
        return navigateTo('/auth')
    }

    // Ensure profile is loaded
    if (!userStore.profile) {
        await userStore.fetchProfile()
    }

    // Check if user has super_admin or branch_manager role
    const jwtRole = ((userStore.user as any)?.app_metadata?.role as string | undefined) || undefined
    const userRole = userStore.profile?.role || jwtRole
    
    if (userRole !== 'super_admin' && userRole !== 'branch_manager') {
        return navigateTo('/forbidden')
    }
})
