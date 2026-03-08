import { defineEventHandler, readBody, createError, getHeader } from "h3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";

interface CalculateRevenueBody {
  month: number;
  year: number;
  excludeDeliveryFees?: boolean;
  forceRecalculate?: boolean;
}

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const body = await readBody<CalculateRevenueBody>(event);

    if (!body.month || !body.year) {
      throw createError({
        statusCode: 400,
        statusMessage: "month and year are required",
      });
    }

    if (body.month < 1 || body.month > 12) {
      throw createError({
        statusCode: 400,
        statusMessage: "month must be between 1 and 12",
      });
    }

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

    // Get current user from authorization header
    const authHeader = getHeader(event, "authorization");
    let adminUserId: string | null = null;
    let adminEmail: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
        error: userError,
      } = await (admin as any).auth.getUser(token);
      if (!userError && user) {
        adminUserId = user.id;
        adminEmail = user.email || null;
      }
    }

    // Check if revenue already exists for this month/year
    const { data: existingRevenue, error: checkError } = await (admin as any)
      .from("platform_revenue")
      .select("id, status, platform_fee, gross_sales")
      .eq("month", body.month)
      .eq("year", body.year)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      throw createError({
        statusCode: 500,
        statusMessage: checkError.message,
      });
    }

    // If locked and not force recalculate, return error
    if (
      existingRevenue &&
      existingRevenue.status === "locked" &&
      !body.forceRecalculate
    ) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "Revenue for this month is locked. Use forceRecalculate to override.",
      });
    }

    // Calculate date range
    const startDate = new Date(body.year, body.month - 1, 1).toISOString();
    const endDate = new Date(
      body.year,
      body.month,
      0,
      23,
      59,
      59,
    ).toISOString();

    // Get overall statistics with safety check for null delivery_fee
    const { data: stats, error: statsError } = await (admin as any)
      .from("orders")
      .select("total_amount, delivery_fee", { count: "exact" })
      .eq("channel", "platform")
      .eq("payment_status", "paid")
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    if (statsError) {
      throw createError({
        statusCode: 500,
        statusMessage: statsError.message,
      });
    }

    const totalOrders = stats?.length || 0;
    // Ensure delivery_fee defaults to 0 if null (safety trigger)
    const grossSales = (stats || []).reduce(
      (sum: number, o: any) => sum + (o.total_amount || 0),
      0,
    );
    const deliveryFees = (stats || []).reduce(
      (sum: number, o: any) => sum + (o.delivery_fee ?? 0),
      0,
    );

    // Calculate platform fee with proper rounding to 2 decimal places
    const platformPercentage = 8.0;
    const platformBase = body.excludeDeliveryFees
      ? grossSales - deliveryFees
      : grossSales;
    // Round to 2 decimal places to prevent floating-point errors in bank transfers
    const platformFee =
      Math.round(platformBase * (platformPercentage / 100) * 100) / 100;

    // Get store breakdown
    const { data: storeStats, error: storeError } = await (admin as any).rpc(
      "get_store_revenue_breakdown",
      {
        p_month: body.month,
        p_year: body.year,
        p_exclude_delivery: body.excludeDeliveryFees || false,
      },
    );

    if (storeError) {
      console.error("Store breakdown error (non-critical):", storeError);
    }

    // Upsert revenue record
    const revenueData = {
      month: body.month,
      year: body.year,
      total_orders: totalOrders,
      gross_sales: grossSales,
      platform_percentage: platformPercentage,
      platform_fee: platformFee,
      delivery_fees_excluded: body.excludeDeliveryFees ? deliveryFees : 0,
      generated_at: new Date().toISOString(),
      status: existingRevenue?.status || "pending",
    };

    let revenueId: string;
    const isRecalculation = !!existingRevenue;

    if (existingRevenue) {
      const { error: updateError } = await (admin as any)
        .from("platform_revenue")
        .update(revenueData)
        .eq("id", existingRevenue.id);

      if (updateError) {
        throw createError({
          statusCode: 500,
          statusMessage: updateError.message,
        });
      }
      revenueId = existingRevenue.id;
    } else {
      const { data: newRevenue, error: insertError } = await (admin as any)
        .from("platform_revenue")
        .insert(revenueData)
        .select("id")
        .single();

      if (insertError) {
        throw createError({
          statusCode: 500,
          statusMessage: insertError.message,
        });
      }
      revenueId = newRevenue.id;
    }

    // Insert or update store breakdown
    if (storeStats && storeStats.length > 0) {
      // Delete existing breakdown
      await (admin as any)
        .from("platform_revenue_breakdown")
        .delete()
        .eq("platform_revenue_id", revenueId);

      // Insert new breakdown
      const breakdownData = storeStats.map((s: any) => ({
        platform_revenue_id: revenueId,
        store_id: s.store_id,
        store_name: s.store_name,
        order_count: s.order_count,
        gross_sales: s.gross_sales,
        platform_fee: s.platform_fee,
        delivery_fees: s.delivery_fees,
      }));

      const { error: breakdownError } = await (admin as any)
        .from("platform_revenue_breakdown")
        .insert(breakdownData);

      if (breakdownError) {
        console.error("Breakdown insert error (non-critical):", breakdownError);
      }
    }

    // Create audit log entry for the calculation
    if (adminUserId) {
      const auditData = {
        platform_revenue_id: revenueId,
        admin_id: adminUserId,
        admin_email: adminEmail,
        action: body.forceRecalculate
          ? "force_recalculate"
          : isRecalculation
            ? "recalculated"
            : "calculated",
        previous_status: existingRevenue?.status || null,
        new_status: existingRevenue?.status || "pending",
        previous_total: existingRevenue?.gross_sales || null,
        new_total: grossSales,
        previous_platform_fee: existingRevenue?.platform_fee || null,
        new_platform_fee: platformFee,
        notes: body.forceRecalculate
          ? "Force recalculation of locked month"
          : null,
        metadata: {
          exclude_delivery_fees: body.excludeDeliveryFees || false,
          force_recalculate: body.forceRecalculate || false,
          delivery_fees_excluded: body.excludeDeliveryFees ? deliveryFees : 0,
          total_orders: totalOrders,
          store_count: storeStats?.length || 0,
        },
        ip_address:
          getHeader(event, "x-forwarded-for") ||
          getHeader(event, "x-real-ip") ||
          null,
        user_agent: getHeader(event, "user-agent") || null,
      };

      const { error: auditError } = await (admin as any)
        .from("revenue_audit_logs")
        .insert(auditData);

      if (auditError) {
        console.error("Audit log error (non-critical):", auditError);
      }
    }

    return {
      success: true,
      data: {
        id: revenueId,
        month: body.month,
        year: body.year,
        month_name: new Date(body.year, body.month - 1).toLocaleString(
          "default",
          {
            month: "long",
          },
        ),
        total_orders: totalOrders,
        gross_sales: grossSales,
        platform_percentage: platformPercentage,
        platform_fee: platformFee,
        delivery_fees_excluded: body.excludeDeliveryFees ? deliveryFees : 0,
        status: existingRevenue?.status || "pending",
        store_count: storeStats?.length || 0,
        audited: !!adminUserId,
      },
    };
  } catch (error: any) {
    console.error("Calculate platform revenue error:", error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || "Failed to calculate platform revenue",
    });
  }
});
