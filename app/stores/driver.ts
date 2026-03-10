// Driver Store - Manages driver state, active orders, and delivery workflow
import { defineStore } from "pinia";
import type { Database } from "~/types/database.types";

type OrderStatus = "assigned" | "picked_up" | "arrived" | "delivered";

interface DeliveryDetails {
  address?: {
    area?: string;
    street?: string;
    houseNumber?: string;
    landmark?: string;
    lat?: number;
    latitude?: number;
    lng?: number;
    longitude?: number;
  };
  contactPhone?: string;
  deliveryZone?: string;
  coordinates?: {
    lat?: number;
    latitude?: number;
    lng?: number;
    longitude?: number;
  };
  location?: {
    lat?: number;
    latitude?: number;
    lng?: number;
    longitude?: number;
  };
  geo?: { lat?: number; latitude?: number; lng?: number; longitude?: number };
  lat?: number;
  latitude?: number;
  lng?: number;
  longitude?: number;
}

interface ActiveOrder {
  id: string;
  user_id: string;
  store_id: string;
  items: any[];
  total_amount: number;
  delivery_fee: number;
  status: OrderStatus;
  payment_method: "online" | "pod";
  delivery_details: DeliveryDetails | null;
  nearest_landmark: string | null;
  confirmation_code: string;
  assigned_at: string;
  picked_up_at: string | null;
  arrived_at: string | null;
  delivered_at: string | null;
  driver_notes: string | null;
  created_at: string;
  customer?: {
    full_name: string | null;
    phone_number: string | null;
  };
}

interface DriverState {
  activeOrders: ActiveOrder[]; // Changed from single activeOrder to array
  orderHistory: ActiveOrder[];
  driverStatus: "offline" | "available" | "on_delivery";
  loading: boolean;
  error: string | null;
  realtimeChannel: any | null;
  offlineActions: OfflineAction[];
  isOnline: boolean;
  withdrawableBalance: number;
  eligibleOrdersCount: number;
  minimumPayout: number;
  canRequestPayout: boolean;
  hasPendingPayoutRequest: boolean;
  maxOrdersPerDriver: number; // Configurable limit
}

interface OfflineAction {
  id: string;
  type: "status_update" | "delivery_confirm";
  orderId: string;
  data: any;
  timestamp: number;
}

export const useDriverStore = defineStore("driver", {
  state: (): DriverState => ({
    activeOrders: [], // Changed from null to empty array
    orderHistory: [],
    driverStatus: "offline",
    loading: false,
    error: null,
    realtimeChannel: null,
    offlineActions: [],
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    withdrawableBalance: 0,
    eligibleOrdersCount: 0,
    minimumPayout: 2000,
    canRequestPayout: false,
    hasPendingPayoutRequest: false,
    maxOrdersPerDriver: 6, // Default: allow up to 3 orders at once
  }),

  getters: {
    // Check if driver has any active orders
    hasActiveOrder: (state) => state.activeOrders.length > 0,

    // Count of active orders
    activeOrderCount: (state) => state.activeOrders.length,

    // Check if driver can take more orders (under the limit)
    canTakeMoreOrders: (state) =>
      state.activeOrders.length < state.maxOrdersPerDriver,

    isAvailable: (state) => state.driverStatus === "available",

    isOnDelivery: (state) =>
      state.driverStatus === "on_delivery" || state.activeOrders.length > 0,

    // Get the current (first) active order status
    currentOrderStatus: (state) => state.activeOrders[0]?.status || null,

    // Get first active order for backward compatibility
    activeOrder: (state) => state.activeOrders[0] || null,

    // Get customer location for navigation
    customerLocation(state): { lat?: number; lng?: number } | null {
      const order = this.activeOrder;
      if (!order?.delivery_details) return null;
      const details: any = order.delivery_details;
      const addr: any = details?.address;
      const coords: any =
        details?.coordinates || details?.location || details?.geo;

      const lat =
        (addr && (addr.lat ?? addr.latitude)) ??
        (coords && (coords.lat ?? coords.latitude)) ??
        details?.lat ??
        details?.latitude;

      const lng =
        (addr && (addr.lng ?? addr.longitude)) ??
        (coords && (coords.lng ?? coords.longitude)) ??
        details?.lng ??
        details?.longitude;

      if (typeof lat === "number" && typeof lng === "number")
        return { lat, lng };
      if (typeof lat === "string" && typeof lng === "string") {
        const latNum = Number(lat);
        const lngNum = Number(lng);
        if (!Number.isNaN(latNum) && !Number.isNaN(lngNum))
          return { lat: latNum, lng: lngNum };
      }

      return null;
    },

    // Calculate total earnings (from delivered orders)
    todayEarnings: (state) => {
      const today = new Date().toDateString();
      return state.orderHistory
        .filter((order) => {
          const deliveredDate = order.delivered_at
            ? new Date(order.delivered_at).toDateString()
            : null;
          return deliveredDate === today;
        })
        .reduce((sum, order) => sum + Number(order.total_amount), 0);
    },

    // Calculate today's delivery fees earned by driver
    todayDeliveryFees: (state) => {
      const today = new Date().toDateString();
      return state.orderHistory
        .filter((order) => {
          const deliveredDate = order.delivered_at
            ? new Date(order.delivered_at).toDateString()
            : null;
          return deliveredDate === today;
        })
        .reduce((sum, order) => sum + Number(order.delivery_fee || 0), 0);
    },

    // Count today's deliveries
    todayDeliveries: (state) => {
      const today = new Date().toDateString();
      return state.orderHistory.filter((order) => {
        const deliveredDate = order.delivered_at
          ? new Date(order.delivered_at).toDateString()
          : null;
        return deliveredDate === today;
      }).length;
    },

    // Check if payment is POD - always returns false since POD is disabled
    isPayOnDelivery: () => false,

    // Get next action button text based on status
    nextActionText(state) {
      const order = this.activeOrder;
      if (!order) return null;

      const status = order.status;

      switch (status) {
        case "assigned":
          return "Confirm Pickup at Store";
        case "picked_up":
          return "Arrived at Customer";
        case "arrived":
          return "Enter Delivery PIN";
        default:
          return null;
      }
    },
  },

  actions: {
    async fetchWithdrawableBalance() {
      const supabase = useSupabaseClient<Database>();
      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) return;

        const res = await $fetch("/api/driver/payout-balance", {
          method: "GET" as any,
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const bal = (res as any)?.balance;
        this.withdrawableBalance = Number(bal?.withdrawableBalance || 0);
        this.eligibleOrdersCount = Number(bal?.eligibleOrdersCount || 0);
        this.minimumPayout = Number(bal?.minimumPayout || 2000);
        this.canRequestPayout = Boolean(bal?.canRequest);
        this.hasPendingPayoutRequest = Boolean(bal?.hasPendingRequest);
      } catch (err: any) {
        console.error("Failed to fetch withdrawable balance:", err);
      }
    },

    async requestPayout(bankDetails: Record<string, any>) {
      const supabase = useSupabaseClient<Database>();
      const toast = useToast();

      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) throw new Error("Session expired");

        if (this.hasPendingPayoutRequest) {
          toast.add({
            title: "Payout Pending",
            description: "You already have a pending payout request.",
            color: "warning",
          } as any);
          return;
        }

        if (this.withdrawableBalance < this.minimumPayout) {
          toast.add({
            title: "Insufficient Balance",
            description: `Minimum payout is ₦${this.minimumPayout.toLocaleString()}`,
            color: "warning",
          } as any);
          return;
        }

        await $fetch("/api/driver/request-payout", {
          method: "POST" as any,
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: {
            bank_details: bankDetails,
          },
        });

        toast.add({
          title: "Payout Requested",
          description: "Your payout request has been submitted.",
          color: "success",
        } as any);

        const refresh = this.fetchWithdrawableBalance as unknown as
          | (() => Promise<void>)
          | undefined;
        if (refresh) {
          await refresh();
        }
      } catch (err: any) {
        const message = err?.statusMessage || err?.message || "Request failed";
        toast.add({
          title: "Payout Request Failed",
          description: message,
          color: "error",
        } as any);
        throw err;
      }
    },

    async resolveUserId() {
      const supabase = useSupabaseClient<Database>();
      const user = useSupabaseUser();

      const direct = (user.value as any)?.id || (user.value as any)?.sub;
      if (direct) return direct as string;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const sessionId =
        (session?.user as any)?.id || (session?.user as any)?.sub;
      return (sessionId || null) as string | null;
    },

    // Initialize driver - fetch active order and setup realtime
    async initialize() {
      const supabase = useSupabaseClient<Database>();
      const userId = await this.resolveUserId();
      if (!userId) return;

      this.loading = true;
      try {
        // Fetch driver's current status
        const { data: profile } = await (
          supabase.from("profiles").select as any
        )("driver_status")
          .eq("id", userId)
          .single();

        if (profile) {
          this.driverStatus = profile.driver_status as any;
        }

        // Fetch active orders (multiple)
        await this.fetchActiveOrders();

        // Fetch order history for performance metrics
        await this.fetchOrderHistory();

        // Fetch withdrawable payout balance
        {
          const refresh = this.fetchWithdrawableBalance as unknown as
            | (() => Promise<void>)
            | undefined;
          if (refresh) {
            await refresh();
          }
        }

        // Setup realtime subscription
        this.setupRealtimeSubscription();

        // Setup offline/online detection
        this.setupOfflineDetection();

        // Try to sync offline actions
        await this.syncOfflineActions();
      } catch (err: any) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    // Fetch the driver's currently assigned orders (multiple)
    async fetchActiveOrders() {
      const supabase = useSupabaseClient<Database>();
      const userId = await this.resolveUserId();
      if (!userId) return;

      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("driver_id", userId)
          .in("status", ["assigned", "picked_up", "arrived"])
          .order("assigned_at", { ascending: false });

        if (error) throw error;

        const orders = (data || []) as ActiveOrder[];

        // Fetch customer profiles for all orders
        const userIds = Array.from(
          new Set(orders.map((o) => o.user_id).filter(Boolean)),
        );
        let customerMap = new Map<string, any>();

        if (userIds.length > 0) {
          const { data: customers } = await supabase
            .from("profiles")
            .select("id, full_name, phone_number")
            .in("id", userIds);

          for (const c of (customers || []) as any[]) {
            customerMap.set(c.id, c);
          }
        }

        // Attach customer data to orders
        this.activeOrders = orders.map((o) => ({
          ...o,
          customer: o.user_id ? customerMap.get(o.user_id) || null : null,
        }));

        // Update driver status based on active orders
        if (this.activeOrders.length > 0) {
          this.driverStatus = "on_delivery";
        } else if (this.driverStatus !== "offline") {
          this.driverStatus = "available";
        }
      } catch (err: any) {
        console.error("Failed to fetch active orders:", err);
      }
    },

    // Deprecated: kept for backward compatibility, use fetchActiveOrders
    async fetchActiveOrder() {
      return this.fetchActiveOrders();
    },

    // Fetch order history with pagination support
    async fetchOrderHistory(limit = 10, offset = 0, append = false) {
      const supabase = useSupabaseClient<Database>();
      const userId = await this.resolveUserId();
      if (!userId) return;

      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("driver_id", userId)
          .eq("status", "delivered")
          .order("delivered_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) throw error;

        const orders = (data || []) as any[];

        // Attach customer profiles best-effort (no FK join assumption)
        const userIds = Array.from(
          new Set(orders.map((o) => o.user_id).filter(Boolean)),
        );
        let customerMap = new Map<string, any>();

        if (userIds.length > 0) {
          const { data: customers } = await supabase
            .from("profiles")
            .select("id, full_name, phone_number")
            .in("id", userIds);

          for (const c of (customers || []) as any[]) {
            customerMap.set(c.id, c);
          }
        }

        const enrichedOrders = orders.map((o) => ({
          ...o,
          customer: o.user_id ? customerMap.get(o.user_id) || null : null,
        })) as any;

        if (append) {
          // Append to existing history, avoiding duplicates by order ID
          const existingIds = new Set(this.orderHistory.map((o) => o.id));
          const newOrders = enrichedOrders.filter(
            (o: any) => !existingIds.has(o.id),
          );
          this.orderHistory = [...this.orderHistory, ...newOrders];
        } else {
          // Replace existing history
          this.orderHistory = enrichedOrders;
        }
      } catch (err: any) {
        console.error("Failed to fetch order history:", err);
      }
    },

    // Toggle driver availability status
    async toggleAvailability() {
      const supabase = useSupabaseClient<Database>();
      const userId = await this.resolveUserId();
      if (!userId) {
        if (!userId) {
          const toast = useToast();
          toast.add({
            title: "Session Error",
            description: "Please sign in again to go online.",
            color: "error",
          } as any);
        }
        return;
      }

      // Prevent going offline when the driver has an active order.
      if (
        this.driverStatus === "available" &&
        (this.hasActiveOrder || this.isOnDelivery)
      ) {
        const toast = useToast();
        toast.add({
          title: "Cannot Go Offline",
          description:
            "You have an active delivery. Complete it before going offline.",
          color: "warning",
        } as any);
        return;
      }

      const newStatus =
        this.driverStatus === "available" ? "offline" : "available";

      try {
        const { error } = await (supabase.from("profiles").update as any)({
          driver_status: newStatus,
        }).eq("id", userId);

        if (error) throw error;

        this.driverStatus = newStatus;

        const toast = useToast();
        toast.add({
          title:
            newStatus === "available"
              ? "You are now Online"
              : "You are now Offline",
          description:
            newStatus === "available"
              ? "You will receive new delivery assignments"
              : "You will not receive new assignments",
          color: newStatus === "available" ? "green" : "gray",
        } as any);
      } catch (err: any) {
        this.error = err.message;
      }
    },

    // Strict State Machine: Validate status transitions
    // assigned → picked_up → arrived → delivered (sequential only)
    isValidStatusTransition(
      currentStatus: OrderStatus,
      newStatus: OrderStatus,
    ): boolean {
      const transitions: Record<OrderStatus, OrderStatus[]> = {
        assigned: ["picked_up"],
        picked_up: ["arrived"],
        arrived: ["delivered"],
        delivered: [],
      };
      return transitions[currentStatus]?.includes(newStatus) || false;
    },

    // Get current status in state machine for the first active order
    getCurrentState(): OrderStatus | null {
      return this.activeOrders[0]?.status || null;
    },

    // Get status of a specific order by ID
    getOrderStatus(orderId: string): OrderStatus | null {
      const order = this.activeOrders.find((o) => o.id === orderId);
      return order?.status || null;
    },

    // Strict State Machine: Update order status with validation
    async updateOrderStatus(newStatus: OrderStatus, orderId?: string) {
      const supabase = useSupabaseClient<Database>();

      // Find the specific order if orderId provided, otherwise use first active order
      const targetOrder = orderId
        ? this.activeOrders.find((o) => o.id === orderId)
        : this.activeOrders[0];

      if (!targetOrder) {
        const toast = useToast();
        toast.add({
          title: "Error",
          description: "No active order to update",
          color: "red",
        } as any);
        return;
      }

      const currentStatus = targetOrder.status;

      // STRICT VALIDATION: Prevent status skipping
      if (!this.isValidStatusTransition(currentStatus, newStatus)) {
        const toast = useToast();
        toast.add({
          title: "Invalid Action",
          description: `Cannot jump from "${currentStatus}" to "${newStatus}". Please follow the sequence: Assigned → Picked Up → Arrived → Delivered.`,
          color: "red",
        } as any);
        return;
      }

      // Build update payload with specific timestamps
      const updateData: any = { status: newStatus };
      const now = new Date().toISOString();

      switch (newStatus) {
        case "picked_up":
          updateData.picked_up_at = now;
          break;
        case "arrived":
          updateData.arrived_at = now;
          break;
        case "delivered":
          updateData.delivered_at = now;
          // Note: delivered status should ONLY be set via verifyDeliveryPIN
          // This is a safety check - normal updateOrderStatus should not set delivered
          const toast = useToast();
          toast.add({
            title: "Invalid Action",
            description: "Use PIN verification to complete delivery",
            color: "red",
          } as any);
          return;
      }

      // If offline, queue the action with full payload including timestamps
      if (!this.isOnline) {
        this.queueOfflineAction("status_update", targetOrder.id, {
          status: newStatus,
          ...updateData,
        });

        // Optimistically update local state
        targetOrder.status = newStatus;
        if (updateData.picked_up_at) {
          targetOrder.picked_up_at = updateData.picked_up_at;
        }
        if (updateData.arrived_at) {
          targetOrder.arrived_at = updateData.arrived_at;
        }

        const toast = useToast();
        toast.add({
          title: "📡 Offline Mode",
          description: `${this.getStatusMessage(newStatus)} saved. Will sync when online.`,
          color: "amber",
        } as any);
        return;
      }

      this.loading = true;
      try {
        const { error } = await (supabase.from("orders").update as any)(
          updateData,
        ).eq("id", targetOrder.id);

        if (error) throw error;

        // Update local state
        targetOrder.status = newStatus;
        if (updateData.picked_up_at) {
          targetOrder.picked_up_at = updateData.picked_up_at;
        }
        if (updateData.arrived_at) {
          targetOrder.arrived_at = updateData.arrived_at;
        }

        const toast = useToast();
        toast.add({
          title: "✅ Status Updated",
          description: this.getStatusMessage(newStatus),
          color: "green",
        } as any);
      } catch (err: any) {
        this.error = err.message;

        const toast = useToast();
        toast.add({
          title: "Update Failed",
          description: err.message,
          color: "red",
        } as any);
      } finally {
        this.loading = false;
      }
    },

    // Verify delivery PIN and complete delivery for a specific order
    async verifyDeliveryPIN(
      pin: string,
      orderId: string,
    ): Promise<"success" | "failed" | "queued"> {
      const supabase = useSupabaseClient<Database>();

      // Find the specific order
      const targetOrder = this.activeOrders.find((o) => o.id === orderId);
      if (!targetOrder) return "failed";

      // If offline, queue the action
      if (!this.isOnline) {
        this.queueOfflineAction("delivery_confirm", targetOrder.id, {
          pin,
        });

        const toast = useToast();
        toast.add({
          title: "Offline Mode",
          description:
            "Confirmation saved. Will sync when you are back online.",
          color: "amber",
        } as any);
        return "queued";
      }

      this.loading = true;
      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) throw new Error("Please sign in again to continue");

        await $fetch("/api/orders/verify-delivery-pin", {
          method: "POST" as any,
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: {
            orderId: targetOrder.id,
            pin,
          },
        });

        {
          // Remove completed order from active orders
          this.activeOrders = this.activeOrders.filter((o) => o.id !== orderId);

          // If no more active orders, set status back to available
          if (this.activeOrders.length === 0) {
            this.driverStatus = "available";
            await (supabase.from("profiles").update as any)({
              driver_status: "available",
            }).eq("id", (useSupabaseUser().value as any)?.id);
          }

          // Refresh order history
          await this.fetchOrderHistory();

          const toast = useToast();
          toast.add({
            title: "✅ Delivery Confirmed",
            description: "Order completed successfully. Great job!",
            color: "green",
          } as any);

          return "success";
        }
      } catch (err: any) {
        this.error = err.message;

        const toast = useToast();
        toast.add({
          title: "Verification Failed",
          description: err?.statusMessage || err?.message,
          color: "red",
        } as any);

        return "failed";
      } finally {
        this.loading = false;
      }
    },

    // Setup realtime subscription for order updates
    setupRealtimeSubscription() {
      const supabase = useSupabaseClient<Database>();
      const user = useSupabaseUser();
      const userId = (user.value as any)?.id || (user.value as any)?.sub;
      if (!userId) return;

      // Cleanup existing channel
      if (this.realtimeChannel) {
        supabase.removeChannel(this.realtimeChannel as any);
      }

      // Subscribe to orders assigned to this driver
      this.realtimeChannel = supabase
        .channel("driver-orders")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `driver_id=eq.${userId}`,
          },
          async (payload) => {
            console.log("Driver order update:", payload);

            // Refresh active order
            await this.fetchActiveOrder();

            // Show notification for new assignment
            if (
              payload.eventType === "UPDATE" &&
              (payload.new as any).status === "assigned"
            ) {
              const toast = useToast();
              const id = (payload?.new as any)?.id;
              const shortId =
                typeof id === "string" ? id.slice(-6).toUpperCase() : "";
              toast.add({
                title: "New Job",
                description: `Order #${shortId} is Ready for Dispatch.`,
                color: "info",
              } as any);
            }
          },
        )
        .subscribe();
    },

    // Setup offline/online detection
    setupOfflineDetection() {
      if (typeof window === "undefined") return;

      window.addEventListener("online", () => {
        this.isOnline = true;
        this.syncOfflineActions();

        const toast = useToast();
        toast.add({
          title: "🌐 Back Online",
          description: "Syncing your offline actions...",
          color: "green",
        } as any);
      });

      window.addEventListener("offline", () => {
        this.isOnline = false;

        const toast = useToast();
        toast.add({
          title: "📡 Offline Mode",
          description:
            "Your actions will be saved and synced when you are back online",
          color: "amber",
        } as any);
      });
    },

    // Queue offline action
    queueOfflineAction(
      type: OfflineAction["type"],
      orderId: string,
      data: any,
    ) {
      const action: OfflineAction = {
        id: `${Date.now()}-${Math.random()}`,
        type,
        orderId,
        data,
        timestamp: Date.now(),
      };

      this.offlineActions.push(action);

      // Persist to localStorage
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(
          "driver-offline-actions",
          JSON.stringify(this.offlineActions),
        );
      }
    },

    // Sync offline actions when back online
    async syncOfflineActions() {
      if (!this.isOnline || this.offlineActions.length === 0) return;

      const supabase = useSupabaseClient<Database>();
      const actionsToSync = [...this.offlineActions];

      for (const action of actionsToSync) {
        try {
          if (action.type === "status_update") {
            await (supabase.from("orders").update as any)({
              status: action.data.status,
            }).eq("id", action.orderId);
          } else if (action.type === "delivery_confirm") {
            await (supabase.rpc as any)("verify_delivery_pin", {
              p_order_id: action.orderId,
              p_pin: action.data.pin,
            });
          }

          // Remove synced action
          this.offlineActions = this.offlineActions.filter(
            (a) => a.id !== action.id,
          );
        } catch (err) {
          console.error("Failed to sync offline action:", err);
        }
      }

      // Update localStorage
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(
          "driver-offline-actions",
          JSON.stringify(this.offlineActions),
        );
      }

      // Refresh active orders after sync
      await this.fetchActiveOrders();
    },

    // Load offline actions from localStorage
    loadOfflineActions() {
      if (typeof localStorage === "undefined") return;

      const stored = localStorage.getItem("driver-offline-actions");
      if (stored) {
        try {
          this.offlineActions = JSON.parse(stored);
        } catch (err) {
          console.error("Failed to load offline actions:", err);
        }
      }
    },

    // Helper: Get status message
    getStatusMessage(status: OrderStatus): string {
      switch (status) {
        case "assigned":
          return "Order assigned to you";
        case "picked_up":
          return "Order picked up from store";
        case "arrived":
          return "You have arrived at customer location";
        case "delivered":
          return "Order delivered successfully";
        default:
          return "Status updated";
      }
    },

    // Cleanup
    cleanup() {
      const supabase = useSupabaseClient<Database>();

      if (this.realtimeChannel) {
        supabase.removeChannel(this.realtimeChannel as any);
        this.realtimeChannel = null;
      }
    },
  },
});
