import { createError, defineEventHandler, readBody } from 'h3';
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server';

/**
 * DELETE /api/admin/products/delete
 * Soft delete a product and remove associated inventory
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
        statusMessage: 'SKU is required for deletion' 
      });
    }

    // Find the product by SKU
    const { data: product, error: findError } = await supabase
      .from('products')
      .select('id, sku, name, image_url')
      .eq('sku', body.sku)
      .single();

    if (findError || !product) {
      throw createError({ 
        statusCode: 404, 
        statusMessage: `Product with SKU "${body.sku}" not found` 
      });
    }

    // Check if product has active orders
    const { data: activeOrderItems } = await supabase
      .from('order_items')
      .select('id')
      .eq('product_id', product.id)
      .limit(1);

    if (activeOrderItems && activeOrderItems.length > 0) {
      // Soft delete: mark as deleted instead of hard delete
      const { error: softDeleteError } = await supabase
        .from('products')
        .update({
          is_visible: false,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id);

      if (softDeleteError) {
        throw createError({
          statusCode: 500,
          statusMessage: `Failed to soft delete product: ${softDeleteError.message}`,
        });
      }

      // Hide all inventory records
      await supabase
        .from('store_inventory')
        .update({
          is_visible: false,
          updated_at: new Date().toISOString(),
        })
        .eq('product_id', product.id);

      return {
        success: true,
        softDeleted: true,
        message: 'Product has order history and was soft deleted (hidden)',
      };
    }

    // Hard delete: Remove inventory records first (for data integrity)
    const { error: inventoryDeleteError } = await supabase
      .from('store_inventory')
      .delete()
      .eq('product_id', product.id);

    if (inventoryDeleteError) {
      console.error('Inventory delete error:', inventoryDeleteError);
      // Continue anyway, product deletion is more important
    }

    // Delete product image from storage if exists
    if (product.image_url) {
      try {
        const urlPath = new URL(product.image_url).pathname;
        const pathMatch = urlPath.match(/product-images\/(.+)$/);
        if (pathMatch) {
          await supabase.storage
            .from('products')
            .remove([`product-images/${pathMatch[1]}`]);
        }
      } catch (e) {
        console.log('Could not delete image from storage:', e);
      }
    }

    // Delete the product
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id);

    if (deleteError) {
      console.error('Product delete error:', deleteError);
      throw createError({ 
        statusCode: 500, 
        statusMessage: `Failed to delete product: ${deleteError.message}` 
      });
    }

    return {
      success: true,
      softDeleted: false,
      message: 'Product and associated inventory deleted permanently',
    };
  } catch (err: any) {
    console.error('Delete product error:', err);
    
    if (err.statusCode) throw err;
    
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Internal server error',
    });
  }
});
