/**
 * Super Admin Middleware
 * Protects routes that require super_admin role
 * Used for sensitive administrative functions like staff management
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

    // Check if user has super_admin role
    const jwtRole = ((userStore.user as any)?.app_metadata?.role as string | undefined) || undefined
    if (userStore.profile?.role !== 'super_admin' && jwtRole !== 'super_admin') {
        return navigateTo('/forbidden')
    }
})
