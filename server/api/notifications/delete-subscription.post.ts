import { defineEventHandler, readBody, createError } from "h3";
import { serverSupabaseClient } from "#supabase/server";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { endpoint } = body;

    if (!endpoint) {
      throw createError({
        statusCode: 400,
        statusMessage: "Endpoint is required",
      });
    }

    const client = await serverSupabaseClient(event);

    const { error } = await client
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint);

    if (error) {
      console.error("[API] Error deleting subscription:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to delete subscription",
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error("[API] delete-subscription error:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || "Internal server error",
    });
  }
});
