import type { Product } from './useProducts'
import type { Store } from '~/stores/store'

export interface StoreInventoryItem {
  id: string
  store_id: string
  product_id: string
  stock_level: number
  reserved_stock: number
  available_stock: number
  digital_buffer: number
  is_visible: boolean
  store_price?: number
}

export interface ProductWithStoreAvailability extends Product {
  storeStock: number
  isAvailable: boolean
  storePrice?: number
  finalPrice: number
}

// Check if product is available at specific store (with digital buffer)
export function isProductAvailableAtStore(
  inventoryItem: StoreInventoryItem
): boolean {
  return inventoryItem.available_stock > inventoryItem.digital_buffer && inventoryItem.is_visible
}

// Get effective stock for display (accounting for digital buffer)
export function getDisplayStock(inventoryItem: StoreInventoryItem): number {
  const displayStock = inventoryItem.available_stock - inventoryItem.digital_buffer
  return Math.max(0, displayStock)
}

// Main composable for store-specific inventory management
export const useStoreInventory = () => {
  const inventory = ref<StoreInventoryItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Fetch inventory for a specific store
  const fetchStoreInventory = async (supabase: any, storeId: string) => {
    loading.value = true
    error.value = null

    try {
      const { data, error: supabaseError } = await supabase
        .from('store_inventory')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_visible', true)

      if (supabaseError) throw supabaseError

      inventory.value = data || []
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch inventory'
      console.error('Error fetching store inventory:', e)
    } finally {
      loading.value = false
    }
  }

  // Fetch available products at a specific store
  const fetchAvailableProducts = async (
    supabase: any,
    storeId: string,
    categoryId?: string
  ): Promise<ProductWithStoreAvailability[]> => {
    loading.value = true
    error.value = null

    try {
      // Use the available_store_products view for efficient querying
      let query = supabase
        .from('available_store_products')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_available', true)

      if (categoryId) {
        query = query.eq('category_id', categoryId)
      }

      const { data, error: supabaseError } = await query

      if (supabaseError) throw supabaseError

      return (data || []).map((item: any) => ({
        id: item.product_id,
        name: item.product_name,
        price: item.final_price,
        imageUrl: item.image_url || '',
        storeStock: item.display_stock,
        isAvailable: item.is_available,
        finalPrice: item.final_price
      }))
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch products'
      console.error('Error fetching available products:', e)
      return []
    } finally {
      loading.value = false
    }
  }

  // Get inventory item for a specific product at a specific store
  const getProductInventory = (
    productId: string,
    storeId: string
  ): StoreInventoryItem | undefined => {
    return inventory.value.find(
      item => item.product_id === productId && item.store_id === storeId
    )
  }

  // Check if a product is available at a specific store
  const checkProductAvailability = (
    productId: string,
    storeId: string
  ): { available: boolean; stock: number } => {
    const item = getProductInventory(productId, storeId)

    if (!item) {
      return { available: false, stock: 0 }
    }

    return {
      available: isProductAvailableAtStore(item),
      stock: getDisplayStock(item)
    }
  }

  // Filter products by store availability
  const filterProductsByStore = (
    products: Product[],
    storeId: string
  ): ProductWithStoreAvailability[] => {
    return products.map(product => {
      const inventoryItem = getProductInventory(product.id, storeId)
      const isAvailable = inventoryItem ? isProductAvailableAtStore(inventoryItem) : false
      const storeStock = inventoryItem ? getDisplayStock(inventoryItem) : 0
      const storePrice = inventoryItem?.store_price
      const finalPrice = storePrice || product.price

      return {
        ...product,
        storeStock,
        isAvailable,
        storePrice,
        finalPrice
      }
    })
  }

  // Reserve stock for an order (call when user places order)
  const reserveStock = async (
    supabase: any,
    storeId: string,
    productId: string,
    quantity: number
  ): Promise<boolean> => {
    try {
      // Use RPC to atomically reserve stock
      const { data, error: rpcError } = await supabase.rpc('reserve_stock', {
        p_store_id: storeId,
        p_product_id: productId,
        p_quantity: quantity
      })

      if (rpcError) throw rpcError
      return data === true
    } catch (e) {
      console.error('Failed to reserve stock:', e)
      return false
    }
  }

  // Release reserved stock (call if order is cancelled)
  const releaseStock = async (
    supabase: any,
    storeId: string,
    productId: string,
    quantity: number
  ): Promise<boolean> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('release_stock', {
        p_store_id: storeId,
        p_product_id: productId,
        p_quantity: quantity
      })

      if (rpcError) throw rpcError
      return data === true
    } catch (e) {
      console.error('Failed to release stock:', e)
      return false
    }
  }

  return {
    inventory,
    loading,
    error,
    fetchStoreInventory,
    fetchAvailableProducts,
    getProductInventory,
    checkProductAvailability,
    filterProductsByStore,
    reserveStock,
    releaseStock,
    isProductAvailableAtStore,
    getDisplayStock
  }
}
