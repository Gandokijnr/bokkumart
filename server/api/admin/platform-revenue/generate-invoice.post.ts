import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";

interface GenerateInvoiceBody {
  id: string;
  dueDays?: number;
}

function generateInvoiceNumber(year: number, month: number): string {
  const prefix = "HAP";
  const yy = String(year).slice(-2);
  const mm = String(month).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${yy}${mm}-${random}`;
}

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const body = await readBody<GenerateInvoiceBody>(event);

    if (!body.id) {
      throw createError({
        statusCode: 400,
        statusMessage: "id is required",
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

    // Get the revenue record
    const { data: revenue, error: revenueError } = await (admin as any)
      .from("platform_revenue")
      .select("*, platform_revenue_breakdown(*, stores(name))")
      .eq("id", body.id)
      .single();

    if (revenueError || !revenue) {
      throw createError({
        statusCode: 404,
        statusMessage: revenueError?.message || "Revenue record not found",
      });
    }

    // Generate invoice number if not exists
    const invoiceNumber = revenue.invoice_number || generateInvoiceNumber(revenue.year, revenue.month);
    const dueDays = body.dueDays || 7;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueDays);

    // Update the revenue record with invoice info
    const { data: updated, error: updateError } = await (admin as any)
      .from("platform_revenue")
      .update({
        invoice_number: invoiceNumber,
        invoice_generated_at: new Date().toISOString(),
        status: revenue.status === "pending" ? "locked" : revenue.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.id)
      .select()
      .single();

    if (updateError) {
      throw createError({
        statusCode: 500,
        statusMessage: updateError.message,
      });
    }

    // Format invoice data
    const monthName = new Date(revenue.year, revenue.month - 1).toLocaleString("default", {
      month: "long",
    });

    const invoice = {
      invoice_number: invoiceNumber,
      invoice_date: updated.invoice_generated_at,
      due_date: dueDate.toISOString(),
      bill_to: {
        name: "Home Affairs Supermarket",
        address: "Home Affairs Headquarters",
        email: "finance@homeaffairs.ng",
      },
      from: {
        name: "Home Affairs Digital Platform",
        service_description: "Digital Platform Service Fee",
      },
      billing_period: `${monthName} ${revenue.year}`,
      month: revenue.month,
      year: revenue.year,
      summary: {
        total_orders: revenue.total_orders,
        gross_sales: revenue.gross_sales,
        platform_percentage: revenue.platform_percentage,
        platform_fee: revenue.platform_fee,
        delivery_fees_excluded: revenue.delivery_fees_excluded,
      },
      breakdown: (revenue.platform_revenue_breakdown || []).map((b: any) => ({
        store_name: b.store_name || b.stores?.name || "Unknown",
        order_count: b.order_count,
        gross_sales: b.gross_sales,
        platform_fee: b.platform_fee,
      })),
      subtotal: revenue.platform_fee,
      vat: 0,
      total: revenue.platform_fee,
      notes: `Platform service fee for ${monthName} ${revenue.year}. Payment due within ${dueDays} days.`,
      status: updated.status,
    };

    return {
      success: true,
      data: invoice,
    };
  } catch (error: any) {
    console.error("Generate invoice error:", error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || "Failed to generate invoice",
    });
  }
});
