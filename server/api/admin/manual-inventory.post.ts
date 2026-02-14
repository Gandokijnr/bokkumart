import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

interface ManualEntryRequest {
  store_id: string
  name: string
  sku?: string
  description?: string
  price?: number
  cost_price?: number
  unit?: string
  stock_level: number
  digital_buffer?: number
  store_price?: number
  image_url?: string
  is_visible?: boolean
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
    throw createError({ statusCode: 403, statusMessage: 'Not authorized to manage inventory' })
  }

  const body = await readBody<ManualEntryRequest>(event)
  if (!body) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid request body' })
  }

  const { store_id, name, sku, description, price, cost_price, unit, stock_level, digital_buffer, store_price, image_url, is_visible } = body

  if (!store_id || !name || stock_level === undefined) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required fields: store_id, name, stock_level' })
  }

  // Verify store access
  const allowedStoreIds = isSuperAdmin
    ? null
    : (callerProfile?.managed_store_ids || [])

  if (allowedStoreIds !== null && !allowedStoreIds.includes(store_id)) {
    throw createError({ statusCode: 403, statusMessage: 'Not authorized to manage this store' })
  }

  // Find or create product
  let productId: string | null = null

  // Try to find by SKU first
  if (sku) {
    const { data: existingBySku } = await (admin as any)
      .from('products')
      .select('id')
      .eq('sku', sku)
      .single()
    if (existingBySku) productId = existingBySku.id
  }

  // Then try by name
  if (!productId) {
    const { data: existingByName } = await (admin as any)
      .from('products')
      .select('id')
      .ilike('name', name)
      .single()
    if (existingByName) productId = existingByName.id
  }

  // Create product if not found and price is provided
  if (!productId && price) {
    const { data: newProduct, error: productError } = await (admin as any)
      .from('products')
      .insert({
        name: name,
        description: description || null,
        sku: sku || null,
        price: price,
        cost_price: cost_price || null,
        unit: unit || 'unit',
        is_active: true,
        image_url: image_url || null
      })
      .select('id')
      .single()

    if (productError) {
      throw createError({ statusCode: 500, statusMessage: `Failed to create product: ${productError.message}` })
    }
    if (!newProduct) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to create product: no data returned' })
    }
    productId = newProduct.id
  }

  if (!productId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Product not found. Provide a price to create a new product.'
    })
  }

  // Check for existing inventory record
  const { data: existingInventory } = await (admin as any)
    .from('store_inventory')
    .select('id')
    .eq('store_id', store_id)
    .eq('product_id', productId)
    .single()

  let action: 'created' | 'updated' = 'created'

  if (existingInventory) {
    // Update existing
    const { error: updateError } = await (admin as any)
      .from('store_inventory')
      .update({
        stock_level: stock_level,
        digital_buffer: digital_buffer || 0,
        is_visible: is_visible !== false,
        store_price: store_price || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingInventory.id)

    if (updateError) {
      throw createError({ statusCode: 500, statusMessage: `Failed to update inventory: ${updateError.message}` })
    }
    action = 'updated'
  } else {
    // Create new inventory record
    const { error: insertError } = await (admin as any)
      .from('store_inventory')
      .insert({
        store_id: store_id,
        product_id: productId,
        stock_level: stock_level,
        reserved_stock: 0,
        digital_buffer: digital_buffer || 0,
        is_visible: is_visible !== false,
        store_price: store_price || null
      })

    if (insertError) {
      throw createError({ statusCode: 500, statusMessage: `Failed to create inventory: ${insertError.message}` })
    }
  }

  // Log audit action
  try {
    await (admin as any).rpc('log_audit_action', {
      p_action_type: action === 'created' ? 'inventory_update' : 'stock_adjustment',
      p_entity_type: 'store_inventory',
      p_entity_id: productId,
      p_store_id: store_id,
      p_old_value: existingInventory ? { stock_level: existingInventory.stock_level } : null,
      p_new_value: { stock_level, name, sku },
      p_description: `Manual ${action} inventory for ${name}`,
      p_metadata: { source: 'manual_entry', isNewProduct: !productId }
    })
  } catch (e) {
    // Non-critical, continue
  }

  return {
    success: true,
    action,
    productId,
    productName: name
  }
})
