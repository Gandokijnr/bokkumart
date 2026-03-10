import { createError, defineEventHandler, readBody } from 'h3';
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server';

/**
 * POST /api/admin/products/create
 * Create a new product with optional inventory record
 */
export default defineEventHandler(async (event) => {
  try {
    // Check authentication
    const user = await serverSupabaseUser(event);
    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
    }

    // Check admin/inventory manager role
    const role = user.app_metadata?.role || user.user_metadata?.role;
    const allowedRoles = ['admin', 'inventory_manager', 'branch_manager'];
    if (!allowedRoles.includes(role)) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden: Insufficient permissions' });
    }

    const body = await readBody(event);
    const supabase = await serverSupabaseClient(event);

    // Validate required fields
    if (!body.name || !body.price) {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'Product name and price are required' 
      });
    }

    // Generate SKU if not provided
    const sku = body.sku || generateSKU(body.name);

    // Check if SKU already exists
    const { data: existing } = await supabase
      .from('products')
      .select('sku')
      .eq('sku', sku)
      .single();

    if (existing) {
      throw createError({ 
        statusCode: 409, 
        statusMessage: `Product with SKU "${sku}" already exists` 
      });
    }

    // Create product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        name: body.name,
        sku: sku,
        barcode: body.barcode || null,
        description: body.description || null,
        price: body.price,
        cost_price: body.cost_price || null,
        category_id: body.category_id || null,
        image_url: body.image_url || null,
        is_visible: body.is_visible !== false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (productError) {
      console.error('Product creation error:', productError);
      throw createError({ 
        statusCode: 500, 
        statusMessage: `Failed to create product: ${productError.message}` 
      });
    }

    // If store_id is provided, create inventory record
    if (body.store_id && body.stock_level !== undefined) {
      // Check branch manager authorization
      if (role === 'branch_manager') {
        const { data: managerData } = await supabase
          .from('store_managers')
          .select('store_id')
          .eq('user_id', user.id)
          .eq('store_id', body.store_id)
          .single();

        if (!managerData) {
          throw createError({ 
            statusCode: 403, 
            statusMessage: 'Not authorized for this store' 
          });
        }
      }

      const { error: inventoryError } = await supabase
        .from('store_inventory')
        .insert({
          product_id: product.id,
          store_id: body.store_id,
          available_stock: body.stock_level || 0,
          reserved_stock: 0,
          is_visible: body.is_visible !== false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (inventoryError) {
        console.error('Inventory creation error:', inventoryError);
        // Don't fail the whole request if inventory fails
      }
    }

    return {
      success: true,
      product,
      message: 'Product created successfully',
    };
  } catch (err: any) {
    console.error('Create product error:', err);
    
    if (err.statusCode) throw err;
    
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Internal server error',
    });
  }
});

function generateSKU(name: string): string {
  const prefix = name
    .split(' ')
    .map(word => word[0]?.toUpperCase())
    .join('')
    .slice(0, 4);
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  return `${prefix}-${timestamp}`;
}
