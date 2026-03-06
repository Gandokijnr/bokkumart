import { defineEventHandler, readBody, createError } from 'h3'

interface BranchInventoryItem {
  branch_code: string
  barcode: string
  sku: string
  price: number
  stock: number
}

interface BranchInventoryPayload {
  items: BranchInventoryItem[]
}

interface SyncResult {
  branch_code: string
  store_id: string | null
  items_processed: number
  items_created: number
  items_updated: number
  errors: string[]
}

interface BranchInventoryResponse {
  success: boolean
  results: SyncResult[]
  summary: {
    total_branches: number
    total_items_processed: number
    total_items_created: number
    total_items_updated: number
    total_errors: number
  }
}

export default defineEventHandler(async (event): Promise<BranchInventoryResponse> => {
  try {
    const body = await readBody<BranchInventoryPayload>(event)
    const { items } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw createError({
        statusCode: 400,
        message: 'Missing or invalid items array'
      })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const config = useRuntimeConfig()

    const supabase = createClient(
      config.public.supabaseUrl as string,
      config.supabaseServiceRoleKey as string,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Group items by branch_code
    const itemsByBranch = new Map<string, BranchInventoryItem[]>()
    for (const item of items) {
      if (!item.branch_code) {
        continue
      }
      const branchItems = itemsByBranch.get(item.branch_code) || []
      branchItems.push(item)
      itemsByBranch.set(item.branch_code, branchItems)
    }

    const results: SyncResult[] = []
    let totalCreated = 0
    let totalUpdated = 0
    let totalErrors = 0

    // Process each branch
    for (const [branchCode, branchItems] of itemsByBranch) {
      const result: SyncResult = {
        branch_code: branchCode,
        store_id: null,
        items_processed: 0,
        items_created: 0,
        items_updated: 0,
        errors: []
      }

      // Find store by branch code
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('id')
        .eq('code', branchCode.toUpperCase())
        .eq('is_active', true)
        .single()

      if (storeError || !store) {
        result.errors.push(`Store with code '${branchCode}' not found or inactive`)
        results.push(result)
        totalErrors += branchItems.length
        continue
      }

      result.store_id = store.id

      // Process each item for this branch
      for (const item of branchItems) {
        result.items_processed++

        try {
          // Find product by barcode or SKU
          let productQuery = supabase.from('products').select('id').eq('is_active', true)
          
          if (item.barcode) {
            productQuery = productQuery.eq('barcode', item.barcode)
          } else if (item.sku) {
            productQuery = productQuery.eq('sku', item.sku)
          } else {
            result.errors.push(`Item missing both barcode and SKU`)
            totalErrors++
            continue
          }

          const { data: product, error: productError } = await productQuery.single()

          if (productError || !product) {
            result.errors.push(`Product not found for barcode: ${item.barcode}, sku: ${item.sku}`)
            totalErrors++
            continue
          }

          // Check if store_inventory record exists
          const { data: existingInventory } = await supabase
            .from('store_inventory')
            .select('id')
            .eq('store_id', store.id)
            .eq('product_id', product.id)
            .single()

          if (existingInventory) {
            // Update existing inventory
            const { error: updateError } = await supabase
              .from('store_inventory')
              .update({
                stock_level: item.stock,
                available_stock: item.stock,
                store_price: item.price,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingInventory.id)

            if (updateError) {
              result.errors.push(`Failed to update inventory: ${updateError.message}`)
              totalErrors++
            } else {
              result.items_updated++
              totalUpdated++
            }
          } else {
            // Create new inventory record
            const { error: insertError } = await supabase
              .from('store_inventory')
              .insert({
                store_id: store.id,
                product_id: product.id,
                stock_level: item.stock,
                available_stock: item.stock,
                reserved_stock: 0,
                digital_buffer: 0,
                store_price: item.price,
                is_visible: true
              })

            if (insertError) {
              result.errors.push(`Failed to create inventory: ${insertError.message}`)
              totalErrors++
            } else {
              result.items_created++
              totalCreated++
            }
          }
        } catch (err: any) {
          result.errors.push(`Error processing item: ${err.message}`)
          totalErrors++
        }
      }

      results.push(result)
    }

    return {
      success: totalErrors === 0,
      results,
      summary: {
        total_branches: results.length,
        total_items_processed: items.length,
        total_items_created: totalCreated,
        total_items_updated: totalUpdated,
        total_errors: totalErrors
      }
    }
  } catch (err: any) {
    console.error('Error syncing branch inventory:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to sync branch inventory'
    })
  }
})
