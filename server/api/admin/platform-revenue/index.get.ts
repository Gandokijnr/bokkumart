import { defineEventHandler, createError, getQuery } from "h3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const query = getQuery(event);

    const month = query.month ? parseInt(String(query.month), 10) : null;
    const year = query.year ? parseInt(String(query.year), 10) : null;
    const status = query.status ? String(query.status) : null;
    const limit = query.limit ? parseInt(String(query.limit), 10) : 12;

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

    // Build query
    let dbQuery = (admin as any)
      .from("platform_revenue")
      .select("*, platform_revenue_breakdown(*, stores(name))")
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(limit);

    if (month && !isNaN(month)) {
      dbQuery = dbQuery.eq("month", month);
    }

    if (year && !isNaN(year)) {
      dbQuery = dbQuery.eq("year", year);
    }

    if (status) {
      dbQuery = dbQuery.eq("status", status);
    }

    const { data, error } = await dbQuery;

    if (error) {
      console.error("Error fetching platform revenue:", error);
      throw createError({
        statusCode: 500,
        statusMessage: error.message,
      });
    }

    // Format the response
    const formattedData = (data || []).map((revenue: any) => ({
      ...revenue,
      month_name: new Date(revenue.year, revenue.month - 1).toLocaleString(
        "default",
        { month: "long" }
      ),
      breakdown: (revenue.platform_revenue_breakdown || []).map((b: any) => ({
        ...b,
        store_name: b.store_name || b.stores?.name || "Unknown",
      })),
    }));

    return {
      success: true,
      data: formattedData,
    };
  } catch (error: any) {
    console.error("Get platform revenue error:", error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || "Failed to fetch platform revenue",
    });
  }
});
