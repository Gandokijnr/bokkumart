import { useUserStore } from "~/stores/user";
import { isRouteAllowed, getDashboardRoute } from "~/config/navigation";

// Route protection middleware
// This middleware runs on every route change to /admin/* paths
export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip for non-admin routes
  if (!to.path.startsWith("/admin/")) {
    return;
  }

  // Skip for auth routes
  if (to.path.startsWith("/admin/auth") || to.path === "/admin/login") {
    return;
  }

  const userStore = useUserStore();
  const nuxtApp = useNuxtApp();

  // Check if user is authenticated
  if (!userStore.isAuthenticated) {
    return navigateTo("/auth", { replace: true });
  }

  // Get user's effective role
  const userRole = userStore.effectiveRole;

  // Check if route is allowed for this role
  const isAllowed = isRouteAllowed(to.path, userRole);

  if (!isAllowed) {
    // Show unauthorized toast using Nuxt's toast if available
    const toast = (nuxtApp as any).$toast;
    if (toast?.error) {
      toast.error(
        "Unauthorized: You don't have permission to access this page",
      );
    } else {
      // Fallback: use console
      console.warn(
        `[Auth] Unauthorized access attempt: ${to.path} by ${userRole}`,
      );
    }

    // Redirect to user's appropriate dashboard
    const dashboardRoute = getDashboardRoute(userRole);
    return navigateTo(dashboardRoute, { replace: true });
  }

  // Log access for audit (optional)
  if (import.meta.dev) {
    console.log(`[Auth] ${userRole} accessed ${to.path}`);
  }
});
