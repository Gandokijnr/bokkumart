import { createError, defineEventHandler, readBody } from 'h3';
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server';

/**
 * POST /api/admin/products/bulk
 * Bulk operations: delete or change category for multiple products
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
    const allowedRoles = ['admin', 'inventory_manager'];
    if (!allowedRoles.includes(role)) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden: Insufficient permissions' });
    }

    const body = await readBody(event);
    const supabase = await serverSupabaseClient(event);

    // Validate
    if (!body.operation || !body.skus || !Array.isArray(body.skus) || body.skus.length === 0) {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'Operation and skus array are required' 
      });
    }

    const { operation, skus } = body;
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Get product IDs from SKUs
    const { data: products, error: findError } = await supabase
      .from('products')
      .select('id, sku, name')
      .in('sku', skus);

    if (findError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to find products: ${findError.message}`,
      });
    }

    if (!products || products.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'No products found with the provided SKUs',
      });
    }

    const productIds = products.map((p: { id: string }) => p.id);

    switch (operation) {
      case 'delete':
        // Soft delete all inventory records first
        await supabase
          .from('store_inventory')
          .update({
            is_visible: false,
            updated_at: new Date().toISOString(),
          })
          .in('product_id', productIds);

        // Soft delete products
        const { error: deleteError } = await supabase
          .from('products')
          .update({
            is_visible: false,
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .in('id', productIds);

        if (deleteError) {
          results.errors.push(`Delete failed: ${deleteError.message}`);
          results.failed = products.length;
        } else {
          results.success = products.length;
        }
        break;

      case 'change_category':
        if (!body.category_id) {
          throw createError({
            statusCode: 400,
            statusMessage: 'category_id is required for change_category operation',
          });
        }

        const { error: categoryError } = await supabase
          .from('products')
          .update({
            category_id: body.category_id,
            updated_at: new Date().toISOString(),
          })
          .in('id', productIds);

        if (categoryError) {
          results.errors.push(`Category change failed: ${categoryError.message}`);
          results.failed = products.length;
        } else {
          results.success = products.length;
        }
        break;

      case 'toggle_visibility':
        const newVisibility = body.is_visible !== undefined ? body.is_visible : true;
        
        // Update inventory visibility
        await supabase
          .from('store_inventory')
          .update({
            is_visible: newVisibility,
            updated_at: new Date().toISOString(),
          })
          .in('product_id', productIds);

        // Update product visibility
        const { error: visibilityError } = await supabase
          .from('products')
          .update({
            is_visible: newVisibility,
            updated_at: new Date().toISOString(),
          })
          .in('id', productIds);

        if (visibilityError) {
          results.errors.push(`Visibility toggle failed: ${visibilityError.message}`);
          results.failed = products.length;
        } else {
          results.success = products.length;
        }
        break;

      default:
        throw createError({
          statusCode: 400,
          statusMessage: `Unknown operation: ${operation}. Supported: delete, change_category, toggle_visibility`,
        });
    }

    return {
      success: results.success > 0,
      results,
      message: `${results.success} products updated successfully`,
    };
  } catch (err: any) {
    console.error('Bulk operation error:', err);
    
    if (err.statusCode) throw err;
    
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Internal server error',
    });
  }
});
