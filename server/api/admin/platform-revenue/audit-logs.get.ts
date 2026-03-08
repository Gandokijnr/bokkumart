import { defineEventHandler, createError, getQuery } from "h3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const query = getQuery(event);

    const revenueId = query.revenueId ? String(query.revenueId) : null;
    const limit = query.limit ? parseInt(String(query.limit), 10) : 50;

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
      .from("revenue_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (revenueId) {
      dbQuery = dbQuery.eq("platform_revenue_id", revenueId);
    }

    const { data, error } = await dbQuery;

    if (error) {
      console.error("Error fetching revenue audit logs:", error);
      throw createError({
        statusCode: 500,
        statusMessage: error.message,
      });
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (error: any) {
    console.error("Get revenue audit logs error:", error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || "Failed to fetch revenue audit logs",
    });
  }
});
