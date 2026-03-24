/**
 * useAdminData - Automatic data filtering composable for admin operations
 *
 * This composable automatically applies store-based filters to Supabase queries
 * based on the logged-in user's role:
 * - super_admin: Returns all data (no filters)
 * - branch_manager: Automatically filters by managed_store_ids
 *
 * This is the "Manager Guard" that ensures branch managers only see their store's data.
 */

import type { Database } from "~/types/database.types";

export interface AdminDataOptions {
  autoFilter?: boolean; // Whether to automatically apply store filters (default: true)
}

export const useAdminData = (options: AdminDataOptions = {}) => {
  const supabase = useSupabaseClient<Database>();
  const user = useSupabaseUser();

  const { autoFilter = true } = options;

  // State
  const profile = ref<Database["public"]["Tables"]["profiles"]["Row"] | null>(
    null,
  );
  const managedStores = ref<Database["public"]["Tables"]["stores"]["Row"][]>(
    [],
  );
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Computed
  const isSuperAdmin = computed(() => profile.value?.role === "super_admin");
  const isBranchManager = computed(
    () => profile.value?.role === "branch_manager",
  );
  const managedStoreIds = computed(
    () => profile.value?.managed_store_ids || [],
  );

  const currentStoreNames = computed(() => {
    const stores = managedStores.value as { name: string }[];
    if (stores.length === 0) return "No Stores Assigned";
    if (stores.length === 1) return stores[0]?.name ?? "";
    return stores.map((s) => s.name).join(", ");
  });

  // Initialize - fetch user profile and managed stores
  const initialize = async () => {
    if (!user.value) {
      error.value = "No authenticated user";
      return false;
    }

    loading.value = true;
    error.value = null;

    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.value.id)
        .single();

      if (profileError) throw profileError;
      const typedProfileData = profileData as
        | Database["public"]["Tables"]["profiles"]["Row"]
        | null;
      profile.value = typedProfileData;

      // Fetch managed stores if branch manager
      if (
        typedProfileData?.managed_store_ids &&
        typedProfileData.managed_store_ids.length > 0
      ) {
        const { data: storesData, error: storesError } = await supabase
          .from("stores")
          .select(
            "id, name, address, city, state, is_active, operating_hours, phone, email",
          )
          .in("id", typedProfileData.managed_store_ids);

        if (storesError) throw storesError;
        managedStores.value = storesData || [];
      }

      return true;
    } catch (err: any) {
      error.value = err.message;
      console.error("Error initializing admin data:", err);
      return false;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Apply store filter to a Supabase query builder
   * Automatically filters by managed stores for branch managers
   */
  const applyStoreFilter = <T>(query: any): any => {
    if (!autoFilter) return query;

    // Super admins see everything
    if (isSuperAdmin.value) {
      return query;
    }

    // Branch managers only see their managed stores
    if (isBranchManager.value && managedStoreIds.value.length > 0) {
      return query.in("store_id", managedStoreIds.value);
    }

    // If no managed stores, return query that returns no results
    if (isBranchManager.value && managedStoreIds.value.length === 0) {
      return query.eq("store_id", "00000000-0000-0000-0000-000000000000"); // Non-existent UUID
    }

    return query;
  };

  /**
   * Fetch orders with automatic store filtering
   */
  const fetchOrders = async (additionalFilters: Record<string, any> = {}) => {
    let query = supabase
      .from("orders")
      .select(
        `
        id, user_id, store_id, items, subtotal, delivery_fee, total_amount, confirmation_code, status, delivery_method, delivery_details, paystack_reference, paystack_transaction_id, metadata, created_at, updated_at, paid_at, delivered_at,
        store:stores(id, name)
      `,
      )
      .order("created_at", { ascending: false });

    // Apply store filter
    query = applyStoreFilter(query);

    // Apply additional filters
    for (const [key, value] of Object.entries(additionalFilters)) {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      error.value = fetchError.message;
      console.error("Error fetching orders:", fetchError);
      return [];
    }

    return data || [];
  };

  /**
   * Fetch store inventory with automatic store filtering
   */
  const fetchInventory = async (
    additionalFilters: Record<string, any> = {},
  ) => {
    let query = supabase
      .from("store_inventory")
      .select(
        `
        id, store_id, product_id, stock_level, reserved_stock, available_stock, digital_buffer, is_visible, store_price, aisle, shelf, section, created_at, updated_at,
        store:stores(id, name),
        product:products(id, name, description, price, image_url, sku, category_id, unit, is_active)
      `,
      )
      .order("updated_at", { ascending: false });

    // Apply store filter
    query = applyStoreFilter(query);

    // Apply additional filters
    for (const [key, value] of Object.entries(additionalFilters)) {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      error.value = fetchError.message;
      console.error("Error fetching inventory:", fetchError);
      return [];
    }

    return data || [];
  };

  /**
   * Fetch stores accessible to current user
   */
  const fetchStores = async () => {
    if (isSuperAdmin.value) {
      // Super admins can see all stores
      const { data, error: fetchError } = await supabase
        .from("stores")
        .select(
          "id, name, address, city, state, is_active, operating_hours, phone, email, code",
        )
        .eq("is_active", true)
        .order("name");

      if (fetchError) {
        error.value = fetchError.message;
        return [];
      }

      return data || [];
    }

    // Branch managers only see their managed stores
    return managedStores.value;
  };

  /**
   * Check if user can access a specific store
   */
  const canAccessStore = (storeId: string): boolean => {
    if (isSuperAdmin.value) return true;
    if (isBranchManager.value) {
      return managedStoreIds.value.includes(storeId);
    }
    return false;
  };

  /**
   * Get dashboard stats with automatic store filtering
   */
  const fetchDashboardStats = async () => {
    // If super admin, pass no store filter to get global stats
    const storeIdParam = isSuperAdmin.value
      ? null
      : managedStoreIds.value[0] || null;

    const { data, error: statsError } = await supabase.rpc(
      "get_admin_dashboard_stats",
      storeIdParam ? { p_store_id: storeIdParam } : (undefined as any),
    );

    if (statsError) {
      error.value = statsError.message;
      console.error("Error fetching dashboard stats:", statsError);
      return null;
    }

    return data?.[0] || null;
  };

  return {
    // State
    profile: readonly(profile),
    managedStores: readonly(managedStores),
    loading: readonly(loading),
    error: readonly(error),

    // Computed
    isSuperAdmin,
    isBranchManager,
    managedStoreIds,
    currentStoreNames,

    // Methods
    initialize,
    applyStoreFilter,
    fetchOrders,
    fetchInventory,
    fetchStores,
    canAccessStore,
    fetchDashboardStats,
  };
};
