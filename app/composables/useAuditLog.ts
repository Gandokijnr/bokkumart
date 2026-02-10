/**
 * useAuditLog - Composable for tracking and viewing audit logs
 * 
 * Provides methods to:
 * - Log price changes
 * - Log inventory updates
 * - Log stock adjustments
 * - Fetch audit history
 * 
 * Automatically captures user info and timestamps for compliance and fraud prevention.
 */

import type { Database } from '~/types/database.types'

type AuditActionType = 'price_change' | 'inventory_update' | 'stock_adjustment' | 'product_visibility_change' | 'manager_assignment' | 'role_change'
type AuditEntityType = 'product' | 'store_inventory' | 'store' | 'profile'

export const useAuditLog = () => {
    const supabase = useSupabaseClient<Database>()
    const user = useSupabaseUser()

    /**
     * Log a price change
     * Example: "[Manager Name] changed Rice price at [Oshodi Branch] on [Timestamp]"
     */
    const logPriceChange = async (
        productId: string,
        storeId: string,
        oldPrice: number,
        newPrice: number,
        productName?: string
    ) => {
        try {
            // Get product name if not provided
            let name = productName
            if (!name) {
                const { data: product } = await supabase
                    .from('products')
                    .select('name')
                    .eq('id', productId)
                    .single()
                name = product?.name || 'Unknown Product'
            }

            const { data, error } = await supabase.rpc('log_audit_action', {
                p_action_type: 'price_change',
                p_entity_type: 'store_inventory',
                p_entity_id: productId,
                p_store_id: storeId,
                p_old_value: { price: oldPrice },
                p_new_value: { price: newPrice },
                p_description: `Changed ${name} price from ₦${oldPrice.toLocaleString()} to ₦${newPrice.toLocaleString()}`,
                p_metadata: {
                    product_id: productId,
                    product_name: name,
                    price_difference: newPrice - oldPrice,
                    percentage_change: ((newPrice - oldPrice) / oldPrice * 100).toFixed(2)
                }
            })

            if (error) throw error
            return data
        } catch (err: any) {
            console.error('Error logging price change:', err)
            return null
        }
    }

    /**
     * Log an inventory/stock update
     */
    const logInventoryUpdate = async (
        inventoryId: string,
        storeId: string,
        oldStock: number,
        newStock: number,
        productName?: string,
        reason?: string
    ) => {
        try {
            const { data, error } = await supabase.rpc('log_audit_action', {
                p_action_type: 'inventory_update',
                p_entity_type: 'store_inventory',
                p_entity_id: inventoryId,
                p_store_id: storeId,
                p_old_value: { stock_level: oldStock },
                p_new_value: { stock_level: newStock },
                p_description: `Updated ${productName || 'product'} stock from ${oldStock} to ${newStock}${reason ? ` - ${reason}` : ''}`,
                p_metadata: {
                    inventory_id: inventoryId,
                    product_name: productName,
                    stock_difference: newStock - oldStock,
                    reason: reason || 'Manual adjustment'
                }
            })

            if (error) throw error
            return data
        } catch (err: any) {
            console.error('Error logging inventory update:', err)
            return null
        }
    }

    /**
     * Log a stock adjustment (used for receiving shipments, corrections, etc.)
     */
    const logStockAdjustment = async (
        inventoryId: string,
        storeId: string,
        adjustment: number,
        reason: string,
        currentStock: number,
        productName?: string
    ) => {
        try {
            const newStock = currentStock + adjustment

            const { data, error } = await supabase.rpc('log_audit_action', {
                p_action_type: 'stock_adjustment',
                p_entity_type: 'store_inventory',
                p_entity_id: inventoryId,
                p_store_id: storeId,
                p_old_value: { stock_level: currentStock },
                p_new_value: { stock_level: newStock },
                p_description: `${adjustment > 0 ? 'Added' : 'Removed'} ${Math.abs(adjustment)} units of ${productName || 'product'} - ${reason}`,
                p_metadata: {
                    inventory_id: inventoryId,
                    product_name: productName,
                    adjustment_amount: adjustment,
                    adjustment_type: adjustment > 0 ? 'increase' : 'decrease',
                    reason
                }
            })

            if (error) throw error
            return data
        } catch (err: any) {
            console.error('Error logging stock adjustment:', err)
            return null
        }
    }

    /**
     * Log product visibility change (show/hide in store)
     */
    const logVisibilityChange = async (
        inventoryId: string,
        storeId: string,
        oldVisibility: boolean,
        newVisibility: boolean,
        productName?: string
    ) => {
        try {
            const { data, error } = await supabase.rpc('log_audit_action', {
                p_action_type: 'product_visibility_change',
                p_entity_type: 'store_inventory',
                p_entity_id: inventoryId,
                p_store_id: storeId,
                p_old_value: { is_visible: oldVisibility },
                p_new_value: { is_visible: newVisibility },
                p_description: `${newVisibility ? 'Showed' : 'Hid'} ${productName || 'product'} in store`,
                p_metadata: {
                    inventory_id: inventoryId,
                    product_name: productName
                }
            })

            if (error) throw error
            return data
        } catch (err: any) {
            console.error('Error logging visibility change:', err)
            return null
        }
    }

    /**
     * Log manager assignment changes (super admin only)
     */
    const logManagerAssignment = async (
        profileId: string,
        oldStoreIds: string[],
        newStoreIds: string[],
        managerName?: string
    ) => {
        try {
            // Get store names
            const { data: stores } = await supabase
                .from('stores')
                .select('id, name')
                .in('id', [...oldStoreIds, ...newStoreIds])

            const storeMap = new Map(stores?.map(s => [s.id, s.name]) || [])

            const oldStoreNames = oldStoreIds.map(id => storeMap.get(id)).filter(Boolean).join(', ')
            const newStoreNames = newStoreIds.map(id => storeMap.get(id)).filter(Boolean).join(', ')

            const { data, error } = await supabase.rpc('log_audit_action', {
                p_action_type: 'manager_assignment',
                p_entity_type: 'profile',
                p_entity_id: profileId,
                p_store_id: newStoreIds[0] || null, // Primary store
                p_old_value: { managed_store_ids: oldStoreIds, store_names: oldStoreNames },
                p_new_value: { managed_store_ids: newStoreIds, store_names: newStoreNames },
                p_description: `Reassigned ${managerName || 'manager'} from [${oldStoreNames}] to [${newStoreNames}]`,
                p_metadata: {
                    profile_id: profileId,
                    manager_name: managerName,
                    stores_added: newStoreIds.filter(id => !oldStoreIds.includes(id)),
                    stores_removed: oldStoreIds.filter(id => !newStoreIds.includes(id))
                }
            })

            if (error) throw error
            return data
        } catch (err: any) {
            console.error('Error logging manager assignment:', err)
            return null
        }
    }

    /**
     * Fetch audit logs with filters
     */
    const fetchAuditLogs = async (filters: {
        storeId?: string
        actionType?: AuditActionType
        startDate?: string
        endDate?: string
        limit?: number
    } = {}) => {
        try {
            let query = supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })

            if (filters.storeId) {
                query = query.eq('store_id', filters.storeId)
            }

            if (filters.actionType) {
                query = query.eq('action_type', filters.actionType)
            }

            if (filters.startDate) {
                query = query.gte('created_at', filters.startDate)
            }

            if (filters.endDate) {
                query = query.lte('created_at', filters.endDate)
            }

            if (filters.limit) {
                query = query.limit(filters.limit)
            }

            const { data, error } = await query

            if (error) throw error
            return data || []
        } catch (err: any) {
            console.error('Error fetching audit logs:', err)
            return []
        }
    }

    /**
     * Get recent audit logs for a specific entity
     */
    const fetchEntityAuditHistory = async (
        entityType: AuditEntityType,
        entityId: string,
        limit: number = 10
    ) => {
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .eq('entity_type', entityType)
                .eq('entity_id', entityId)
                .order('created_at', { ascending: false })
                .limit(limit)

            if (error) throw error
            return data || []
        } catch (err: any) {
            console.error('Error fetching entity audit history:', err)
            return []
        }
    }

    return {
        // Logging methods
        logPriceChange,
        logInventoryUpdate,
        logStockAdjustment,
        logVisibilityChange,
        logManagerAssignment,

        // Fetching methods
        fetchAuditLogs,
        fetchEntityAuditHistory
    }
}
