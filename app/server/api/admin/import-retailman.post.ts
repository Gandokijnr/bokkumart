import { defineEventHandler, readMultipartFormData, createError } from "h3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";

interface RetailManRow {
  partNumber: string;
  details: string;
  retail: number;
  retailQty: number;
}

interface ParseResult {
  success: RetailManRow[];
  errors: { row: number; message: string; rawData?: string }[];
}

interface UploadProgress {
  totalRows: number;
  processedRows: number;
  currentSku?: string;
}

/**
 * Parse Retail Man CSV export format
 * Expected columns: Part Number, Details, Retail, Retail Qty
 */
function parseRetailManCSV(content: string): ParseResult {
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

  // Parse headers (case-insensitive matching)
  const headers =
    lines[0]?.split(",").map((h) => h.trim().toLowerCase().replace(/"/g, "")) ||
    [];

  if (headers.length === 0) {
    return { success: [], errors: [{ row: 0, message: "Empty CSV file" }] };
  }

  // Map column indices
  const partNumberIdx = headers.findIndex(
    (h) => h.includes("part number") || h === "partnumber" || h === "part_no",
  );
  const detailsIdx = headers.findIndex(
    (h) => h === "details" || h === "description",
  );
  const retailIdx = headers.findIndex(
    (h) => h === "retail" || h === "price" || h === "retail price",
  );
  const retailQtyIdx = headers.findIndex(
    (h) =>
      h.includes("retail qty") ||
      h === "retailqty" ||
      h === "qty" ||
      h === "quantity",
  );

  const missingFields: string[] = [];
  if (partNumberIdx === -1) missingFields.push("Part Number");
  if (detailsIdx === -1) missingFields.push("Details");
  if (retailIdx === -1) missingFields.push("Retail");
  if (retailQtyIdx === -1) missingFields.push("Retail Qty");

  if (missingFields.length > 0) {
    return {
      success: [],
      errors: [
        {
          row: 0,
          message: `Missing required columns: ${missingFields.join(", ")}. Expected columns: Part Number, Details, Retail, Retail Qty`,
        },
      ],
    };
  }

  const result: RetailManRow[] = [];
  const errors: { row: number; message: string; rawData?: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    if (
      values.length <
      Math.max(partNumberIdx, detailsIdx, retailIdx, retailQtyIdx) + 1
    ) {
      errors.push({
        row: i + 1,
        message: `Insufficient columns. Expected at least ${Math.max(partNumberIdx, detailsIdx, retailIdx, retailQtyIdx) + 1}, got ${values.length}`,
        rawData: line,
      });
      continue;
    }

    const partNumber = values[partNumberIdx]?.replace(/"/g, "").trim() || "";
    const details = values[detailsIdx]?.replace(/"/g, "").trim() || "";
    const retailRaw = values[retailIdx]?.replace(/"/g, "").trim() || "";
    const retailQtyRaw = values[retailQtyIdx]?.replace(/"/g, "").trim() || "";

    // Validation: Part Number is required
    if (!partNumber) {
      errors.push({
        row: i + 1,
        message: `Missing Part Number (SKU). Row skipped.`,
        rawData: line,
      });
      continue;
    }

    // Strip currency symbols and parse price
    const retailClean = retailRaw.replace(/[^0-9.\-]/g, "");
    const retail = parseFloat(retailClean);
    if (isNaN(retail) || retail < 0) {
      errors.push({
        row: i + 1,
        message: `Invalid Retail price: "${retailRaw}". Must be a valid number.`,
        rawData: line,
      });
      continue;
    }

    // Parse quantity
    const retailQty = parseInt(retailQtyRaw) || 0;
    if (isNaN(retailQty) || retailQty < 0) {
      errors.push({
        row: i + 1,
        message: `Invalid Retail Qty: "${retailQtyRaw}". Must be a non-negative integer.`,
        rawData: line,
      });
      continue;
    }

    result.push({
      partNumber,
      details,
      retail,
      retailQty,
    });
  }

  return { success: result, errors };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
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

  // Authentication
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
    throw createError({
      statusCode: 400,
      statusMessage:
        "No target store selected. Please select a branch before uploading.",
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

  // Parse CSV
  const content = file.data.toString("utf-8");
  const { success: rows, errors: parseErrors } = parseRetailManCSV(content);

  if (rows.length === 0 && parseErrors.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `CSV parse errors: ${parseErrors.map((e) => `Row ${e.row}: ${e.message}`).join("; ")}`,
    });
  }

  // Results tracking
  const results = {
    processed: 0,
    productsUpdated: 0,
    productsCreated: 0,
    inventoryUpdated: 0,
    inventoryCreated: 0,
    failed: 0,
    errors: [] as { row: number; sku: string; message: string }[],
  };

  // Process each row with upsert logic
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    results.processed++;

    try {
      let productId: string | null = null;
      let isNewProduct = false;

      // UPSERT STRATEGY: Find by SKU (Part Number)
      const { data: existingBySku } = await (admin as any)
        .from("products")
        .select("id, name")
        .eq("sku", row.partNumber)
        .maybeSingle();

      if (existingBySku) {
        // UPDATE: Product exists - update price
        productId = existingBySku.id;
        const { error: updateError } = await (admin as any)
          .from("products")
          .update({
            price: row.retail,
            name: row.details || existingBySku.name, // Update name if provided
            updated_at: new Date().toISOString(),
          })
          .eq("id", productId);

        if (updateError) {
          throw new Error(`Failed to update product: ${updateError.message}`);
        }
        results.productsUpdated++;
      } else {
        // CREATE: New product
        const { data: newProduct, error: productError } = await (admin as any)
          .from("products")
          .insert({
            name: row.details || row.partNumber,
            sku: row.partNumber,
            price: row.retail,
            is_active: true,
            unit: "unit",
          })
          .select("id")
          .single();

        if (productError) {
          throw new Error(`Failed to create product: ${productError.message}`);
        }
        if (!newProduct) {
          throw new Error("Failed to create product: no data returned");
        }
        productId = newProduct.id;
        isNewProduct = true;
        results.productsCreated++;
      }

      if (!productId) {
        throw new Error("Failed to get or create product");
      }

      // UPSERT: Store Inventory for the selected branch
      const { data: existingInventory } = await (admin as any)
        .from("store_inventory")
        .select("id, stock_level, available_stock")
        .eq("store_id", store_id)
        .eq("product_id", productId)
        .maybeSingle();

      if (existingInventory) {
        // UPDATE: Existing inventory record
        const { error: updateError } = await (admin as any)
          .from("store_inventory")
          .update({
            stock_level: row.retailQty,
            available_stock: row.retailQty,
            is_visible: row.retailQty > 0,
            store_price: row.retail,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingInventory.id);

        if (updateError) {
          throw new Error(`Failed to update inventory: ${updateError.message}`);
        }
        results.inventoryUpdated++;
      } else {
        // CREATE: New inventory record for this store
        const { error: insertError } = await (admin as any)
          .from("store_inventory")
          .insert({
            store_id: store_id,
            product_id: productId,
            stock_level: row.retailQty,
            available_stock: row.retailQty,
            reserved_stock: 0,
            digital_buffer: 2, // Default buffer
            is_visible: row.retailQty > 0,
            store_price: row.retail,
          });

        if (insertError) {
          throw new Error(`Failed to create inventory: ${insertError.message}`);
        }
        results.inventoryCreated++;
      }
    } catch (err: any) {
      results.failed++;
      results.errors.push({
        row: i + 2,
        sku: row.partNumber,
        message: err.message || "Unknown error during processing",
      });
    }
  }

  // Log audit action
  try {
    await (admin as any).rpc("log_audit_action", {
      p_action_type: "retail_man_import",
      p_entity_type: "store_inventory",
      p_entity_id: store_id,
      p_store_id: store_id,
      p_old_value: null,
      p_new_value: {
        csvRows: rows.length,
        productsCreated: results.productsCreated,
        productsUpdated: results.productsUpdated,
        inventoryCreated: results.inventoryCreated,
        inventoryUpdated: results.inventoryUpdated,
        failed: results.failed,
      },
      p_description: `Retail Man CSV import: ${results.processed} rows processed for store ${store_id}`,
      p_metadata: {
        fileName: file.filename,
        storeId: store_id,
        parseErrors: parseErrors.length > 0 ? parseErrors : null,
        processingErrors: results.errors.length > 0 ? results.errors : null,
      },
    });
  } catch (e) {
    // Non-critical, continue
  }

  // Generate error report for download if there are errors
  let errorReport = null;
  if (results.errors.length > 0 || parseErrors.length > 0) {
    const allErrors = [
      ...parseErrors.map((e) => ({
        row: e.row,
        sku: "N/A",
        message: e.message,
        rawData: e.rawData || "",
      })),
      ...results.errors,
    ];

    // Create CSV content for error report
    const csvHeaders = "Row,SKU,Error,Raw Data\n";
    const csvRows = allErrors
      .map(
        (e) =>
          `"${e.row}","${e.sku}","${e.message.replace(/"/g, '""')}","${(e as any).rawData || ""}"`,
      )
      .join("\n");
    errorReport = csvHeaders + csvRows;
  }

  return {
    success: results.failed === 0,
    processed: results.processed,
    productsUpdated: results.productsUpdated,
    productsCreated: results.productsCreated,
    inventoryUpdated: results.inventoryUpdated,
    inventoryCreated: results.inventoryCreated,
    failed: results.failed,
    parseErrors: parseErrors.length > 0 ? parseErrors : null,
    processingErrors: results.errors.length > 0 ? results.errors : null,
    errorReport: errorReport, // Base64 encoded CSV for download
    storeId: store_id,
  };
});
