import { useLocationStore } from '~/stores/useLocationStore'
import type { Database } from '../types/database.types'

export type Product = {
  id: string
  name: string
  description?: string
  price: number
  oldPrice?: number
  imageUrl?: string
  image_url?: string
  badge?: string
  stockLevel: number
  availableStock: number
  storeId: string
  storeName: string
  isAvailable: boolean
  categoryId?: string
  categoryName?: string
  categorySlug?: string
  unit?: string
  digitalBuffer: number
  sku?: string
  metadata?: Record<string, any>
}

export type StockUpdate = {
  productId: string
  storeId: string
  newStockLevel: number
  newAvailableStock: number
  isAvailable: boolean
}

const formatNaira = (value: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(value).replace('NGN', '₦')
}

export const useProducts = () => {
  const supabase = useSupabaseClient<Database>()
  const locationStore = useLocationStore()

  // Reactive state for SSR and real-time updates
  const products = ref<Product[]>([])
  const pending = ref(false)
  const error = ref<string | null>(null)
  const stockUpdates = ref<Map<string, StockUpdate>>(new Map())
  const realtimeChannel = ref<any>(null)

  /**
   * Fetch products with stock levels for the selected store
   * Uses separate queries to avoid schema cache dependency
   */
  const fetchProducts = async () => {
    const storeId = locationStore.selectedStoreId

    if (!storeId) {
      error.value = 'No store selected'
      return
    }

    pending.value = true
    error.value = null

    try {
      // Fetch store info first
      const { data: storeData } = await supabase
        .from('stores')
        .select('id, name')
        .eq('id', storeId)
        .single() as { data: { id: string; name: string } | null }

      const storeName = storeData?.name || locationStore.selectedStoreName

      // Fetch inventory for this store
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('store_inventory')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_visible', true) as { data: any[] | null; error: any }

      if (inventoryError) throw inventoryError
      if (!inventoryData || inventoryData.length === 0) {
        products.value = []
        return
      }

      // Get all product IDs from inventory
      const productIds = inventoryData.map(item => item.product_id)

      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds)
        .eq('is_active', true) as { data: any[] | null; error: any }

      if (productsError) throw productsError

      // Get category IDs
      const categoryIds = [...new Set(productsData?.map(p => p.category_id).filter(Boolean) || [])]

      // Fetch categories
      let categoriesMap: Record<string, any> = {}
      if (categoryIds.length > 0) {
        const { data: categoriesData } = await supabase
          .from('categories')
          .select('id, name, slug')
          .in('id', categoryIds) as { data: any[] | null }

        categoriesData?.forEach(cat => {
          categoriesMap[cat.id] = cat
        })
      }

      // Create inventory lookup
      const inventoryMap: Record<string, any> = {}
      inventoryData.forEach(item => {
        inventoryMap[item.product_id] = item
      })

      // Transform data
      const transformed: Product[] = (productsData || []).map((product: any) => {
        const inventory = inventoryMap[product.id]
        const category = categoriesMap[product.category_id]
        const finalPrice = inventory?.store_price || product.price
        const effectiveStock = Math.max(0, (inventory?.available_stock || 0) - (inventory?.digital_buffer || 2))

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          price: finalPrice,
          oldPrice: inventory?.store_price && inventory.store_price < product.price ? product.price : undefined,
          imageUrl: product.image_url,
          image_url: product.image_url,
          unit: product.unit,
          sku: product.sku,
          metadata: product.metadata,
          categoryId: product.category_id,
          categoryName: category?.name,
          categorySlug: category?.slug,
          stockLevel: inventory?.stock_level || 0,
          availableStock: effectiveStock,
          digitalBuffer: inventory?.digital_buffer || 2,
          storeId: storeId,
          storeName: storeName,
          isAvailable: effectiveStock > 0,
          badge: finalPrice < product.price ? 'Deal' : effectiveStock <= 5 ? 'Low Stock' : undefined
        }
      })

      products.value = transformed
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch products'
      console.error('Error fetching products:', err)
    } finally {
      pending.value = false
    }
  }

  /**
   * Subscribe to real-time stock updates for the selected store
   * Updates the UI immediately when stock changes in the database
   */
  const subscribeToStockUpdates = (
    storeId: string,
    onStockUpdate: (update: StockUpdate) => void
  ) => {
    // Clean up existing subscription
    if (realtimeChannel.value) {
      supabase.removeChannel(realtimeChannel.value)
    }

    // Create new subscription for store_inventory changes
    realtimeChannel.value = supabase
      .channel(`store-inventory:${storeId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'store_inventory',
          filter: `store_id=eq.${storeId}`
        },
        async (payload: any) => {
          console.log('Stock change detected:', payload)

          const { new: newData, old: oldData, eventType } = payload

          if (eventType === 'UPDATE' || eventType === 'INSERT') {
            // Fetch the product details to get complete info
            const { data: productData } = await supabase
              .from('products')
              .select('id, name, price, image_url')
              .eq('id', newData.product_id)
              .single() as { data: { name: string } | null }

            const effectiveStock = Math.max(0, newData.available_stock - (newData.digital_buffer || 2))
            const wasAvailable = oldData ? (oldData.available_stock - (oldData.digital_buffer || 2)) > 0 : false
            const isNowAvailable = effectiveStock > 0

            const update: StockUpdate = {
              productId: newData.product_id,
              storeId: newData.store_id,
              newStockLevel: newData.stock_level,
              newAvailableStock: effectiveStock,
              isAvailable: isNowAvailable
            }

            // Store the update
            stockUpdates.value.set(newData.product_id, update)

            // Notify callback
            onStockUpdate(update)

            // If product just went out of stock, show a toast
            if (wasAvailable && !isNowAvailable) {
              console.warn(`Product ${productData?.name} just went out of stock at ${locationStore.selectedStoreName}`)
            }
          }
        }
      )
      .subscribe((status: string) => {
        console.log('Realtime subscription status:', status)
      })

    return realtimeChannel.value
  }

  /**
   * Unsubscribe from stock updates
   */
  const unsubscribeFromStockUpdates = () => {
    if (realtimeChannel.value) {
      supabase.removeChannel(realtimeChannel.value)
      realtimeChannel.value = null
    }
  }

  /**
   * Check current stock level for a specific product
   * Used before adding to cart for real-time validation
   */
  const checkStock = async (productId: string, storeId: string): Promise<{ available: number; isAvailable: boolean }> => {
    const { data, error } = await supabase
      .from('store_inventory')
      .select('available_stock, digital_buffer')
      .eq('store_id', storeId)
      .eq('product_id', productId)
      .single() as { data: { available_stock: number; digital_buffer: number } | null, error: any }

    if (error || !data) {
      return { available: 0, isAvailable: false }
    }

    const effectiveStock = Math.max(0, data.available_stock - (data.digital_buffer || 2))
    return {
      available: effectiveStock,
      isAvailable: effectiveStock > 0
    }
  }

  const formatPrice = (value: number) => formatNaira(value)

  /**
   * Fetch products filtered by category
   */
  const fetchProductsByCategory = async (categorySlug: string) => {
    const storeId = locationStore.selectedStoreId

    if (!storeId) {
      error.value = 'No store selected'
      return []
    }

    pending.value = true
    error.value = null

    try {
      // First get the category ID from slug
      const { data: categoryData, error: catError } = await supabase
        .from('categories')
        .select('id, name, slug')
        .eq('slug', categorySlug)
        .eq('is_active', true)
        .single() as { data: { id: string; name: string; slug: string } | null; error: any }

      if (catError || !categoryData) {
        error.value = 'Category not found'
        return []
      }

      // Fetch products in this category
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('category_id', categoryData.id)
        .eq('is_active', true) as { data: any[] | null; error: any }

      if (productsError) throw productsError
      if (!productsData || productsData.length === 0) {
        products.value = []
        return []
      }

      // Get product IDs
      const productIds = productsData.map(p => p.id)

      // Fetch inventory for these products at selected store
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('store_inventory')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_visible', true)
        .in('product_id', productIds)

      if (inventoryError) throw inventoryError

      // Create inventory lookup map
      const inventoryMap: Record<string, any> = {}
      inventoryData?.forEach((item: any) => {
        inventoryMap[item.product_id] = item
      })

      // Fetch store info
      const { data: storeData } = await supabase
        .from('stores')
        .select('id, name')
        .eq('id', storeId)
        .single() as { data: { id: string; name: string } | null }

      // Transform and join data
      const transformed: Product[] = productsData.map((product: any) => {
        const inventory = inventoryMap[product.id]
        
        if (!inventory) {
          // Product exists but no inventory at this store
          return {
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            imageUrl: product.image_url,
            unit: product.unit,
            sku: product.sku,
            metadata: product.metadata,
            categoryId: product.category_id,
            categoryName: categoryData.name,
            categorySlug: categoryData.slug,
            stockLevel: 0,
            availableStock: 0,
            digitalBuffer: 2,
            storeId: storeId,
            storeName: storeData?.name || locationStore.selectedStoreName,
            isAvailable: false,
            badge: undefined
          }
        }

        const finalPrice = inventory.store_price || product.price
        const effectiveStock = Math.max(0, inventory.available_stock - (inventory.digital_buffer || 2))

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          price: finalPrice,
          oldPrice: inventory.store_price && inventory.store_price < product.price ? product.price : undefined,
          imageUrl: product.image_url,
          unit: product.unit,
          sku: product.sku,
          metadata: product.metadata,
          categoryId: product.category_id,
          categoryName: categoryData.name,
          categorySlug: categoryData.slug,
          stockLevel: inventory.stock_level,
          availableStock: effectiveStock,
          digitalBuffer: inventory.digital_buffer || 2,
          storeId: storeId,
          storeName: storeData?.name || locationStore.selectedStoreName,
          isAvailable: effectiveStock > 0,
          badge: finalPrice < product.price ? 'Deal' : effectiveStock <= 5 ? 'Low Stock' : undefined
        }
      })

      products.value = transformed
      return transformed
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch products'
      console.error('Error fetching products by category:', err)
      return []
    } finally {
      pending.value = false
    }
  }

  return {
    products,
    pending,
    error,
    fetchProducts,
    fetchProductsByCategory,
    subscribeToStockUpdates,
    unsubscribeFromStockUpdates,
    checkStock,
    formatPrice,
    stockUpdates
  }
}
