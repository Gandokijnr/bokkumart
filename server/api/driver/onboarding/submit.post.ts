import { defineEventHandler, readBody, createError, getHeader } from "h3";
import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import type { Database } from "~/types/database.types";

type SubmitBody = {
  account?: {
    email: string;
    password: string;
  };
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
  let existingUser = await serverSupabaseUser(event);
  console.log(
    "[Driver Onboarding] serverSupabaseUser result:",
    JSON.stringify(existingUser),
  );
  const runtimeConfig = useRuntimeConfig();

  // Fallback: try Authorization header if cookie-based user is missing OR invalid
  if (!existingUser?.id) {
    const authHeader = getHeader(event, "authorization");
    console.log(
      "[Driver Onboarding] Auth header:",
      authHeader ? "present" : "missing",
    );
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;
    if (token) {
      console.log(
        "[Driver Onboarding] Attempting token validation, token length:",
        token.length,
      );
      const { data, error } = await supabase.auth.getUser(token);
      if (error) {
        console.error(
          "[Driver Onboarding] Token validation error:",
          error.message,
        );
      }
      if (data?.user?.id) {
        console.log("[Driver Onboarding] Token validated, user:", data.user.id);
        existingUser = data.user as any;
      } else {
        console.log(
          "[Driver Onboarding] Token validation returned no valid user with id",
        );
      }
    } else {
      console.log("[Driver Onboarding] No Bearer token found");
    }
  }

  console.log(
    "[Driver Onboarding] Final existingUser:",
    existingUser ? "found " + existingUser.id : "null",
  );

  const body = await readBody<SubmitBody>(event);

  // Validate personal info
  const fullName = String(body?.personal?.full_name || "").trim();
  const phone = String(body?.personal?.phone_number || "").trim();

  if (fullName.length < 3 || phone.length < 8) {
    throw createError({
      statusCode: 400,
      statusMessage: "Please check your personal information and try again.",
    });
  }

  // Validate vehicle info
  const vehicleType = String(body?.vehicle?.vehicle_type || "").trim();
  const plateNumber = String(body?.vehicle?.plate_number || "").trim();
  const idCardPath = body?.vehicle?.id_card_path || null;
  const vehicleRegPath = body?.vehicle?.vehicle_registration_path || null;

  // Bicycles don't need plate numbers
  const needsPlateNumber = vehicleType !== "bicycle";

  if (
    !vehicleType ||
    (needsPlateNumber && plateNumber.length < 3) ||
    !idCardPath ||
    !vehicleRegPath
  ) {
    throw createError({
      statusCode: 400,
      statusMessage:
        "Please complete all vehicle details and upload required documents.",
    });
  }

  // Validate payout info
  const bankCode = String(body?.payout?.bank_code || "").trim();
  const accountNumber = String(body?.payout?.account_number || "").trim();
  const accountName = String(body?.payout?.account_name || "").trim();

  if (!bankCode || accountNumber.length !== 10 || accountName.length < 3) {
    throw createError({
      statusCode: 400,
      statusMessage: "Please check your payout details and try again.",
    });
  }

  // Validate branches
  const selectedBranches = body?.branches?.selected_branches || [];
  if (!Array.isArray(selectedBranches) || selectedBranches.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Please select at least one branch to continue.",
    });
  }

  let userId: string;
  let userEmail: string;

  // If user is not authenticated, create a new account
  if (!existingUser) {
    const email = String(body?.account?.email || "")
      .trim()
      .toLowerCase();
    const password = String(body?.account?.password || "");

    // Validate account creation fields
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Please provide a valid email address.",
      });
    }

    if (!password || password.length < 6) {
      throw createError({
        statusCode: 400,
        statusMessage: "Password must be at least 6 characters.",
      });
    }

    // Create user using admin client (service role)
    const admin =
      (supabase as any).from && (supabase as any).auth?.admin
        ? (supabase as any)
        : createAdminClient(runtimeConfig);

    if (!admin) {
      throw createError({
        statusCode: 500,
        statusMessage: "Something went wrong. Please try again later.",
      });
    }

    // Check if email already exists
    const { data: existingAuthUser, error: checkError } = await (admin as any)
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingAuthUser) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "An account with this email already exists. Please log in instead.",
      });
    }

    // Create the auth user
    const { data: signUpData, error: signUpError } = await (
      supabase.auth.signUp as any
    )({
      email,
      password,
    });

    if (signUpError || !signUpData?.user) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "Failed to create account. Please try again or contact support.",
      });
    }

    userId = signUpData.user.id;
    userEmail = email;

    // Create profile for new user
    const { error: profileErr } = await (
      supabase.from("profiles").insert as any
    )({
      id: userId,
      email: userEmail,
      full_name: fullName,
      phone_number: phone,
      role: "customer", // Start as customer, will be upgraded to driver upon approval
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (profileErr) {
      // Try to clean up the auth user if profile creation fails
      console.error("[Driver Onboarding] Profile creation failed:", profileErr);
      throw createError({
        statusCode: 500,
        statusMessage:
          "Account setup failed. Please try again or contact support.",
      });
    }
  } else {
    // Use existing authenticated user
    if (!existingUser?.id) {
      console.log("[Driver Onboarding] No valid user id found, rejecting");
      throw createError({
        statusCode: 401,
        statusMessage: "Your session has expired. Please sign in again.",
      });
    }
    userId = existingUser.id;
    userEmail = existingUser.email || "";

    // Update existing user's profile
    const profileUpdate: Database["public"]["Tables"]["profiles"]["Update"] = {
      full_name: fullName,
      phone_number: phone,
      updated_at: new Date().toISOString(),
    };

    const { error: profileErr } = await (
      supabase.from("profiles").update as any
    )(profileUpdate).eq("id", userId);

    if (profileErr) {
      console.error("[Driver Onboarding] Profile update failed:", profileErr);
      throw createError({
        statusCode: 400,
        statusMessage: "Failed to update profile. Please try again.",
      });
    }
  }

  // Submit driver onboarding application
  const payload = {
    user_id: userId,
    status: "pending",
    personal: {
      ...body.personal,
      branches: { selected_branches: selectedBranches },
    },
    vehicle: body.vehicle,
    payout: body.payout,
    phone_verification: body.phone_verification,
    updated_at: new Date().toISOString(),
  };

  const { error: upsertErr } = await (
    supabase.from("rider_onboarding_applications").upsert as any
  )(payload, { onConflict: "user_id" });

  if (upsertErr) {
    console.error(
      "[Driver Onboarding] Application submission failed:",
      upsertErr,
    );
    throw createError({
      statusCode: 400,
      statusMessage: "Failed to submit application. Please try again.",
    });
  }

  return { success: true, userId };
});

// Helper to create admin client if needed
function createAdminClient(config: any) {
  const supabaseUrl = config.public?.supabaseUrl || config.supabaseUrl;
  const serviceRoleKey = config.serviceRoleKey;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  const { createClient } = require("@supabase/supabase-js");
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
