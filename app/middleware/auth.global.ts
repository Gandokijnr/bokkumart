/**
 * Global Authentication & Authorization Middleware
 * Handles role-based access control and prevents unauthorized route access
 */
import { useUserStore } from "~/stores/user";

export default defineNuxtRouteMiddleware(async (to, from) => {
  // Public routes that don't require authentication
  const publicRoutes = ["/", "/auth", "/driver/auth", "/onboarding/phone"];
  const isPublicRoute = publicRoutes.some(
    (route) =>
      to.path === route ||
      to.path.startsWith("/product") ||
      to.path.startsWith("/driver/auth"),
  );

  // Skip middleware for public routes on initial load
  if (isPublicRoute && !to.path.includes("/admin")) {
    return;
  }

  if (process.server) {
    return;
  }

  const userStore = useUserStore();
  const supabase = useSupabaseClient();

  // CRITICAL: On page refresh or initial load, check Supabase session FIRST
  // This prevents false redirects when the store hasn't been hydrated yet
  if (!userStore.user) {
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

  // Now check authentication status after ensuring session is checked
  if (!userStore.isAuthenticated && !isPublicRoute) {
    return navigateTo({
      path: "/auth",
      query: { redirect: to.fullPath, reason: "auth_required" },
    });
  }

  if (userStore.isAuthenticated) {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      await supabase.auth.signOut();
      userStore.clearUser();
      if (!isPublicRoute) {
        return navigateTo({
          path: "/auth",
          query: { redirect: to.fullPath, reason: "session_invalid" },
        });
      }
    }
  }

  // DRIVER ONBOARDING: Redirect to auth page if trying to access onboarding without being logged in
  if (to.path === "/driver/onboarding" && !userStore.isAuthenticated) {
    return navigateTo({
      path: "/driver/auth",
      query: { redirect: to.fullPath },
    });
  }

  // Ensure profile is loaded for authenticated users
  if (userStore.isAuthenticated && !userStore.profile) {
    await userStore.fetchProfile();
  }

  // CUSTOMER ONBOARDING GUARD: phone number is required to proceed
  // Skip driver routes and the onboarding page itself to avoid loops
  const isDriver = userStore.profile?.role === "driver";
  const requiresPhoneOnboarding =
    userStore.isAuthenticated &&
    !!userStore.profile &&
    !to.path.startsWith("/driver") &&
    !isDriver &&
    !userStore.profile.phone_number?.trim();

  if (requiresPhoneOnboarding && to.path !== "/onboarding/phone") {
    return navigateTo({
      path: "/onboarding/phone",
      query: { redirect: to.fullPath },
    });
  }

  // DRIVER-SPECIFIC ROUTING LOGIC

  // Handle root path redirect for authenticated users
  if (to.path === "/" && userStore.isAuthenticated && userStore.profile) {
    // If driver, redirect to driver dashboard
    if (isDriver) {
      return navigateTo("/driver/dashboard");
    }

    userStore.handleRedirectAfterLogin();
    return;
  }

  // HARD GUARD: Prevent drivers from accessing admin and shop routes
  if (isDriver) {
    const isRestricted = to.path === "/" || to.path.startsWith("/admin");

    if (isRestricted) {
      const toast = useToast();
      toast.add({
        title: "Access Restricted",
        description: "Access Restricted to Rider Mode",
        color: "warning",
      } as any);

      return navigateTo("/driver/dashboard");
    }

    // Allow driver routes
    if (to.path.startsWith("/driver")) {
      return;
    }
  }

  // Route-specific authorization checks for protected routes
  if (to.path.startsWith("/admin") && !userStore.canAccess(to.path)) {
    // Redirect to appropriate dashboard based on role
    if (userStore.isSuperAdmin) {
      return navigateTo("/admin/global-dashboard");
    } else if (userStore.isBranchManager) {
      return navigateTo("/admin/branch-dashboard");
    } else if (userStore.hasAdminAccess) {
      return navigateTo("/admin/dashboard");
    } else {
      return navigateTo("/");
    }
  }
});

// Helper to determine required role for a route
function getRequiredRole(path: string): string {
  if (
    path.startsWith("/admin/staff-management") ||
    path.startsWith("/admin/global-dashboard")
  ) {
    return "Super Admin";
  }
  if (path.startsWith("/admin/branch-dashboard")) {
    return "Branch Manager";
  }
  if (path.startsWith("/admin")) {
    return "Admin/Manager/Staff";
  }
  return "Unknown";
}
