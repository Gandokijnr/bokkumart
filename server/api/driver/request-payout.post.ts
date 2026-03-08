import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import type { Database } from "~/types/database.types";

const MINIMUM_PAYOUT_AMOUNT = 2000;

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient<Database>(event);
  const user = await serverSupabaseUser(event);

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const driverId = user.id;

  const { data: userRole, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", driverId)
    .eq("role", "driver")
    .eq("is_active", true)
    .single();

  if (roleError || !userRole) {
    throw createError({
      statusCode: 403,
      statusMessage: "Only drivers can request payouts",
    });
  }

  const body = await readBody(event);
  const bankDetails = (body as any)?.bank_details;

  if (!bankDetails || typeof bankDetails !== "object") {
    throw createError({
      statusCode: 400,
      statusMessage: "bank_details is required",
    });
  }

  const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
    "create_driver_payout_request",
    {
      p_driver_id: driverId,
      p_bank_details: bankDetails,
      p_min_amount: MINIMUM_PAYOUT_AMOUNT,
    },
  );

  if (rpcError) {
    const message = rpcError?.message || "Failed to create payout request";
    const statusCode =
      message.toLowerCase().includes("minimum") ||
      message.toLowerCase().includes("insufficient")
        ? 400
        : message.toLowerCase().includes("pending")
          ? 400
          : 500;

    throw createError({
      statusCode,
      statusMessage: message,
    });
  }

  const row = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as any;

  return {
    success: true,
    payout_request: {
      id: row?.id,
      amount: Number(row?.amount || 0),
      status: row?.status,
      created_at: row?.created_at,
    },
  };
});
