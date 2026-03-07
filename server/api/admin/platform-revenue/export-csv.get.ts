import { defineEventHandler, getQuery, createError } from "h3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const query = getQuery(event);

    const month = query.month ? parseInt(String(query.month), 10) : null;
    const year = query.year ? parseInt(String(query.year), 10) : null;

    if (!month || !year) {
      throw createError({
        statusCode: 400,
        statusMessage: "month and year are required",
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

    // Calculate date range
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

    // Get all stores for name mapping
    const { data: storesData } = await (admin as any)
      .from("stores")
      .select("id, name");
    const storeMap = new Map(
      (storesData || []).map((s: any) => [s.id, s.name]),
    );

    // Get all orders for this period
    const { data: orders, error } = await (admin as any)
      .from("orders")
      .select(
        "id, created_at, paid_at, user_id, store_id, total_amount, delivery_fee, subtotal, payment_method, status, payment_status, paystack_reference, paystack_transaction_id",
      )
      .eq("channel", "platform")
      .eq("payment_status", "paid")
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("created_at", { ascending: true });

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: error.message,
      });
    }

    // Generate CSV
    const headers = [
      "Order ID",
      "Date",
      "Paid At",
      "Customer ID",
      "Store ID",
      "Store Name",
      "Subtotal",
      "Delivery Fee",
      "Total Amount",
      "Payment Method",
      "Status",
      "Payment Status",
      "Paystack Reference",
      "Transaction ID",
    ];

    const rows = (orders || []).map((o: any) => [
      o.id,
      o.created_at,
      o.paid_at || "",
      o.user_id,
      o.store_id,
      storeMap.get(o.store_id) || "Unknown",
      o.subtotal || 0,
      o.delivery_fee || 0,
      o.total_amount || 0,
      o.payment_method,
      o.status,
      o.payment_status,
      o.paystack_reference || "",
      o.paystack_transaction_id || "",
    ]);

    // Escape and format CSV
    const escapeCsv = (value: any) => {
      const str = String(value ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csv = [
      headers.map(escapeCsv).join(","),
      ...rows.map((r: any[]) => r.map(escapeCsv).join(",")),
    ].join("\n");

    // Set headers for file download
    event.node.res.setHeader("Content-Type", "text/csv");
    event.node.res.setHeader(
      "Content-Disposition",
      `attachment; filename="home-affairs-revenue-${year}-${String(month).padStart(2, "0")}.csv"`,
    );

    return csv;
  } catch (error: any) {
    console.error("Export CSV error:", error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || "Failed to export CSV",
    });
  }
});
