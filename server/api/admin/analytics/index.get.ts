import { defineEventHandler, getQuery, createError } from "h3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const query = getQuery(event);

    const days = query.days ? parseInt(String(query.days), 10) : 30;
    const storeId = query.store_id as string | undefined;

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

    // Build base query filters
    let orderQuery = (admin as any)
      .from("orders")
      .select("*", { count: "exact" });

    if (storeId) {
      orderQuery = orderQuery.eq("store_id", storeId);
    }

    // Get order statistics
    const { data: orders, count: totalOrders, error: ordersError } = await orderQuery
      .gte("created_at", startDate.toISOString());

    if (ordersError) {
      throw createError({
        statusCode: 500,
        statusMessage: ordersError.message,
      });
    }

    // Calculate revenue metrics
    const paidOrders = (orders || []).filter((o: any) => o.payment_status === "paid");
    const totalRevenue = paidOrders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);
    const platformRevenue = paidOrders
      .filter((o: any) => o.channel === "platform")
      .reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);

    // Status breakdown
    const statusCounts: Record<string, number> = {};
    (orders || []).forEach((o: any) => {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    });

    // Payment method breakdown
    const paymentMethodCounts: Record<string, number> = {};
    (orders || []).forEach((o: any) => {
      paymentMethodCounts[o.payment_method] = (paymentMethodCounts[o.payment_method] || 0) + 1;
    });

    // Channel breakdown
    const channelCounts: Record<string, number> = {};
    (orders || []).forEach((o: any) => {
      channelCounts[o.channel || "unknown"] = (channelCounts[o.channel || "unknown"] || 0) + 1;
    });

    // Daily revenue trend
    const dailyRevenue: Record<string, { date: string; revenue: number; orders: number }> = {};
    paidOrders.forEach((o: any) => {
      const date = o.created_at.split("T")[0];
      if (!dailyRevenue[date]) {
        dailyRevenue[date] = { date, revenue: 0, orders: 0 };
      }
      dailyRevenue[date].revenue += o.total_amount || 0;
      dailyRevenue[date].orders += 1;
    });

    // Store breakdown
    const storeBreakdown: Record<string, { store_id: string; store_name: string; orders: number; revenue: number }> = {};
    
    // Get stores for names
    const { data: stores } = await (admin as any).from("stores").select("id, name");
    const storeMap = new Map((stores || []).map((s: any) => [s.id, s.name]));

    paidOrders.forEach((o: any) => {
      if (!storeBreakdown[o.store_id]) {
        storeBreakdown[o.store_id] = {
          store_id: o.store_id,
          store_name: storeMap.get(o.store_id) || "Unknown",
          orders: 0,
          revenue: 0,
        };
      }
      storeBreakdown[o.store_id].orders += 1;
      storeBreakdown[o.store_id].revenue += o.total_amount || 0;
    });

    // Monthly revenue (for platform_revenue)
    const { data: monthlyRevenue } = await (admin as any)
      .from("platform_revenue")
      .select("*")
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(12);

    return {
      summary: {
        totalOrders: totalOrders || 0,
        totalRevenue,
        platformRevenue,
        inStoreRevenue: totalRevenue - platformRevenue,
        averageOrderValue: totalOrders ? totalRevenue / totalOrders : 0,
        paidOrdersCount: paidOrders.length,
        conversionRate: totalOrders ? (paidOrders.length / totalOrders) * 100 : 0,
      },
      breakdowns: {
        byStatus: statusCounts,
        byPaymentMethod: paymentMethodCounts,
        byChannel: channelCounts,
        byStore: Object.values(storeBreakdown),
      },
      trends: {
        daily: Object.values(dailyRevenue).sort((a: any, b: any) => a.date.localeCompare(b.date)),
        monthly: monthlyRevenue || [],
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
