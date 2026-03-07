/**
 * Super Admin Middleware
 * Protects routes that require super_admin role
 * Used for sensitive administrative functions like staff management
 */

import { useUserStore } from "~/stores/user";

export default defineNuxtRouteMiddleware(async (to, from) => {
  const userStore = useUserStore();
  const supabase = useSupabaseClient();

  // CRITICAL: On page refresh, check Supabase session FIRST
  // Store state may not be hydrated yet, causing false redirects
  if (!userStore.isAuthenticated) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      // Restore user to store from valid Supabase session
      userStore.user = session.user;

      // Fetch profile if not already loaded
      if (!userStore.profile) {
        await userStore.fetchProfile();
      }
    }
  }

  // Now check authentication status after ensuring session is restored
  if (!userStore.isAuthenticated) {
    return navigateTo("/auth");
  }

  // Ensure profile is loaded
  if (!userStore.profile) {
    await userStore.fetchProfile();
  }

  // Check if user has super_admin role
  const jwtRole =
    ((userStore.user as any)?.app_metadata?.role as string | undefined) ||
    undefined;
  if (userStore.profile?.role !== "super_admin" && jwtRole !== "super_admin") {
    return navigateTo("/forbidden");
  }
});
