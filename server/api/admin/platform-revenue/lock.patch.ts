import { defineEventHandler, readBody, createError } from "h3";
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

    return {
      success: true,
      data,
      message: `Revenue status updated to ${body.status}`,
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
