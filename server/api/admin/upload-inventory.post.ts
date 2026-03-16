import { defineEventHandler, readMultipartFormData, createError } from "h3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";

interface CsvRow {
  name: string;
  sku?: string;
  category?: string;
  description?: string;
  price?: number;
  cost_price?: number;
  unit?: string;
  stock_level: number;
  store_price?: number;
  digital_buffer?: number;
  image_url?: string;
}

interface ParseResult {
  success: CsvRow[];
  errors: { row: number; message: string }[];
}

function parseCSV(content: string): ParseResult {
  // Detect delimiter: tab or comma
  const firstLine = content.split("\n")[0] || "";
  const delimiter = firstLine.includes("\t") ? "\t" : ",";

  const lines = content.trim().split("\n");
  if (lines.length < 2) {
    return {
      success: [],
      errors: [
        {
          row: 0,
          message: "CSV must have a header row and at least one data row",
        },
      ],
    };
  }

  // Header name mapping for Retail Man compatibility
  const headerMap: Record<string, string> = {
    "part number": "sku",
    part_number: "sku",
    partnumber: "sku",
    details: "name",
    description: "name",
    retail: "price",
    "retail price": "price",
    retail_price: "price",
    "retail qty": "stock_level",
    retail_qty: "stock_level",
    quantity: "stock_level",
    qty: "stock_level",
    category: "category",
    categories: "category",
    "cost price": "cost_price",
    cost_price: "cost_price",
    unit: "unit",
    "store price": "store_price",
    store_price: "store_price",
    "digital buffer": "digital_buffer",
    digital_buffer: "digital_buffer",
    "image url": "image_url",
    image_url: "image_url",
  };

  const rawHeaders =
    lines[0]
      ?.split(delimiter)
      .map((h) =>
        h.trim().toLowerCase().replace(/"/g, "").replace(/\r/g, ""),
      ) || [];

  // Map headers to standard names
  const headers = rawHeaders.map((h) => headerMap[h] || h);

  if (headers.length === 0) {
    return { success: [], errors: [{ row: 0, message: "Empty CSV file" }] };
  }
  const requiredFields = ["name", "stock_level", "price"];

  const missingFields = requiredFields.filter((f) => !headers.includes(f));
  if (missingFields.length > 0) {
    return {
      success: [],
      errors: [
        {
          row: 0,
          message: `Missing required columns: ${missingFields.join(", ")}. Expected one of: name/details, stock_level/retail qty, price/retail`,
        },
      ],
    };
  }

  const result: CsvRow[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;

    const values = parseCSVLine(line, delimiter);
    if (values.length !== headers.length) {
      errors.push({
        row: i + 1,
        message: `Column count mismatch. Expected ${headers.length}, got ${values.length}`,
      });
      continue;
    }

    const row: any = {};
    headers.forEach((header, idx) => {
      const val = values[idx];
      row[header] = val ? val.replace(/"/g, "").trim() : "";
    });

    const stockLevelRaw = row.stock_level?.trim();
    const stockLevel = stockLevelRaw ? parseInt(stockLevelRaw) : 0;
    if (isNaN(stockLevel) || stockLevel < 0) {
      errors.push({
        row: i + 1,
        message: `Invalid stock_level: ${row.stock_level}`,
      });
      continue;
    }

    const price = parseFloat(row.price);
    if (isNaN(price) || price < 0) {
      errors.push({ row: i + 1, message: `Invalid price: ${row.price}` });
      continue;
    }

    const costPrice = row.cost_price ? parseFloat(row.cost_price) : undefined;
    const storePrice = row.store_price
      ? parseFloat(row.store_price)
      : undefined;
    const digitalBuffer = row.digital_buffer ? parseInt(row.digital_buffer) : 0;

    if (row.cost_price && (isNaN(costPrice!) || costPrice! < 0)) {
      errors.push({
        row: i + 1,
        message: `Invalid cost_price: ${row.cost_price}`,
      });
      continue;
    }

    result.push({
      name: row.name,
      sku: row.sku,
      category: row.category,
      description: row.description,
      price: price,
      cost_price: costPrice,
      unit: row.unit || "unit",
      stock_level: stockLevel,
      store_price: storePrice,
      digital_buffer: digitalBuffer > 0 ? digitalBuffer : 0,
      image_url: row.image_url,
    });
  }

  return { success: result, errors };
}

function parseCSVLine(line: string, delimiter: string = ","): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  const supabaseUrl =
    ((config.public as any)?.supabase?.url as string | undefined) ||
    process.env.SUPABASE_URL;
  const serviceRoleKey =
    (config.supabaseServiceRoleKey as string | undefined) ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "Server not configured for inventory upload",
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

  // Verify caller
  const { data: callerData, error: callerErr } =
    await admin.auth.getUser(token);
  if (callerErr || !callerData?.user) {
    throw createError({ statusCode: 401, statusMessage: "Invalid session" });
  }

  const callerId = callerData.user.id;
  const { data: callerProfile, error: profileErr } = await (admin as any)
    .from("profiles")
    .select("role, managed_store_ids")
    .eq("id", callerId)
    .single();

  if (profileErr) {
    throw createError({ statusCode: 500, statusMessage: profileErr.message });
  }

  const isBranchManager = callerProfile?.role === "branch_manager";
  const isSuperAdmin = callerProfile?.role === "super_admin";

  if (!isBranchManager && !isSuperAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: "Not authorized to upload inventory",
    });
  }

  // Parse multipart form data
  const formData = await readMultipartFormData(event);
  const file = formData?.find((f) => f.name === "file");
  const storeIdField = formData?.find((f) => f.name === "store_id");
  const store_id = storeIdField?.data?.toString("utf-8");

  if (!file || !file.data) {
    throw createError({ statusCode: 400, statusMessage: "No file uploaded" });
  }

  if (!store_id) {
    throw createError({ statusCode: 400, statusMessage: "No store selected" });
  }

  const content = file.data.toString("utf-8");
  const { success: rows, errors: parseErrors } = parseCSV(content);

  if (rows.length === 0 && parseErrors.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `CSV parse errors: ${parseErrors.map((e) => `Row ${e.row}: ${e.message}`).join("; ")}`,
    });
  }

  // Validate store access
  const allowedStoreIds = isSuperAdmin
    ? null // null means all stores
    : callerProfile?.managed_store_ids || [];

  if (allowedStoreIds !== null && !allowedStoreIds.includes(store_id)) {
    throw createError({
      statusCode: 403,
      statusMessage: `Not authorized to manage store: ${store_id}`,
    });
  }

  // Fetch existing categories for matching
  const { data: categories } = await (admin as any)
    .from("categories")
    .select("id, name");
  const categoryMap = new Map(
    (categories || []).map((c: any) => [c.name.toLowerCase(), c.id]),
  );

  // Helper function to create a new category with slug
  const createCategory = async (name: string): Promise<string | null> => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const { data: newCategory, error: catError } = await (admin as any)
      .from("categories")
      .insert({
        name: name,
        slug: slug,
        is_active: true,
        sort_order: 0,
      })
      .select("id")
      .single();

    if (catError) {
      console.error(`Failed to create category "${name}":`, catError.message);
      return null;
    }

    return newCategory?.id || null;
  };

  const results = {
    created: 0,
    updated: 0,
    errors: [] as { row: number; message: string }[],
    productsCreated: 0,
    categoriesCreated: 0,
  };

  // Process each row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    if (!row) {
      results.errors.push({ row: i + 2, message: "Invalid row data" });
      continue;
    }

    try {
      // Find or create product
      let productId: string | null = null;

      // Try to find by SKU first
      if (row.sku) {
        const { data: existingBySku } = await (admin as any)
          .from("products")
          .select("id")
          .eq("sku", row.sku)
          .single();
        if (existingBySku) productId = existingBySku.id;
      }

      // Then try by name
      if (!productId) {
        const { data: existingByName } = await (admin as any)
          .from("products")
          .select("id")
          .ilike("name", row.name || "")
          .single();
        if (existingByName) productId = existingByName.id;
      }

      // Create product if not found
      if (!productId) {
        let categoryId = null;
        if (row.category) {
          const categoryKey = row.category.toLowerCase();
          categoryId = categoryMap.get(categoryKey) || null;
          if (!categoryId) {
            // Auto-create category if not exists
            categoryId = await createCategory(row.category);
            if (categoryId) {
              categoryMap.set(categoryKey, categoryId);
              results.categoriesCreated++;
            }
          }
        }

        const { data: newProduct, error: productError } = await (admin as any)
          .from("products")
          .insert({
            name: row.name || "Unnamed Product",
            description: row.description || null,
            sku: row.sku || null,
            category_id: categoryId,
            price: row.price,
            cost_price: row.cost_price || null,
            unit: row.unit || "unit",
            is_active: true,
            image_url: row.image_url || null,
          })
          .select("id")
          .single();

        if (productError)
          throw new Error(`Failed to create product: ${productError.message}`);
        if (!newProduct)
          throw new Error("Failed to create product: no data returned");
        productId = newProduct.id;
        results.productsCreated++;
      } else {
        // Update existing product with category if provided in CSV
        if (row.category) {
          const categoryKey = row.category.toLowerCase();
          let categoryId = categoryMap.get(categoryKey) || null;
          // Auto-create category if not exists
          if (!categoryId) {
            categoryId = await createCategory(row.category);
            if (categoryId) {
              categoryMap.set(categoryKey, categoryId);
              results.categoriesCreated++;
            }
          }
          if (categoryId) {
            await (admin as any)
              .from("products")
              .update({
                category_id: categoryId,
                updated_at: new Date().toISOString(),
              })
              .eq("id", productId);
          }
        }
      }

      if (!productId) {
        results.errors.push({
          row: i + 2,
          message: `Failed to create product: ${row.name || "unknown"}. Check price and required fields.`,
        });
        continue;
      }

      // Check for existing inventory record
      const { data: existingInventory } = await (admin as any)
        .from("store_inventory")
        .select("id")
        .eq("store_id", store_id)
        .eq("product_id", productId)
        .single();

      if (existingInventory) {
        // Update existing
        const { error: updateError } = await (admin as any)
          .from("store_inventory")
          .update({
            stock_level: row.stock_level || 0,
            digital_buffer: row.digital_buffer || 0,
            is_visible: (row.stock_level || 0) > 0,
            store_price: row.store_price || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingInventory.id);

        if (updateError) throw new Error(updateError.message);
        results.updated++;
      } else {
        // Create new inventory record
        const { error: insertError } = await (admin as any)
          .from("store_inventory")
          .insert({
            store_id: store_id,
            product_id: productId,
            stock_level: row.stock_level || 0,
            reserved_stock: 0,
            digital_buffer: row.digital_buffer || 0,
            is_visible: (row.stock_level || 0) > 0,
            store_price: row.store_price || null,
          });

        if (insertError) throw new Error(insertError.message);
        results.created++;
      }
    } catch (err: any) {
      results.errors.push({
        row: i + 2,
        message: err.message || "Unknown error",
      });
    }
  }

  // Log audit action
  try {
    await (admin as any).rpc("log_audit_action", {
      p_action_type: "inventory_update",
      p_entity_type: "store_inventory",
      p_entity_id: store_id,
      p_store_id: store_id,
      p_old_value: null,
      p_new_value: {
        csvRows: rows.length,
        created: results.created,
        updated: results.updated,
      },
      p_description: `CSV inventory upload: ${rows.length} rows processed`,
      p_metadata: {
        fileName: file.filename,
        parseErrors: parseErrors.length > 0 ? parseErrors : null,
      },
    });
  } catch (e) {
    // Non-critical, continue
  }

  return {
    success: results.errors.length === 0,
    processed: rows.length,
    inventoryCreated: results.created,
    inventoryUpdated: results.updated,
    productsCreated: results.productsCreated,
    categoriesCreated: results.categoriesCreated,
    parseErrors: parseErrors.length > 0 ? parseErrors : null,
    processingErrors: results.errors.length > 0 ? results.errors : null,
  };
});
