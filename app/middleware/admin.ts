// Middleware to protect admin-only routes
export default defineNuxtRouteMiddleware(async (to, from) => {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();

  console.log("[Admin Middleware] Starting for path:", to.path);

  // CRITICAL: On page refresh, check Supabase session FIRST
  // useSupabaseUser() may not be hydrated yet from localStorage
  if (import.meta.client && !user.value) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      console.log("[Admin Middleware] Session restored from Supabase");
      // Wait briefly for the reactive user state to update
      await new Promise((r) => setTimeout(r, 100));
    } else {
      console.log("[Admin Middleware] No session found");
    }
  }

  // Get user ID from either id or sub (Supabase uses sub in JWT)
  const getUserId = (u: any) => u?.id || u?.sub;
  const userId = getUserId(user.value);

  console.log("[Admin Middleware] User ID:", userId || "null/undefined");

  // Not logged in - redirect to login
  if (!userId) {
    console.log("[Admin Middleware] No user ID, redirecting to auth");
    return navigateTo({
      path: "/auth",
      query: { redirect: to.fullPath, reason: "admin_required" },
    });
  }

  // Fetch user role
  console.log("[Admin Middleware] Fetching profile for user:", userId);
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  console.log("[Admin Middleware] Profile fetch result:", { profile, error });

  if (error) {
    console.error(
      "[Admin Middleware] Error fetching profile:",
      error.message,
      error.details,
    );
    return navigateTo("/");
  }

  if (!profile) {
    console.error("[Admin Middleware] No profile found for user:", userId);
    return navigateTo("/");
  }

  const role = ((profile as any).role || "").toString().trim();
  console.log(
    "[Admin Middleware] Role found:",
    `'${role}'`,
    "Length:",
    role.length,
  );

  // Allow admin, super_admin, branch_manager, and staff roles to access admin panel
  const allowedRoles = [
    "admin",
    "super_admin",
    "branch_manager",
    "staff",
    "finance",
  ];
  if (!allowedRoles.includes(role)) {
    console.log(
      `[Admin Middleware] Access denied - role '${role}' not in allowed roles`,
    );
    return navigateTo("/forbidden");
  }

  // Admin access granted
  console.log("[Admin Middleware] Access granted!");
});
