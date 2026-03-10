import { defineEventHandler, readBody, createError, getHeader } from "h3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";

interface LockRevenueBody {
  id: string;
  status: "locked" | "pending" | "paid" | "disputed";
  notes?: string;
}

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const body = await readBody<LockRevenueBody>(event);

    if (!body.id || !body.status) {
      throw createError({
        statusCode: 400,
        statusMessage: "id and status are required",
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

    // Get current revenue record before update (for audit trail)
    const { data: currentRevenue, error: fetchError } = await (admin as any)
      .from("platform_revenue")
      .select("id, status, subtotal, platform_fee, month, year")
      .eq("id", body.id)
      .single();

    if (fetchError) {
      throw createError({
        statusCode: 500,
        statusMessage: fetchError.message,
      });
    }

    if (!currentRevenue) {
      throw createError({
        statusCode: 404,
        statusMessage: "Revenue record not found",
      });
    }

    const updateData: any = {
      status: body.status,
      updated_at: new Date().toISOString(),
    };

    if (body.notes) {
      updateData.notes = body.notes;
    }

    const { data, error } = await (admin as any)
      .from("platform_revenue")
      .update(updateData)
      .eq("id", body.id)
      .select()
      .single();

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: error.message,
      });
    }

    // Create audit log entry for the status change
    if (adminUserId) {
      const actionMap: Record<string, string> = {
        locked: "locked",
        pending: "unlocked",
        paid: "paid",
        disputed: "disputed",
      };

      const auditData = {
        platform_revenue_id: body.id,
        admin_id: adminUserId,
        admin_email: adminEmail,
        action: actionMap[body.status] || body.status,
        previous_status: currentRevenue.status,
        new_status: body.status,
        previous_total: currentRevenue.subtotal,
        new_total: currentRevenue.subtotal, // Total doesn't change on lock
        previous_platform_fee: currentRevenue.platform_fee,
        new_platform_fee: currentRevenue.platform_fee, // Fee doesn't change on lock
        notes: body.notes || null,
        metadata: {
          month: currentRevenue.month,
          year: currentRevenue.year,
          changed_via: "admin_api",
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
      data,
      message: `Revenue status updated to ${body.status}`,
      audited: !!adminUserId,
    };
  } catch (error: any) {
    console.error("Lock platform revenue error:", error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || "Failed to update revenue status",
    });
  }
});
