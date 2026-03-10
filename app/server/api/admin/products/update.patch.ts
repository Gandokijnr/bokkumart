import { createError, defineEventHandler, readBody } from 'h3';
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server';

/**
 * PATCH /api/admin/products/update
 * Update an existing product
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
    if (!body.sku) {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'SKU is required for updates' 
      });
    }

    // Find the product by SKU
    const { data: existingProduct, error: findError } = await supabase
      .from('products')
      .select('id, sku')
      .eq('sku', body.sku)
      .single();

    if (findError || !existingProduct) {
      throw createError({ 
        statusCode: 404, 
        statusMessage: `Product with SKU "${body.sku}" not found` 
      });
    }

    // Build update object with only provided fields
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.barcode !== undefined) updateData.barcode = body.barcode;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.price !== undefined) updateData.price = body.price;
    if (body.cost_price !== undefined) updateData.cost_price = body.cost_price;
    if (body.category_id !== undefined) updateData.category_id = body.category_id;
    if (body.image_url !== undefined) updateData.image_url = body.image_url;
    if (body.is_visible !== undefined) updateData.is_visible = body.is_visible;

    // Update product
    const { data: product, error: updateError } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', existingProduct.id)
      .select()
      .single();

    if (updateError) {
      console.error('Product update error:', updateError);
      throw createError({ 
        statusCode: 500, 
        statusMessage: `Failed to update product: ${updateError.message}` 
      });
    }

    // Update associated inventory records if visibility changed
    if (body.is_visible !== undefined) {
      await supabase
        .from('store_inventory')
        .update({
          is_visible: body.is_visible,
          updated_at: new Date().toISOString(),
        })
        .eq('product_id', existingProduct.id);
    }

    return {
      success: true,
      product,
      message: 'Product updated successfully',
    };
  } catch (err: any) {
    console.error('Update product error:', err);
    
    if (err.statusCode) throw err;
    
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Internal server error',
    });
  }
});
