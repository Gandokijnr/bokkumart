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

  let driverId = (user as any)?.id as string | undefined;

  // In some requests the SSR session cookie may be missing, but a Bearer token is present.
  // Fall back to reading the user from the Authorization header.
  if (!driverId) {
    const authHeader = event.node.req.headers["authorization"];
    const bearer = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    const token =
      typeof bearer === "string" && bearer.startsWith("Bearer ")
        ? bearer.slice("Bearer ".length)
        : null;

    if (token) {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error) {
        driverId = (data as any)?.user?.id;
      }
    }
  }

  if (!driverId) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  // Check if user has driver role (profiles table only; user_roles is dormant)
  const { data: profile, error: profileRoleError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", driverId)
    .maybeSingle();

  const isDriver = String((profile as any)?.role) === "driver";

  if (profileRoleError || !isDriver) {
    throw createError({
      statusCode: 403,
      statusMessage: "Only drivers can access payout balance",
    });
  }

  const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
    "get_driver_withdrawable_balance",
    {
      p_driver_id: driverId,
      p_min_amount: MINIMUM_PAYOUT_AMOUNT,
    },
  );

  if (rpcError) {
    console.error("Error calculating withdrawable balance:", rpcError);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to calculate withdrawable balance",
    });
  }

  const row = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as any;

  const withdrawableBalance = Number(row?.withdrawable_balance || 0);
  const eligibleOrdersCount = Number(row?.eligible_orders_count || 0);

  const { data: pending, error: pendingError } = await supabase
    .from("payout_requests" as any)
    .select("id")
    .eq("driver_id", driverId)
    .in("status", ["pending", "approved"]);

  if (pendingError) {
    console.error("Error fetching pending payout requests:", pendingError);
  }

  const hasPendingRequest = ((pending as any[] | null) || []).length > 0;

  return {
    balance: {
      withdrawableBalance,
      eligibleOrdersCount,
      minimumPayout: MINIMUM_PAYOUT_AMOUNT,
      canRequest:
        withdrawableBalance >= MINIMUM_PAYOUT_AMOUNT && !hasPendingRequest,
      hasPendingRequest,
    },
  };
});
