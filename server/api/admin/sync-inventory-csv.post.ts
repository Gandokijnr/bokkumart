import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

interface CsvRow {
  barcode?: string
  sku?: string
  retailman_product_id?: string
  stock_level?: string | number
  name?: string
  [key: string]: any
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function parseCsv(csvContent: string): CsvRow[] {
  const lines = csvContent.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  
  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim().replace(/"/g, ''))
  const rows: CsvRow[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    const row: CsvRow = {}
    headers.forEach((header, idx) => {
      const val = values[idx]?.replace(/"/g, '') || ''
      if (header.includes('barcode') || header === 'barcode') row.barcode = val
      else if (header.includes('sku') || header === 'sku') row.sku = val
      else if (header.includes('retailman') || header.includes('product_id')) row.retailman_product_id = val
      else if (header.includes('stock') || header.includes('qty') || header.includes('quantity')) row.stock_level = parseFloat(val) || 0
      else if (header.includes('name') || header.includes('product')) row.name = val
      else row[header] = val
    })
    rows.push(row)
  }
  
  return rows
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const supabaseUrl = ((config.public as any)?.supabase?.url as string | undefined) || process.env.SUPABASE_URL
  const serviceRoleKey = (config.supabaseServiceRoleKey as string | undefined) || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server not configured for inventory operations'
    })
  }

  const authHeader = event.node.req.headers['authorization']
  const bearer = Array.isArray(authHeader) ? authHeader[0] : authHeader
  const token = typeof bearer === 'string' && bearer.startsWith('Bearer ') ? bearer.slice('Bearer '.length) : null

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Missing Authorization Bearer token' })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  }) as unknown as ReturnType<typeof createClient<Database>>

  // Verify caller
  const { data: callerData, error: callerErr } = await admin.auth.getUser(token)
  if (callerErr || !callerData?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid session' })
  }

  const callerId = callerData.user.id
  const { data: callerProfile, error: profileErr } = await (admin as any)
    .from('profiles')
    .select('role, managed_store_ids')
    .eq('id', callerId)
    .single()

  if (profileErr) {
    throw createError({ statusCode: 500, statusMessage: profileErr.message })
  }

  const isBranchManager = callerProfile?.role === 'branch_manager'
  const isSuperAdmin = callerProfile?.role === 'super_admin'

  if (!isBranchManager && !isSuperAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Not authorized to sync inventory' })
  }

  // Parse multipart form data
  const formData = await readMultipartFormData(event)
  if (!formData) {
    throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })
  }

  const fileField = formData.find(f => f.name === 'file')
  const storeField = formData.find(f => f.name === 'store_id')
  
  if (!fileField || !storeField) {
    throw createError({ statusCode: 400, statusMessage: 'Missing file or store_id' })
  }

  const store_id = storeField.data.toString()

  // Verify store access
  const allowedStoreIds = isSuperAdmin
    ? null
    : (callerProfile?.managed_store_ids || [])

  if (allowedStoreIds !== null && !allowedStoreIds.includes(store_id)) {
    throw createError({ statusCode: 403, statusMessage: 'Not authorized to manage this store' })
  }

  // Parse CSV
  const csvContent = fileField.data.toString()
  const items = parseCsv(csvContent)

  if (items.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No valid data found in CSV' })
  }

  const results = {
    processed: 0,
    matched: 0,
    updated: 0,
    notFound: [] as string[],
    errors: [] as Array<{ item: string; message: string }>
  }

  for (const item of items) {
    results.processed++

    if (!item.barcode && !item.sku) {
      results.errors.push({
        item: item.name || `Row ${results.processed}`,
        message: 'No barcode or SKU found in row'
      })
      continue
    }

    try {
      let productId: string | null = null

      // Try to find by barcode first
      if (item.barcode) {
        const { data: byBarcode } = await (admin as any)
          .from('products')
          .select('id, name')
          .eq('barcode', item.barcode)
          .single()
        if (byBarcode) {
          productId = byBarcode.id
        }
      }

      // Fallback to SKU
      if (!productId && item.sku) {
        const { data: bySku } = await (admin as any)
          .from('products')
          .select('id, name')
          .eq('sku', item.sku)
          .single()
        if (bySku) {
          productId = bySku.id
        }
      }

      // Update retailman_product_id if provided
      if (productId && item.retailman_product_id) {
        await (admin as any)
          .from('products')
          .update({
            retailman_product_id: item.retailman_product_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', productId)
      }

      if (!productId) {
        results.notFound.push(item.name || item.barcode || item.sku || `Row ${results.processed}`)
        continue
      }

      results.matched++

      const stockLevel = typeof item.stock_level === 'number' ? item.stock_level : parseFloat(item.stock_level as string) || 0

      // Find inventory record
      const { data: invRecord } = await (admin as any)
        .from('store_inventory')
        .select('id')
        .eq('store_id', store_id)
        .eq('product_id', productId)
        .single()

      if (invRecord) {
        // Update existing
        await (admin as any)
          .from('store_inventory')
          .update({
            stock_level: stockLevel,
            available_stock: stockLevel,
            is_visible: stockLevel > 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', invRecord.id)
        results.updated++
      } else {
        // Create new inventory record
        await (admin as any)
          .from('store_inventory')
          .insert({
            store_id: store_id,
            product_id: productId,
            stock_level: stockLevel,
            available_stock: stockLevel,
            reserved_stock: 0,
            is_visible: stockLevel > 0
          })
        results.updated++
      }
    } catch (e: any) {
      results.errors.push({
        item: item.name || item.barcode || item.sku || `Row ${results.processed}`,
        message: e?.message || 'Sync failed'
      })
    }
  }

  return {
    success: true,
    processed: results.processed,
    matched: results.matched,
    updated: results.updated,
    notFound: results.notFound,
    errors: results.errors
  }
})
