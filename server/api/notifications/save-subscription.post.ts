import { defineEventHandler, readBody, createError } from "h3";
import { serverSupabaseClient } from "#supabase/server";
import type { Database } from "~/types/database.types";

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) as {
      userId?: string;
      role?: string;
      subscription?: {
        endpoint?: string;
        keys?: {
          p256dh?: string;
          auth?: string;
        };
      };
    };
    const { userId, role, subscription } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid subscription data",
      });
    }

    if (!subscription.keys.p256dh || !subscription.keys.auth) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid subscription keys",
      });
    }

    const client = await serverSupabaseClient<Database>(event);

    // Upsert subscription (insert or update if endpoint already exists)
    const subscriptionRecord: Database["public"]["Tables"]["push_subscriptions"]["Insert"] =
      {
        user_id: userId,
        role: role || "customer",
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        updated_at: new Date().toISOString(),
      };

    const { data, error } = await client
      .from("push_subscriptions")
      .upsert(subscriptionRecord as any, {
        onConflict: "endpoint",
      })
      .select("id")
      .single<{ id: string }>();

    if (error) {
      console.error("[API] Error saving subscription:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to save subscription",
      });
    }

    if (!data) {
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to save subscription",
      });
    }

    return {
      success: true,
      id: data.id,
    };
  } catch (error: any) {
    console.error("[API] save-subscription error:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || "Internal server error",
    });
  }
});
