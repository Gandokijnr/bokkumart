import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";

type ValidateCartItem = {
  product_id: string;
  quantity: number;
};

type ValidateBody = {
  store_id: string;
  items: ValidateCartItem[];
};

function normalizeItems(items: any): ValidateCartItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((i) => ({
      product_id: String(i?.product_id || ""),
      quantity: Number(i?.quantity || 0),
    }))
    .filter(
      (i) => !!i.product_id && Number.isFinite(i.quantity) && i.quantity > 0,
    );
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

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

  const authHeader = event.node.req.headers["authorization"];
  const bearer = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const token =
    typeof bearer === "string" && bearer.startsWith("Bearer ")
      ? bearer.slice("Bearer ".length)
      : null;

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: "Missing Authorization Bearer token",
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as ReturnType<typeof createClient<Database>>;

  const { data: callerData, error: callerErr } =
    await admin.auth.getUser(token);
  if (callerErr || !callerData?.user) {
    throw createError({ statusCode: 401, statusMessage: "Invalid session" });
  }

  const raw = await readBody<any>(event);
  const store_id = String(raw?.store_id || "");
  const items = normalizeItems(raw?.items);

  if (!store_id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing store information. Please refresh and try again.",
    });
  }

  if (items.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Your cart is empty. Add items to continue.",
    });
  }

  const productIds = Array.from(new Set(items.map((i) => i.product_id)));

  const { data: invRows, error: invErr } = await (admin as any)
    .from("store_inventory")
    .select("product_id, available_stock, digital_buffer, is_visible")
    .eq("store_id", store_id)
    .in("product_id", productIds);

  if (invErr) {
    throw createError({ statusCode: 500, statusMessage: invErr.message });
  }

  const invMap = new Map<
    string,
    { available_stock: number; digital_buffer: number; is_visible: boolean }
  >();
  for (const row of (invRows || []) as any[]) {
    invMap.set(String(row.product_id), {
      available_stock: Number(row.available_stock || 0),
      digital_buffer: Number(row.digital_buffer || 0),
      is_visible: !!row.is_visible,
    });
  }

  const issues = items
    .map((item) => {
      const inv = invMap.get(item.product_id);
      const rawAvailable = inv ? inv.available_stock : 0;
      const buffer = inv ? inv.digital_buffer : 0;
      const available = Math.max(0, rawAvailable - buffer);
      const visible = inv ? inv.is_visible : false;

      if (!inv) {
        return {
          product_id: item.product_id,
          requested: item.quantity,
          available,
          reason: "not_in_inventory",
        };
      }

      if (!visible) {
        return {
          product_id: item.product_id,
          requested: item.quantity,
          available,
          reason: "not_visible",
        };
      }

      if (available < item.quantity) {
        return {
          product_id: item.product_id,
          requested: item.quantity,
          available,
          reason: "insufficient_stock",
        };
      }

      return null;
    })
    .filter(Boolean);

  return {
    ok: issues.length === 0,
    issues,
  };
});
