import { defineEventHandler, getQuery, createError } from "h3";
import { createClient } from "@supabase/supabase-js";
import { serverSupabaseUser } from "#supabase/server";
import type { Database } from "~/types/database.types";

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const query = getQuery(event);

    // Get authenticated user
    const user = await serverSupabaseUser(event);

    const days = query.days ? parseInt(String(query.days), 10) : 30;
    const storeId = query.store_id as string | undefined;
    const storeIdsParam = query.store_ids as string | undefined;

    const supabaseUrl =
      ((config.public as any)?.supabase?.url as string | undefined) ||
      (process.env.SUPABASE_URL as string | undefined);

    const serviceRoleKey =
      (config.supabaseServiceRoleKey as string | undefined) ||
      (process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined);

    if (!supabaseUrl || !serviceRoleKey) {
      throw createError({
        statusCode: 500,
        statusMessage: "Server not configured",
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }) as unknown as ReturnType<typeof createClient<Database>>;

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);

    // Get user's profile to check role and managed stores
    let allowedStoreIds: string[] = [];
    let isBranchManager = false;

    if (user) {
      const { data: profile } = await (admin as any)
        .from("profiles")
        .select("role, managed_store_ids")
        .eq("id", user.id)
        .single();

      if (profile) {
        isBranchManager = profile.role === "branch_manager";
        if (isBranchManager && profile.managed_store_ids) {
          allowedStoreIds = profile.managed_store_ids;
        }
      }
    }

    // Build base query filters
    let orderQuery = (admin as any)
      .from("orders")
      .select("*", { count: "exact" });

    // Apply store filtering
    if (storeId) {
      // If specific store requested, check if branch manager has access
      if (isBranchManager && !allowedStoreIds.includes(storeId)) {
        throw createError({
          statusCode: 403,
          statusMessage: "You don't have access to this store's analytics",
        });
      }
      orderQuery = orderQuery.eq("store_id", storeId);
    } else if (storeIdsParam) {
      // Frontend passed specific store IDs (comma-separated) - validate and use them
      const requestedStoreIds = storeIdsParam
        .split(",")
        .filter((id) => id.trim());

      // Validate all requested stores are allowed for branch managers
      if (isBranchManager) {
        const hasUnauthorizedStore = requestedStoreIds.some(
          (id) => !allowedStoreIds.includes(id),
        );
        if (hasUnauthorizedStore) {
          throw createError({
            statusCode: 403,
            statusMessage:
              "You don't have access to one or more requested stores",
          });
        }
      }

      if (requestedStoreIds.length > 0) {
        orderQuery = orderQuery.in("store_id", requestedStoreIds);
        // Update allowedStoreIds for downstream filtering
        allowedStoreIds = requestedStoreIds;
      }
    } else if (isBranchManager && allowedStoreIds.length > 0) {
      // Branch managers only see their assigned stores
      orderQuery = orderQuery.in("store_id", allowedStoreIds);
    }

    // Get order statistics
    const {
      data: orders,
      count: totalOrders,
      error: ordersError,
    } = await orderQuery.gte("created_at", startDate.toISOString());

    if (ordersError) {
      throw createError({
        statusCode: 500,
        statusMessage: ordersError.message,
      });
    }

    // Calculate revenue metrics
    const paidOrders = (orders || []).filter(
      (o: any) => o.payment_status === "paid",
    );

    const getNetSalesExcludingDelivery = (o: any) => {
      const subtotal = Number(o?.subtotal);
      if (Number.isFinite(subtotal)) return subtotal;

      const totalAmount = Number(o?.total_amount) || 0;
      const deliveryFee = Number(o?.delivery_fee) || 0;
      return totalAmount - deliveryFee;
    };

    const totalRevenue = paidOrders.reduce(
      (sum: number, o: any) => sum + getNetSalesExcludingDelivery(o),
      0,
    );
    const platformRevenue = paidOrders
      .filter((o: any) => o.channel === "platform")
      .reduce(
        (sum: number, o: any) => sum + getNetSalesExcludingDelivery(o),
        0,
      );

    // Status breakdown
    const statusCounts: Record<string, number> = {};
    (orders || []).forEach((o: any) => {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    });

    // Payment method breakdown
    const paymentMethodCounts: Record<string, number> = {};
    (orders || []).forEach((o: any) => {
      paymentMethodCounts[o.payment_method] =
        (paymentMethodCounts[o.payment_method] || 0) + 1;
    });

    // Channel breakdown
    const channelCounts: Record<string, number> = {};
    (orders || []).forEach((o: any) => {
      channelCounts[o.channel || "unknown"] =
        (channelCounts[o.channel || "unknown"] || 0) + 1;
    });

    // Daily revenue trend
    const dailyRevenue: Record<
      string,
      { date: string; revenue: number; orders: number }
    > = {};
    paidOrders.forEach((o: any) => {
      const date = o.created_at.split("T")[0];
      if (!dailyRevenue[date]) {
        dailyRevenue[date] = { date, revenue: 0, orders: 0 };
      }
      dailyRevenue[date].revenue += getNetSalesExcludingDelivery(o);
      dailyRevenue[date].orders += 1;
    });

    // Store breakdown - only include stores the user has access to
    const storeBreakdown: Record<
      string,
      { store_id: string; store_name: string; orders: number; revenue: number }
    > = {};

    // Get stores for names - filter by allowed stores for branch managers
    let storesQuery = (admin as any).from("stores").select("id, name");
    if (isBranchManager && allowedStoreIds.length > 0) {
      storesQuery = storesQuery.in("id", allowedStoreIds);
    }
    const { data: stores } = await storesQuery;
    const storeMap = new Map<string, string>(
      (stores || []).map((s: any) => [s.id, s.name]),
    );

    paidOrders.forEach((o: any) => {
      // Only include stores the user has access to
      if (isBranchManager && !allowedStoreIds.includes(o.store_id)) {
        return;
      }

      if (!storeBreakdown[o.store_id]) {
        storeBreakdown[o.store_id] = {
          store_id: o.store_id,
          store_name: storeMap.get(o.store_id) || "Unknown",
          orders: 0,
          revenue: 0,
        };
      }
      const store = storeBreakdown[o.store_id]!;
      store.orders += 1;
      store.revenue += getNetSalesExcludingDelivery(o);
    });

    // Monthly revenue (for platform_revenue) - filter by allowed stores
    let monthlyRevenueQuery = (admin as any)
      .from("platform_revenue")
      .select("*")
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(12);

    if (isBranchManager && allowedStoreIds.length > 0) {
      monthlyRevenueQuery = monthlyRevenueQuery.in(
        "store_id",
        allowedStoreIds as string[],
      );
    }

    const { data: monthlyRevenue } = await monthlyRevenueQuery;

    return {
      summary: {
        totalOrders: totalOrders || 0,
        totalRevenue,
        platformRevenue,
        inStoreRevenue: totalRevenue - platformRevenue,
        averageOrderValue: totalOrders ? totalRevenue / totalOrders : 0,
        paidOrdersCount: paidOrders.length,
        conversionRate: totalOrders
          ? (paidOrders.length / totalOrders) * 100
          : 0,
      },
      breakdowns: {
        byStatus: statusCounts,
        byPaymentMethod: paymentMethodCounts,
        byChannel: channelCounts,
        byStore: Object.values(storeBreakdown),
      },
      trends: {
        daily: Object.values(dailyRevenue).sort((a: any, b: any) =>
          a.date.localeCompare(b.date),
        ),
        monthly: monthlyRevenue || [],
      },
      meta: {
        isBranchManager,
        allowedStoreIds: isBranchManager ? allowedStoreIds : null,
      },
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
      },
    };
  } catch (error: any) {
    console.error("Analytics error:", error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || "Failed to fetch analytics",
    });
  }
});
