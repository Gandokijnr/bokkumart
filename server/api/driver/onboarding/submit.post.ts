import { defineEventHandler, readBody, createError } from "h3";
import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import type { Database } from "~/types/database.types";

type SubmitBody = {
  personal: {
    full_name: string;
    phone_number: string;
  };
  branches: {
    selected_branches: string[];
  };
  vehicle: {
    vehicle_type: string;
    plate_number: string;
    id_card_path: string | null;
    vehicle_registration_path: string | null;
  };
  payout: {
    bank_code: string;
    account_number: string;
    account_name: string;
    resolved_account_name?: string | null;
  };
  phone_verification: {
    status: "skipped" | "verified" | "pending";
  };
};

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient<Database>(event);
  const user = await serverSupabaseUser(event);

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = await readBody<SubmitBody>(event);

  const fullName = String(body?.personal?.full_name || "").trim();
  const phone = String(body?.personal?.phone_number || "").trim();

  if (fullName.length < 3 || phone.length < 8) {
    throw createError({
      statusCode: 400,
      statusMessage: "Personal info is incomplete",
    });
  }

  const vehicleType = String(body?.vehicle?.vehicle_type || "").trim();
  const plateNumber = String(body?.vehicle?.plate_number || "").trim();
  const idCardPath = body?.vehicle?.id_card_path || null;
  const vehicleRegPath = body?.vehicle?.vehicle_registration_path || null;

  if (
    !vehicleType ||
    plateNumber.length < 3 ||
    !idCardPath ||
    !vehicleRegPath
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "Vehicle details/documents are incomplete",
    });
  }

  const bankCode = String(body?.payout?.bank_code || "").trim();
  const accountNumber = String(body?.payout?.account_number || "").trim();
  const accountName = String(body?.payout?.account_name || "").trim();

  if (!bankCode || accountNumber.length !== 10 || accountName.length < 3) {
    throw createError({
      statusCode: 400,
      statusMessage: "Payout details are incomplete",
    });
  }

  const selectedBranches = body?.branches?.selected_branches || [];
  if (!Array.isArray(selectedBranches) || selectedBranches.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Please select at least one branch to operate with",
    });
  }

  const profileUpdate: Database["public"]["Tables"]["profiles"]["Update"] = {
    full_name: fullName,
    phone_number: phone,
    updated_at: new Date().toISOString(),
  };

  const { error: profileErr } = await (supabase.from("profiles").update as any)(
    profileUpdate,
  ).eq("id", user.id);

  if (profileErr) {
    throw createError({ statusCode: 400, statusMessage: profileErr.message });
  }

  const payload = {
    user_id: user.id,
    status: "pending",
    personal: body.personal,
    branches: { selected_branches: selectedBranches },
    vehicle: body.vehicle,
    payout: body.payout,
    phone_verification: body.phone_verification,
    updated_at: new Date().toISOString(),
  };

  const { error: upsertErr } = await (
    supabase.from("rider_onboarding_applications").upsert as any
  )(payload, { onConflict: "user_id" });

  if (upsertErr) {
    throw createError({
      statusCode: 400,
      statusMessage: upsertErr.message || "Failed to submit application",
    });
  }

  return { success: true };
});
