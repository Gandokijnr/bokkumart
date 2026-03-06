import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

interface SyncItem {
  barcode?: string
  sku?: string
  retailman_product_id?: string
  stock_level: number
  name?: string
}

interface SyncInventoryBody {
  store_id: string
  items: SyncItem[]
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

  const body = await readBody<SyncInventoryBody>(event)
  if (!body?.store_id || !Array.isArray(body?.items)) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required fields: store_id, items' })
  }

  const { store_id, items } = body

  // Verify store access
  const allowedStoreIds = isSuperAdmin
    ? null
    : (callerProfile?.managed_store_ids || [])

  if (allowedStoreIds !== null && !allowedStoreIds.includes(store_id)) {
    throw createError({ statusCode: 403, statusMessage: 'Not authorized to manage this store' })
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
        item: item.name || 'Unknown',
        message: 'No barcode or SKU provided'
      })
      continue
    }

    try {
      let productId: string | null = null

      // Try to find by barcode first (RetailMan primary key)
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
        results.notFound.push(item.name || item.barcode || item.sku || 'Unknown')
        continue
      }

      results.matched++

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
            stock_level: item.stock_level,
            available_stock: item.stock_level,
            is_visible: item.stock_level > 0,
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
            stock_level: item.stock_level,
            available_stock: item.stock_level,
            reserved_stock: 0,
            is_visible: item.stock_level > 0
          })
        results.updated++
      }
    } catch (e: any) {
      results.errors.push({
        item: item.name || item.barcode || item.sku || 'Unknown',
        message: e?.message || 'Sync failed'
      })
    }
  }

  return {
    success: true,
    ...results
  }
})
