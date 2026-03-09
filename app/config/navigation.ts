import type { UserRole } from "~/stores/user";

export interface NavItem {
  label: string;
  to: string;
  icon: string;
  allowedRoles: UserRole[];
  badge?: number;
  // Optional: Dynamic label based on role
  roleLabels?: Partial<Record<UserRole, string>>;
  // Optional: Section grouping
  section?:
    | "overview"
    | "operations"
    | "inventory"
    | "analytics"
    | "management"
    | "system";
  // Optional: Requires store context (for data filtering)
  requiresStoreContext?: boolean;
}

// Navigation schema with role-based access control
export const navigationSchema: NavItem[] = [
  // 1. DASHBOARDS (Role-specific home)
  {
    label: "Global Dashboard",
    to: "/admin/global-dashboard",
    icon: "globe",
    allowedRoles: ["super_admin"],
    section: "overview",
  },
  {
    label: "Branch Dashboard",
    to: "/admin/branch-dashboard",
    icon: "officeBuilding",
    allowedRoles: ["branch_manager"],
    section: "overview",
  },
  {
    label: "Dashboard",
    to: "/admin/dashboard",
    icon: "home",
    allowedRoles: ["staff"],
    section: "overview",
  },

  // 2. OPERATIONS (Core daily tasks)
  {
    label: "All Orders",
    to: "/admin/orders",
    icon: "clipboardList",
    allowedRoles: ["super_admin", "branch_manager", "staff"],
    roleLabels: {
      branch_manager: "Branch Orders",
      staff: "Branch Orders",
    },
    section: "operations",
    requiresStoreContext: true,
  },

  // 3. INVENTORY (Product management)
  {
    label: "Inventory",
    to: "/admin/inventory",
    icon: "cube",
    allowedRoles: ["super_admin", "branch_manager"],
    section: "inventory",
    requiresStoreContext: true,
  },

  // 4. ANALYTICS (Reporting & insights)
  {
    label: "Analytics",
    to: "/admin/analytics",
    icon: "chartBar",
    allowedRoles: ["super_admin", "branch_manager"],
    section: "analytics",
    requiresStoreContext: true,
  },

  // 5. MANAGEMENT (Super Admin only)
  {
    label: "Platform Revenue",
    to: "/admin/platform-revenue",
    icon: "currencyNaira",
    allowedRoles: ["super_admin", "finance"],
    section: "management",
  },
  {
    label: "Driver Payouts",
    to: "/admin/driver-payouts",
    icon: "currencyNaira",
    allowedRoles: ["super_admin"],
    section: "management",
  },
  {
    label: "Pending Riders",
    to: "/admin/riders/pending",
    icon: "users",
    allowedRoles: ["super_admin"],
    section: "management",
  },
  {
    label: "Staff Management",
    to: "/admin/staff-management",
    icon: "users",
    allowedRoles: ["super_admin"],
    section: "management",
  },

  // 6. SETTINGS (Bottom - secondary action)
  {
    label: "Settings",
    to: "/admin/settings",
    icon: "cog",
    allowedRoles: ["super_admin"],
    section: "system",
  },
];

// Context options for navigation visibility
export interface NavigationContext {
  pendingVerificationCount?: number;
}

// Helper function to get visible navigation for a role
export function getVisibleNavigation(
  userRole: UserRole,
  context?: NavigationContext,
): NavItem[] {
  return navigationSchema
    .filter((item) => item.allowedRoles.includes(userRole))
    .map((item) => {
      // Apply contextual naming based on role
      const dynamicLabel = item.roleLabels?.[userRole] || item.label;

      // Apply badge counts from context
      let badge = item.badge;
      if (item.to === "/admin/orders" && context?.pendingVerificationCount) {
        badge = context.pendingVerificationCount;
      }

      return {
        ...item,
        label: dynamicLabel,
        badge,
      };
    });
}

// Helper function to check if a route is allowed for a role
export function isRouteAllowed(routePath: string, userRole: UserRole): boolean {
  const navItem = navigationSchema.find(
    (item) => item.to === routePath || routePath.startsWith(item.to + "/"),
  );

  if (!navItem) {
    // If route is not in schema, check if it's a protected admin route
    if (routePath.startsWith("/admin/")) {
      return false; // Unknown admin routes are blocked by default
    }
    return true; // Non-admin routes are allowed
  }

  return navItem.allowedRoles.includes(userRole);
}

// Helper function to get route metadata
export function getRouteMetadata(routePath: string) {
  const navItem = navigationSchema.find(
    (item) => item.to === routePath || routePath.startsWith(item.to + "/"),
  );

  return {
    requiresStoreContext: navItem?.requiresStoreContext || false,
    allowedRoles: navItem?.allowedRoles || [],
    section: navItem?.section,
  };
}

// Get dashboard route for a role
export function getDashboardRoute(userRole: UserRole): string {
  const dashboards: Record<UserRole, string> = {
    super_admin: "/admin/global-dashboard",
    branch_manager: "/admin/branch-dashboard",
    staff: "/admin/dashboard",
    finance: "/admin/platform-revenue",
    customer: "/",
    driver: "/",
  };

  return dashboards[userRole] || "/";
}
