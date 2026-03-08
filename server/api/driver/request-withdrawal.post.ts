import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import type { Database } from "~/types/database.types";

const MINIMUM_WITHDRAWAL_AMOUNT = 5000;

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { amount, bankName, accountNumber, accountName } = body;

  // Validate required fields
  if (!amount || typeof amount !== "number" || amount <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid withdrawal amount",
    });
  }

  if (!bankName || !accountNumber || !accountName) {
    throw createError({
      statusCode: 400,
      statusMessage:
        "Bank details are required (bank name, account number, account name)",
    });
  }

  // Check minimum withdrawal amount
  if (amount < MINIMUM_WITHDRAWAL_AMOUNT) {
    throw createError({
      statusCode: 400,
      statusMessage: `Minimum withdrawal amount is ₦${MINIMUM_WITHDRAWAL_AMOUNT.toLocaleString()}`,
    });
  }

  const supabase = await serverSupabaseClient<Database>(event);
  const user = await serverSupabaseUser(event);

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const driverId = user.id;

  // Check if user has driver role
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
      statusMessage: "Only drivers can request withdrawals",
    });
  }

  // Calculate available balance (earnings not yet withdrawn)
  const { data: earnings, error: earningsError } = await supabase
    .from("driver_earnings")
    .select("total_earned, is_withdrawn")
    .eq("driver_id", driverId);

  if (earningsError) {
    console.error("Error fetching earnings:", earningsError);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to calculate balance",
    });
  }

  const totalEarned =
    (earnings as any[] | null)?.reduce(
      (sum, e) => sum + (e.total_earned || 0),
      0,
    ) || 0;
  const totalWithdrawn =
    (earnings as any[] | null)
      ?.filter((e) => e.is_withdrawn)
      .reduce((sum, e) => sum + (e.total_earned || 0), 0) || 0;

  // Calculate pending withdrawals
  const { data: pendingWithdrawals, error: pendingError } = await supabase
    .from("driver_withdrawals")
    .select("amount")
    .eq("driver_id", driverId)
    .in("status", ["pending", "approved"]);

  if (pendingError) {
    console.error("Error fetching pending withdrawals:", pendingError);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to calculate pending withdrawals",
    });
  }

  const pendingAmount =
    (pendingWithdrawals as any[] | null)?.reduce(
      (sum, w) => sum + (w.amount || 0),
      0,
    ) || 0;
  const availableBalance = totalEarned - totalWithdrawn - pendingAmount;

  // Check if sufficient balance
  if (amount > availableBalance) {
    throw createError({
      statusCode: 400,
      statusMessage: `Insufficient balance. Available: ₦${availableBalance.toLocaleString()}`,
    });
  }

  // Check for existing pending withdrawal (prevent duplicates)
  const { data: existingPending, error: existingError } = await supabase
    .from("driver_withdrawals")
    .select("id")
    .eq("driver_id", driverId)
    .eq("status", "pending")
    .limit(1);

  if (existingError) {
    console.error("Error checking existing withdrawals:", existingError);
  }

  const existingCount =
    (existingPending as any[] | null | undefined)?.length ?? 0;
  if (existingCount > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "You already have a pending withdrawal request",
    });
  }

  // Create withdrawal request
  type DriverWithdrawalRow =
    Database["public"]["Tables"]["driver_withdrawals"]["Row"];

  const withdrawalPayload: Database["public"]["Tables"]["driver_withdrawals"]["Insert"] =
    {
      driver_id: driverId,
      amount,
      status: "pending",
      bank_name: bankName,
      account_number: accountNumber,
      account_name: accountName,
    };

  const { data: withdrawal, error: withdrawalError } = await supabase
    .from("driver_withdrawals")
    .insert(withdrawalPayload as any)
    .select("id, amount, status, created_at")
    .single();

  if (withdrawalError) {
    console.error("Error creating withdrawal:", withdrawalError);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create withdrawal request",
    });
  }

  if (!withdrawal) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create withdrawal request",
    });
  }

  const withdrawalRow = withdrawal as DriverWithdrawalRow;

  return {
    success: true,
    message: "Withdrawal request submitted successfully",
    withdrawal: {
      id: withdrawalRow.id,
      amount: withdrawalRow.amount,
      status: withdrawalRow.status,
      created_at: withdrawalRow.created_at,
    },
  };
});
