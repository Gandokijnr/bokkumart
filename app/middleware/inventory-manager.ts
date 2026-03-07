import { useUserStore } from "~/stores/user";

export default defineNuxtRouteMiddleware(async () => {
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

  if (!userStore.profile) {
    await userStore.fetchProfile();
  }

  const jwtRole =
    ((userStore.user as any)?.app_metadata?.role as string | undefined) ||
    undefined;
  const role = userStore.profile?.role || jwtRole;

  if (role !== "super_admin" && role !== "branch_manager") {
    return navigateTo("/forbidden");
  }
});
