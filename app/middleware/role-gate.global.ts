import { useUserStore } from "~/stores/user";

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path !== "/") return;

  const redirecting = useState<boolean>("role_gate_redirecting", () => false);

  const userStore = useUserStore();
  const supabase = useSupabaseClient();

  // Optional future debug: allow internal users to view customer pages only when "acting as customer"
  // For now, the store's effectiveRole already supports super-admin impersonation.

  // Ensure we have session + profile when possible
  if (!userStore.user) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      userStore.user = session.user;
    }
  }

  if (userStore.user && !userStore.profile) {
    try {
      await userStore.fetchProfile();
    } catch {
      // ignore; role may be derived from JWT app_metadata or unavailable
    }
  }

  const role = userStore.effectiveRole || userStore.profile?.role || "customer";

  const redirectMap: Record<string, string> = {
    super_admin: "/admin/global-dashboard",
    branch_manager: "/admin/branch-dashboard",
    staff: "/admin/dashboard",
    driver: "/driver/dashboard",
  };

  const target = redirectMap[String(role)] || null;
  if (!target) return;

  redirecting.value = true;

  return navigateTo(target, {
    replace: true,
  });
});
