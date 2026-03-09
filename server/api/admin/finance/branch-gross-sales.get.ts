import { defineEventHandler, createError, getQuery } from "h3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";

const ALLOWED_ROLES = ["super_admin", "finance"] as const;

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

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

  const authHeader = event.node.req.headers["authorization"];
  const bearer = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const token =
    typeof bearer === "string" && bearer.startsWith("Bearer ")
      ? bearer.slice("Bearer ".length)
      : null;

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: "Missing Authorization Bearer token",
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as ReturnType<typeof createClient<Database>>;

  const { data: callerData, error: callerErr } =
    await admin.auth.getUser(token);
  if (callerErr || !callerData?.user) {
    throw createError({ statusCode: 401, statusMessage: "Invalid session" });
  }

  const callerId = callerData.user.id;
  const { data: callerProfile, error: profileErr } = await (admin as any)
    .from("profiles")
    .select("role")
    .eq("id", callerId)
    .single();

  if (profileErr) {
    throw createError({ statusCode: 500, statusMessage: profileErr.message });
  }

  const callerRole = String((callerProfile as any)?.role || "").trim();
  if (!ALLOWED_ROLES.includes(callerRole as any)) {
    throw createError({ statusCode: 403, statusMessage: "Not authorized" });
  }

  const query = getQuery(event);
  const storeId = query.store_id ? String(query.store_id) : "";

  const { data: stores, error: storesError } = await (admin as any)
    .from("stores")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  if (storesError) {
    throw createError({ statusCode: 500, statusMessage: storesError.message });
  }

  const allowedStatuses = [
    "paid",
    "confirmed",
    "ready_for_pos",
    "completed_in_pos",
    "assigned",
    "picked_up",
    "arrived",
    "delivered",
  ];

  // NOTE: PostgREST does not allow aggregate functions in select in our setup.
  // Use a Postgres RPC function for aggregation instead.
  const { data: rows, error: rowsError } = await (admin.rpc as any)(
    "get_all_time_branch_total_sales",
    {
      p_store_id: storeId || null,
      p_statuses: allowedStatuses,
    },
  );

  if (rowsError) {
    throw createError({ statusCode: 500, statusMessage: rowsError.message });
  }

  const storeMap = new Map<string, string>();
  for (const s of (stores || []) as any[]) {
    storeMap.set(String(s.id), String(s.name || ""));
  }

  const formattedRows = ((rows as any[]) || []).map((r) => {
    const id = String(r.store_id || "");
    const salesValue =
      r.total_sales !== undefined && r.total_sales !== null
        ? r.total_sales
        : r.gross_sales;
    return {
      store_id: id,
      store_name: storeMap.get(id) || String(r.store_name || "Unknown"),
      order_count: Number(r.order_count || 0),
      total_sales: Number(salesValue || 0),
    };
  });

  const totalSales = formattedRows.reduce(
    (sum, r) => sum + (Number((r as any).total_sales) || 0),
    0,
  );
  const totalOrders = formattedRows.reduce(
    (sum, r) => sum + (Number(r.order_count) || 0),
    0,
  );

  return {
    stores: stores || [],
    rows: formattedRows,
    totals: {
      total_orders: totalOrders,
      total_sales: totalSales,
    },
  };
});
