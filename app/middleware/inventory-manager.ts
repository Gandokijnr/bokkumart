import { useUserStore } from '~/stores/user'

export default defineNuxtRouteMiddleware(async () => {
  const userStore = useUserStore()

  if (!userStore.isAuthenticated) {
    return navigateTo('/auth')
  }

  if (!userStore.profile) {
    await userStore.fetchProfile()
  }

  const jwtRole = ((userStore.user as any)?.app_metadata?.role as string | undefined) || undefined
  const role = userStore.profile?.role || jwtRole

  if (role !== 'super_admin' && role !== 'branch_manager') {
    return navigateTo('/forbidden')
  }
})
