import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";
import { useUserStore } from "~/stores/user";

export type DashboardStats = {
  pending_count: number;
  todays_count: number;
  todays_revenue: number;
  low_stock_count: number;
};

export type VerificationQueueStats = {
  call_list_count: number;
  unverified_value: number;
};

export type OperationalKpis = {
  window_days: number;
  orders_today: number;
  orders_per_day: number;
  average_order_value: number;
  fulfillment_time_hours: number | null;
  cancellation_rate: number;
  stock_mismatch_rate: number;
};

let ordersChannel: RealtimeChannel | null = null;
let inventoryChannel: RealtimeChannel | null = null;
let verificationOrdersChannel: RealtimeChannel | null = null;

let dashboardRefreshTimer: ReturnType<typeof setTimeout> | null = null;
let verificationRefreshTimer: ReturnType<typeof setTimeout> | null = null;

export const useDashboard = () => {
  const supabase = useSupabaseClient<Database>();
  const userStore = useUserStore();

  const stats = useState<DashboardStats | null>("dashboard_stats", () => null);
  const verificationStats = useState<VerificationQueueStats | null>(
    "verification_queue_stats",
    () => null,
  );
  const operationalKpis = useState<OperationalKpis | null>(
    "operational_kpis",
    () => null,
  );
  const loading = useState<boolean>("dashboard_stats_loading", () => false);
  const verificationLoading = useState<boolean>(
    "verification_queue_stats_loading",
    () => false,
  );
  const operationalLoading = useState<boolean>(
    "operational_kpis_loading",
    () => false,
  );
  const error = useState<string | null>("dashboard_stats_error", () => null);
  const verificationError = useState<string | null>(
    "verification_queue_stats_error",
    () => null,
  );
  const operationalError = useState<string | null>(
    "operational_kpis_error",
    () => null,
  );

  const scheduleRefresh = () => {
    if (dashboardRefreshTimer) clearTimeout(dashboardRefreshTimer);
    dashboardRefreshTimer = setTimeout(() => {
      fetchDashboardStats({ silent: true });
    }, 250);
  };

  const fetchOperationalKpis = async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;

    if (!silent) operationalLoading.value = true;
    operationalError.value = null;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        throw new Error("Missing session");
      }

      const res = await $fetch<{ success: boolean; kpis: OperationalKpis }>(
        "/api/admin/operational-kpis",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      operationalKpis.value = (res as any)?.kpis || null;
    } catch (err: any) {
      operationalError.value =
        err?.message || "Failed to fetch operational KPIs";
    } finally {
      if (!silent) operationalLoading.value = false;
    }
  };

  const scheduleVerificationRefresh = () => {
    if (verificationRefreshTimer) clearTimeout(verificationRefreshTimer);
    verificationRefreshTimer = setTimeout(() => {
      fetchVerificationQueueStats({ silent: true });
    }, 250);
  };

  const effectiveRole = computed(() => userStore.effectiveRole);

  // Super Admin => global (null)
  // Branch Manager => their store scope
  // Staff => scoped by store_id where available (still hides revenue in UI)
  const targetBranchId = computed<string | null>(() => {
    if (effectiveRole.value === "super_admin") return null;

    const profile = userStore.profile;
    if (!profile) return null;

    if (profile.store_id) return profile.store_id;
    if (
      Array.isArray(profile.managed_store_ids) &&
      profile.managed_store_ids.length > 0
    ) {
      return profile.managed_store_ids[0] || null;
    }
    return null;
  });

  // Allow overriding the target branch (for multi-store managers)
  const selectedStoreId = useState<string | null>(
    "dashboard_selected_store",
    () => null,
  );

  const effectiveTargetBranchId = computed<string | null>(() => {
    // If a specific store is selected, use that
    if (selectedStoreId.value) return selectedStoreId.value;
    // Otherwise use the default targetBranchId
    return targetBranchId.value;
  });

  const showRevenue = computed(() => {
    // Staff should not see revenue; Managers + Super Admin can.
    return effectiveRole.value !== "staff";
  });

  const fetchDashboardStats = async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;

    if (!silent) loading.value = true;
    error.value = null;

    try {
      const { data, error: rpcError } = await (supabase.rpc as any)(
        "get_admin_dashboard_stats",
        {
          target_branch_id: effectiveTargetBranchId.value,
        },
      );
      if (rpcError) throw rpcError;

      const payload = Array.isArray(data) ? data[0] : data;
      stats.value = (payload || null) as DashboardStats | null;
    } catch (err: any) {
      error.value = err?.message || "Failed to fetch dashboard stats";
    } finally {
      if (!silent) loading.value = false;
    }
  };

  const fetchVerificationQueueStats = async (options?: {
    silent?: boolean;
  }) => {
    const silent = options?.silent === true;

    if (!silent) verificationLoading.value = true;
    verificationError.value = null;

    try {
      const { data, error: rpcError } = await (supabase.rpc as any)(
        "get_verification_queue_stats",
        {
          target_branch_id: effectiveTargetBranchId.value,
        },
      );
      if (rpcError) throw rpcError;

      const payload = Array.isArray(data) ? data[0] : data;
      verificationStats.value = (payload ||
        null) as VerificationQueueStats | null;
    } catch (err: any) {
      verificationError.value =
        err?.message || "Failed to fetch verification queue stats";
    } finally {
      if (!silent) verificationLoading.value = false;
    }
  };

  const subscribeToRealtime = () => {
    unsubscribeFromRealtime();

    const storeFilter = effectiveTargetBranchId.value
      ? `store_id=eq.${effectiveTargetBranchId.value}`
      : undefined;

    ordersChannel = supabase
      .channel("admin-dashboard:orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: storeFilter },
        () => scheduleRefresh(),
      )
      .subscribe();

    inventoryChannel = supabase
      .channel("admin-dashboard:store_inventory")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "store_inventory",
          filter: storeFilter,
        },
        () => scheduleRefresh(),
      )
      .subscribe();
  };

  const subscribeToVerificationRealtime = () => {
    if (verificationOrdersChannel) {
      supabase.removeChannel(verificationOrdersChannel);
      verificationOrdersChannel = null;
    }

    const storeFilter = effectiveTargetBranchId.value
      ? `store_id=eq.${effectiveTargetBranchId.value}`
      : undefined;

    verificationOrdersChannel = supabase
      .channel("verification-queue:orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: storeFilter },
        () => scheduleVerificationRefresh(),
      )
      .subscribe();
  };

  const unsubscribeFromRealtime = () => {
    if (ordersChannel) {
      supabase.removeChannel(ordersChannel);
      ordersChannel = null;
    }

    if (inventoryChannel) {
      supabase.removeChannel(inventoryChannel);
      inventoryChannel = null;
    }

    if (verificationOrdersChannel) {
      supabase.removeChannel(verificationOrdersChannel);
      verificationOrdersChannel = null;
    }

    if (dashboardRefreshTimer) {
      clearTimeout(dashboardRefreshTimer);
      dashboardRefreshTimer = null;
    }

    if (verificationRefreshTimer) {
      clearTimeout(verificationRefreshTimer);
      verificationRefreshTimer = null;
    }
  };

  const ensureUserReady = async () => {
    if (!userStore.profile && !userStore.loading) {
      await userStore.initialize();
    }
  };

  const startDashboard = async () => {
    await ensureUserReady();
    await Promise.all([fetchDashboardStats(), fetchOperationalKpis()]);
    subscribeToRealtime();
  };

  const startVerificationQueue = async () => {
    await ensureUserReady();
    await Promise.all([
      fetchDashboardStats(),
      fetchVerificationQueueStats(),
      fetchOperationalKpis(),
    ]);
    subscribeToRealtime();
    subscribeToVerificationRealtime();
  };

  const stopAll = () => {
    unsubscribeFromRealtime();
  };

  const formatNaira = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(amount)
      .replace("NGN", "₦");
  };

  return {
    stats,
    verificationStats,
    operationalKpis,
    loading,
    verificationLoading,
    operationalLoading,
    error,
    verificationError,
    operationalError,
    fetchDashboardStats,
    fetchVerificationQueueStats,
    fetchOperationalKpis,
    subscribeToRealtime,
    subscribeToVerificationRealtime,
    unsubscribeFromRealtime,
    startDashboard,
    startVerificationQueue,
    stopAll,
    targetBranchId,
    effectiveTargetBranchId,
    selectedStoreId,
    effectiveRole,
    showRevenue,
    formatNaira,
  };
};
