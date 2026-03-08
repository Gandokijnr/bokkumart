import { useUserStore } from "~/stores/user";
import { getRouteMetadata } from "~/config/navigation";

/**
 * Composable for role-based data filtering
 * Automatically appends store_id filter for branch managers and staff
 * when accessing routes that require store context
 */
export function useRoleBasedFiltering() {
  const userStore = useUserStore();
  const route = useRoute();

  /**
   * Check if current route requires store context
   */
  const requiresStoreContext = computed(() => {
    const metadata = getRouteMetadata(route.path);
    return metadata.requiresStoreContext;
  });

  /**
   * Get the store ID for filtering
   * - Super Admin: null (all stores) or specific store if filtered
   * - Branch Manager: their managed store ID
   * - Staff: their assigned store ID
   */
  const userStoreId = computed(() => {
    const role = userStore.effectiveRole;
    const profile = userStore.profile;

    // Super admin can see all stores (no filter)
    if (role === "super_admin") {
      return null;
    }

    // Branch manager: use their managed store
    if (role === "branch_manager") {
      return profile?.managed_store_ids?.[0] || profile?.store_id || null;
    }

    // Staff: use their assigned store
    if (role === "staff") {
      return profile?.store_id || null;
    }

    return null;
  });

  /**
   * Build query parameters with store filter
   * Automatically adds store_id for non-super-admin users
   */
  const buildQueryParams = (additionalParams: Record<string, any> = {}) => {
    const params: Record<string, any> = { ...additionalParams };

    // Add store_id filter for branch managers and staff
    const storeId = userStoreId.value;
    if (storeId && requiresStoreContext.value) {
      params.store_id = storeId;
    }

    return params;
  };

  /**
   * Build URL search params string
   */
  const buildSearchParams = (additionalParams: Record<string, any> = {}) => {
    const params = buildQueryParams(additionalParams);
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        searchParams.append(key, String(value));
      }
    });

    return searchParams.toString();
  };

  /**
   * Fetch orders with automatic store filtering
   */
  const fetchOrders = async (options: {
    status?: string;
    page?: number;
    limit?: number;
    additionalFilters?: Record<string, any>;
  } = {}) => {
    const { status, page = 1, limit = 20, additionalFilters = {} } = options;

    const queryParams = buildQueryParams({
      page,
      limit,
      ...additionalFilters,
    });

    if (status) {
      queryParams.status = status;
    }

    const queryString = Object.entries(queryParams)
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join("&");

    try {
      const response = await $fetch(`/api/orders?${queryString}`);
      return response;
    } catch (error) {
      console.error("[useRoleBasedFiltering] Failed to fetch orders:", error);
      throw error;
    }
  };

  /**
   * Fetch inventory with automatic store filtering
   */
  const fetchInventory = async (options: {
    category?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    const { category, page = 1, limit = 50 } = options;

    const queryParams = buildQueryParams({
      page,
      limit,
    });

    if (category) {
      queryParams.category = category;
    }

    const queryString = buildSearchParams(queryParams);

    try {
      const response = await $fetch(`/api/inventory?${queryString}`);
      return response;
    } catch (error) {
      console.error("[useRoleBasedFiltering] Failed to fetch inventory:", error);
      throw error;
    }
  };

  /**
   * Check if user can access specific store data
   */
  const canAccessStore = (targetStoreId: string): boolean => {
    const role = userStore.effectiveRole;

    // Super admin can access all stores
    if (role === "super_admin") {
      return true;
    }

    const profile = userStore.profile;

    // Branch manager can access their managed stores
    if (role === "branch_manager") {
      const managedStores = profile?.managed_store_ids || [];
      const primaryStore = profile?.store_id;
      return managedStores.includes(targetStoreId) || primaryStore === targetStoreId;
    }

    // Staff can only access their assigned store
    if (role === "staff") {
      return profile?.store_id === targetStoreId;
    }

    return false;
  };

  return {
    requiresStoreContext,
    userStoreId,
    buildQueryParams,
    buildSearchParams,
    fetchOrders,
    fetchInventory,
    canAccessStore,
  };
}
