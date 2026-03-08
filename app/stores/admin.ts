// Admin ERP Store - Comprehensive Order & Operations Management
import { defineStore } from "pinia";
import type { Database } from "~/types/database.types";

export type AdminOrderStatus =
  | "awaiting_call"
  | "pending"
  | "processing"
  | "paid"
  | "confirmed"
  | "ready_for_pos"
  | "completed_in_pos"
  | "assigned"
  | "picked_up"
  | "arrived"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface AdminOrder {
  id: string;
  user_id: string;
  store_id: string;
  status: AdminOrderStatus;
  total_amount: number;
  subtotal: number;
  delivery_fee: number;
  service_fee?: number;
  delivery_address: any;
  delivery_details: {
    contactName?: string;
    contactPhone?: string;
    address?: {
      area?: string;
      street?: string;
      houseNumber?: string;
      landmark?: string;
    };
  } | null;
  contact_name: string | null;
  contact_phone: string | null;
  delivery_instructions: string | null;
  delivery_method: "pickup" | "delivery";
  payment_method: "cash_on_delivery" | "online_payment" | "pod";
  payment_status: "pending" | "paid" | "failed" | "refunded";
  paystack_reference?: string;
  paystack_transaction_id?: string;
  items: any[];
  metadata?: any;
  created_at: string;
  updated_at: string;
  claimed_by: string | null;
  claimed_at: string | null;
  verified_at: string | null;
  verified_by: string | null;
  call_attempt_count: number;
  last_call_attempt_at: string | null;
  customer: {
    id: string;
    full_name: string | null;
    phone_number: string | null;
  } | null;
  store: {
    id: string;
    name: string;
  } | null;
}

export interface DashboardStats {
  unconfirmed_orders: number;
  active_pickups: number;
  riders_en_route: number;
  daily_revenue: number;
  pending_verification: number;
  orders_in_processing: number;
  orders_out_for_delivery: number;
  cancelled_today: number;
}

export interface OrderInteraction {
  id: string;
  order_id: string;
  staff_id: string;
  interaction_type: string;
  outcome: string | null;
  notes: string | null;
  created_at: string;
  verified_address: boolean;
  verified_amount: boolean;
  verified_substitutions: boolean;
  substitution_approved: boolean;
  substitution_details: string | null;
  staff?: {
    full_name: string | null;
  } | null;
}

interface AdminState {
  orders: AdminOrder[];
  selectedOrder: AdminOrder | null;
  interactions: OrderInteraction[];
  dashboardStats: DashboardStats | null;
  currentStoreId: string | null;
  availableStores: Array<{ id: string; name: string; code: string }>;
  loading: boolean;
  statsLoading: boolean;
  optimisticUpdates: Map<string, Partial<AdminOrder>>;
  realtimeSubscription: any;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
    totalCount: number | null;
  };
}

export const useAdminStore = defineStore("admin", {
  state: (): AdminState => ({
    orders: [],
    selectedOrder: null,
    interactions: [],
    dashboardStats: null,
    currentStoreId: null,
    availableStores: [],
    loading: false,
    statsLoading: false,
    optimisticUpdates: new Map(),
    realtimeSubscription: null,
    pagination: {
      limit: 20,
      offset: 0,
      hasMore: true,
      totalCount: null,
    },
  }),

  getters: {
    processingOrders: (state) => {
      const filtered = state.orders.filter((o) =>
        ["processing", "paid", "confirmed", "picked_up"].includes(o.status),
      );
      console.log(
        "processingOrders:",
        filtered.length,
        "orders with statuses:",
        filtered.map((o) => o.status),
      );
      return filtered;
    },

    deliveryOrders: (state) => {
      const filtered = state.orders.filter((o) => o.status === "picked_up");
      console.log("deliveryOrders:", filtered.length, "orders");
      return filtered;
    },

    completedOrders: (state) => {
      const filtered = state.orders.filter((o) =>
        ["delivered", "cancelled", "refunded"].includes(o.status),
      );
      console.log("completedOrders:", filtered.length, "orders");
      return filtered;
    },

    filteredOrders: (state) => {
      if (!state.currentStoreId) return state.orders;
      return state.orders.filter((o) => o.store_id === state.currentStoreId);
    },
  },

  actions: {
    // ============================================
    // INITIALIZATION & REALTIME
    // ============================================

    async initialize() {
      await this.fetchAvailableStores();
      await this.fetchDashboardStats();
      await this.fetchOrders(true);
      this.setupRealtimeSubscription();
    },

    setupRealtimeSubscription() {
      const supabase = useSupabaseClient<Database>();

      this.realtimeSubscription = supabase
        .channel("admin-orders")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
          },
          (payload) => {
            this.handleRealtimeUpdate(payload);
          },
        )
        .subscribe();
    },

    handleRealtimeUpdate(payload: any) {
      switch (payload.eventType) {
        case "UPDATE":
          const index = this.orders.findIndex((o) => o.id === payload.new.id);
          if (index !== -1) {
            const optimistic = this.optimisticUpdates.get(payload.new.id);
            this.orders[index] = {
              ...this.orders[index],
              ...payload.new,
              ...optimistic,
            };
          }
          break;

        case "INSERT":
          this.orders.unshift(payload.new as AdminOrder);
          break;

        case "DELETE":
          this.orders = this.orders.filter((o) => o.id !== payload.old.id);
          break;
      }

      this.fetchDashboardStats();
    },

    cleanup() {
      if (this.realtimeSubscription) {
        const supabase = useSupabaseClient();
        supabase.removeChannel(this.realtimeSubscription);
        this.realtimeSubscription = null;
      }
    },

    // ============================================
    // DATA FETCHING
    // ============================================

    async fetchDashboardStats() {
      const supabase = useSupabaseClient<Database>();
      this.statsLoading = true;

      try {
        const { data, error } = await (supabase.rpc as any)(
          "get_admin_dashboard_stats",
          {
            p_store_id: this.currentStoreId,
          },
        );

        if (error) throw error;
        if (data && Array.isArray(data) && data.length > 0) {
          this.dashboardStats = data[0] as DashboardStats;
        }
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
      } finally {
        this.statsLoading = false;
      }
    },

    async fetchOrders(reset = false) {
      const supabase = useSupabaseClient<Database>();
      this.loading = true;

      if (reset) {
        this.pagination.offset = 0;
        this.pagination.hasMore = true;
        this.orders = [];
      }

      try {
        let query = supabase
          .from("orders")
          .select(
            `
            *,
            store:stores!store_id(id, name)
          `,
            { count: "exact" },
          )
          .order("created_at", { ascending: false })
          .range(
            this.pagination.offset,
            this.pagination.offset + this.pagination.limit - 1,
          );

        if (this.currentStoreId) {
          query = query.eq("store_id", this.currentStoreId);
        }

        const { data, error, count } = await query;

        if (error) {
          console.error("Supabase error details:", error);
          throw error;
        }

        const newOrders = (data || []) as unknown as AdminOrder[];

        if (reset) {
          this.orders = newOrders;
        } else {
          // Avoid duplicates
          const existingIds = new Set(this.orders.map((o) => o.id));
          const uniqueNewOrders = newOrders.filter(
            (o) => !existingIds.has(o.id),
          );
          this.orders.push(...uniqueNewOrders);
        }

        this.pagination.totalCount = count;
        this.pagination.hasMore = newOrders.length === this.pagination.limit;

        console.log(
          "Loaded",
          this.orders.length,
          "orders. Statuses:",
          this.orders
            .map((o) => o.status)
            .reduce(
              (acc, s) => {
                acc[s] = (acc[s] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>,
            ),
        );
      } catch (err) {
        console.error("Error fetching orders:", err);
      } finally {
        this.loading = false;
      }
    },

    async fetchMoreOrders(): Promise<boolean> {
      if (!this.pagination.hasMore || this.loading) return false;

      this.pagination.offset += this.pagination.limit;
      await this.fetchOrders();
      return this.pagination.hasMore;
    },

    async fetchAvailableStores() {
      const supabase = useSupabaseClient<Database>();

      try {
        const { data, error } = await supabase
          .from("stores")
          .select("id, name, code")
          .eq("is_active", true)
          .order("name");

        if (error) throw error;
        this.availableStores = data || [];
      } catch (err) {
        console.error("Error fetching stores:", err);
      }
    },

    async fetchOrderInteractions(orderId: string) {
      const supabase = useSupabaseClient<Database>();

      try {
        const { data, error } = await supabase
          .from("order_interactions")
          .select(
            `
            *,
            staff:profiles!staff_id(full_name)
          `,
          )
          .eq("order_id", orderId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        this.interactions = (data || []) as unknown as OrderInteraction[];
      } catch (err) {
        console.error("Error fetching interactions:", err);
      }
    },

    // ============================================
    // STORE SWITCHING (Branch Teleport)
    // ============================================

    setCurrentStore(storeId: string | null) {
      this.currentStoreId = storeId;
      this.fetchOrders(true);
      this.fetchDashboardStats();
    },

    // ============================================
    // ORDER CLAIMING
    // ============================================

    async claimOrder(orderId: string): Promise<boolean> {
      const supabase = useSupabaseClient<Database>();

      try {
        const { data, error } = await supabase.rpc("claim_order", {
          p_order_id: orderId,
        } as any);

        if (error) throw error;

        if (data) {
          await this.logInteraction(orderId, "status_change", "claimed");
          await this.fetchOrders();
          return true;
        }
        return false;
      } catch (err) {
        console.error("Error claiming order:", err);
        return false;
      }
    },

    async releaseOrder(orderId: string): Promise<boolean> {
      const supabase = useSupabaseClient<Database>();

      try {
        const { error } = await (supabase.from("orders").update as any)({
          claimed_by: null,
          claimed_at: null,
          updated_at: new Date().toISOString(),
        }).eq("id", orderId);

        if (error) throw error;

        await this.fetchOrders();
        return true;
      } catch (err) {
        console.error("Error releasing order:", err);
        return false;
      }
    },

    // ============================================
    // VERIFICATION & INTERACTIONS
    // ============================================

    async logInteraction(
      orderId: string,
      type: string,
      outcome: string | null = null,
      details: any = {},
    ): Promise<boolean> {
      const supabase = useSupabaseClient<Database>();

      try {
        const { error } = await supabase.rpc("log_order_interaction", {
          p_order_id: orderId,
          p_interaction_type: type,
          p_outcome: outcome,
          p_notes: details.notes || null,
          p_metadata: details.metadata || {},
          p_verified_address: details.verified_address || false,
          p_verified_amount: details.verified_amount || false,
          p_verified_substitutions: details.verified_substitutions || false,
          p_substitution_approved: details.substitution_approved || false,
          p_substitution_details: details.substitution_details || null,
        } as any);

        if (error) {
          console.warn(
            "log_order_interaction failed (migration may not be applied):",
            error.message,
          );
          // Silently fail - don't block order operations if logging isn't available
          return true;
        }

        return true;
      } catch (err) {
        console.error("Error logging interaction:", err);
        return false;
      }
    },

    async verifyOrder(
      orderId: string,
      verificationData: {
        verifiedAddress: boolean;
        verifiedAmount: boolean;
        verifiedSubstitutions: boolean;
        substitutionApproved?: boolean;
        substitutionDetails?: string;
        notes?: string;
      },
    ): Promise<boolean> {
      const supabase = useSupabaseClient<Database>();

      try {
        await this.logInteraction(orderId, "verification", "confirmed", {
          verified_address: verificationData.verifiedAddress,
          verified_amount: verificationData.verifiedAmount,
          verified_substitutions: verificationData.verifiedSubstitutions,
          substitution_approved: verificationData.substitutionApproved,
          substitution_details: verificationData.substitutionDetails,
          notes: verificationData.notes,
        });

        // Direct status update instead of RPC (claimed_by column doesn't exist)
        const { error } = await (supabase.from("orders").update as any)({
          status: "confirmed",
          updated_at: new Date().toISOString(),
        }).eq("id", orderId);

        if (error) throw error;

        await this.fetchOrders();
        await this.fetchDashboardStats();
        return true;
      } catch (err) {
        console.error("Error verifying order:", err);
        return false;
      }
    },

    async rejectOrder(
      orderId: string,
      reason: string,
      details?: string,
    ): Promise<boolean> {
      const supabase = useSupabaseClient<Database>();

      try {
        await this.logInteraction(orderId, "rejection", "rejected", {
          notes: `Reason: ${reason}. ${details || ""}`,
        });

        // Direct status update instead of RPC (claimed_by column doesn't exist)
        const { error } = await (supabase.from("orders").update as any)({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        }).eq("id", orderId);

        if (error) throw error;

        await this.fetchOrders();
        await this.fetchDashboardStats();
        return true;
      } catch (err) {
        console.error("Error rejecting order:", err);
        return false;
      }
    },

    // ============================================
    // RIDER DISPATCH
    // ============================================

    async dispatchRider(
      orderId: string,
      riderData: {
        name: string;
        phone: string;
        estimatedArrival?: string;
      },
    ): Promise<string | null> {
      const supabase = useSupabaseClient<Database>();

      try {
        const { data, error } = await supabase.rpc("dispatch_rider", {
          p_order_id: orderId,
          p_rider_name: riderData.name,
          p_rider_phone: riderData.phone || null,
          p_estimated_arrival: riderData.estimatedArrival || null,
        } as any);

        if (error) throw error;

        await this.fetchOrders();
        return data || null;
      } catch (err) {
        console.error("Error dispatching rider:", err);
        return null;
      }
    },

    // ============================================
    // CUSTOMER RESTRICTIONS (Blacklist)
    // ============================================

    async addCustomerRestriction(
      userId: string,
      restriction: {
        type:
          | "pod_disabled"
          | "account_suspended"
          | "order_limit"
          | "manual_verification_required";
        reason: string;
        details?: string;
        expiresAt?: string;
      },
    ): Promise<string | null> {
      const supabase = useSupabaseClient<Database>();

      try {
        const { data, error } = await supabase.rpc("add_customer_restriction", {
          p_user_id: userId,
          p_restriction_type: restriction.type,
          p_reason: restriction.reason,
          p_details: restriction.details || null,
          p_expires_at: restriction.expiresAt || null,
        } as any);

        if (error) throw error;
        return data || null;
      } catch (err) {
        console.error("Error adding restriction:", err);
        return null;
      }
    },

    async removeCustomerRestriction(restrictionId: string): Promise<boolean> {
      const supabase = useSupabaseClient<Database>();

      try {
        const { data, error } = await supabase.rpc(
          "remove_customer_restriction",
          {
            p_restriction_id: restrictionId,
          } as any,
        );

        if (error) throw error;
        return !!data;
      } catch (err) {
        console.error("Error removing restriction:", err);
        return false;
      }
    },

    // ============================================
    // ORDER STATUS MANAGEMENT
    // ============================================

    async updateOrderStatus(
      orderId: string,
      newStatus: AdminOrderStatus,
      notes?: string,
    ): Promise<boolean> {
      const supabase = useSupabaseClient<Database>();

      try {
        const updates: any = {
          status: newStatus,
          updated_at: new Date().toISOString(),
        };

        if (newStatus === "delivered") {
          updates.delivered_at = new Date().toISOString();
        }

        const { error } = await (supabase.from("orders").update as any)(
          updates,
        ).eq("id", orderId);

        if (error) {
          console.error("Supabase update error:", error);
          throw error;
        }

        await this.logInteraction(orderId, "status_change", null, {
          notes: notes || `Status updated to ${newStatus}`,
          metadata: { new_status: newStatus },
        });

        await this.fetchOrders();
        await this.fetchDashboardStats();
        return true;
      } catch (err) {
        console.error("Error updating order status:", err);
        return false;
      }
    },
  },
});
