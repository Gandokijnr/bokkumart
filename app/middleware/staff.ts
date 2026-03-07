// Middleware to protect staff/admin/manager routes
export default defineNuxtRouteMiddleware(async (to, from) => {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();

  console.log("[Staff Middleware] Starting for path:", to.path);

  // CRITICAL: On page refresh, check Supabase session FIRST
  // useSupabaseUser() may not be hydrated yet from localStorage
  if (import.meta.client && !user.value) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      console.log("[Staff Middleware] Session restored from Supabase");
      // Wait briefly for the reactive user state to update
      await new Promise((r) => setTimeout(r, 100));
    } else {
      console.log("[Staff Middleware] No session found");
    }
  }

  // Get user ID from either id or sub (Supabase uses sub in JWT)
  const getUserId = (u: any) => u?.id || u?.sub;
  const userId = getUserId(user.value);

  console.log("[Staff Middleware] User ID:", userId || "null/undefined");

  // Not logged in
  if (!userId) {
    console.log("[Staff Middleware] No user, redirecting to auth");
    return navigateTo({
      path: "/auth",
      query: { redirect: to.fullPath, reason: "staff_required" },
    });
  }

  // Fetch user role from profiles table
  console.log("[Staff Middleware] Fetching profile for user:", userId);
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    console.error("[Staff Middleware] Error fetching profile:", error);
    return navigateTo("/");
  }

  const role = ((profile as any).role || "").toString().trim();
  console.log("[Staff Middleware] Role found:", role);

  // Allow admin, manager, or staff
  const allowedRoles = [
    "admin",
    "manager",
    "staff",
    "super_admin",
    "branch_manager",
  ];
  if (!allowedRoles.includes(role)) {
    console.log(
      `[Staff Middleware] Access denied - role '${role}' not in [${allowedRoles.join(", ")}]`,
    );
    return navigateTo("/forbidden");
  }

  console.log("[Staff Middleware] Access granted for role:", role);
});
