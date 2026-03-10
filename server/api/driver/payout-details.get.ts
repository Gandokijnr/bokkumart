import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import type { Database } from "~/types/database.types";

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

  // Fetch payout details from rider onboarding application
  const { data, error }: { data: { payout: any } | null; error: any } =
    await supabase
      .from("rider_onboarding_applications")
      .select("payout")
      .eq("user_id", driverId)
      .single();

  if (error || !data) {
    return {
      bankDetails: null,
    };
  }

  const payout = data.payout as {
    bank_code?: string;
    account_number?: string;
    account_name?: string;
    resolved_account_name?: string | null;
  } | null;

  if (!payout) {
    return {
      bankDetails: null,
    };
  }

  return {
    bankDetails: {
      bank_code: payout.bank_code || "",
      account_number: payout.account_number || "",
      account_name: payout.resolved_account_name || payout.account_name || "",
    },
  };
});
