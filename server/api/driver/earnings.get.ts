import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import type { Database } from "~/types/database.types";

const MINIMUM_WITHDRAWAL_AMOUNT = 5000;

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

  if (profileRoleError) {
    console.log(
      "[earnings.get] Profile query error:",
      profileRoleError.message,
    );
  }

  const isDriver = String((profile as any)?.role) === "driver";
  console.log("[earnings.get] Profile check:", {
    driverId,
    role: (profile as any)?.role,
    isDriver,
  });

  if (!isDriver) {
    throw createError({
      statusCode: 403,
      statusMessage: "Only drivers can access earnings data",
    });
  }

  // Get query parameters for pagination
  const query = getQuery(event);
  const earningsLimit = parseInt(query.earningsLimit as string) || 50;
  const earningsOffset = parseInt(query.earningsOffset as string) || 0;
  const withdrawalsLimit = parseInt(query.withdrawalsLimit as string) || 20;
  const withdrawalsOffset = parseInt(query.withdrawalsOffset as string) || 0;

  // Fetch earnings (derived from delivered orders)
  const { data: orders, error: earningsError } = await supabase
    .from("orders")
    .select("id, delivery_fee, delivered_at, created_at")
    .eq("driver_id", driverId)
    .eq("status", "delivered")
    .order("delivered_at", { ascending: false })
    .limit(earningsLimit)
    .range(earningsOffset, earningsOffset + earningsLimit - 1);

  if (earningsError) {
    console.error("Error fetching earnings:", earningsError);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch earnings",
    });
  }

  const earnings = ((orders as any[] | null) || []).map((o) => {
    const fee = Number(o?.delivery_fee || 0);
    return {
      id: String(o?.id),
      order_id: String(o?.id),
      delivery_fee: fee,
      tip_amount: null,
      total_earned: fee,
      is_withdrawn: false,
      withdrawn_at: null,
      created_at: String(
        o?.delivered_at || o?.created_at || new Date().toISOString(),
      ),
    };
  });

  // Calculate totals (derived from all delivered orders)
  const { data: allOrders, error: totalError } = await supabase
    .from("orders")
    .select("delivery_fee")
    .eq("driver_id", driverId)
    .eq("status", "delivered");

  if (totalError) {
    console.error("Error calculating totals:", totalError);
  }

  const totalEarned =
    (allOrders as any[] | null)?.reduce(
      (sum, o) => sum + Number(o?.delivery_fee || 0),
      0,
    ) || 0;

  // Withdrawals are tracked separately; treat all delivered fees as earned.
  const totalWithdrawn = 0;

  // Calculate pending payouts (manual payout system)
  const { data: pendingPayouts, error: pendingError } = await supabase
    .from("payout_requests" as any)
    .select("amount")
    .eq("driver_id", driverId)
    .in("status", ["pending", "approved"]);

  if (pendingError) {
    console.error("Error fetching pending withdrawals:", pendingError);
  }

  const pendingAmount =
    (pendingPayouts as any[] | null)?.reduce(
      (sum, p) => sum + Number(p?.amount || 0),
      0,
    ) || 0;
  const availableBalance = totalEarned - totalWithdrawn - pendingAmount;

  const withdrawals: any[] = [];
  if (withdrawalsLimit > 0) {
    // Fetch payout history (manual payout system)
    const { data, error: withdrawalsError } = await supabase
      .from("payout_requests" as any)
      .select(
        "id, amount, status, bank_details, paid_at, created_at, updated_at",
      )
      .eq("driver_id", driverId)
      .order("created_at", { ascending: false })
      .limit(withdrawalsLimit)
      .range(withdrawalsOffset, withdrawalsOffset + withdrawalsLimit - 1);

    if (withdrawalsError) {
      console.error("Error fetching withdrawals:", withdrawalsError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch withdrawal history",
      });
    }

    const mapped = (((data as any[]) || []) as any[]).map((r) => {
      const bank = (r as any)?.bank_details || {};
      return {
        id: (r as any)?.id,
        amount: Number((r as any)?.amount || 0),
        status: (r as any)?.status,
        bank_name: bank?.bank_name || null,
        account_number: bank?.account_number || null,
        account_name: bank?.account_name || null,
        processed_at: (r as any)?.paid_at || null,
        rejection_reason: null,
        notes: null,
        created_at: (r as any)?.created_at,
        updated_at: (r as any)?.updated_at,
      };
    });

    withdrawals.push(...mapped);
  }

  // Check if has pending withdrawal
  const hasPendingWithdrawal =
    (withdrawals as any[] | null)?.some((w) => w.status === "pending") || false;

  // Mask account numbers for security
  const maskedWithdrawals = (withdrawals as any[] | null)?.map((w) => ({
    id: w.id,
    amount: w.amount,
    status: w.status,
    bank_name: w.bank_name,
    account_number: w.account_number
      ? `****${w.account_number.slice(-4)}`
      : null,
    account_name: w.account_name,
    processed_at: w.processed_at,
    rejection_reason: w.rejection_reason,
    notes: w.notes,
    created_at: w.created_at,
    updated_at: w.updated_at,
  }));

  return {
    balance: {
      totalEarned,
      totalWithdrawn,
      pendingAmount,
      availableBalance,
      canWithdraw: availableBalance >= MINIMUM_WITHDRAWAL_AMOUNT,
      minimumWithdrawal: MINIMUM_WITHDRAWAL_AMOUNT,
    },
    earnings: earnings || [],
    withdrawals: maskedWithdrawals || [],
    hasPendingWithdrawal,
    pagination: {
      earnings: {
        limit: earningsLimit,
        offset: earningsOffset,
        hasMore: (earnings?.length || 0) === earningsLimit,
      },
      withdrawals: {
        limit: withdrawalsLimit,
        offset: withdrawalsOffset,
        hasMore: (withdrawals?.length || 0) === withdrawalsLimit,
      },
    },
  };
});
