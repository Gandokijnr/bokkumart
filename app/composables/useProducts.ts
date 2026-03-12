import { useBranchStore } from "../stores/useBranchStore";
import type { Database } from "../types/database.types";

export type Product = {
  id: string;
  name: string;
  description?: string;
  price: number;
  oldPrice?: number;
  imageUrl?: string;
  image_url?: string;
  badge?: string;
  stockLevel: number;
  availableStock: number;
  storeId: string;
  storeName: string;
  isAvailable: boolean;
  categoryId?: string;
  categoryName?: string;
  categorySlug?: string;
  unit?: string;
  digitalBuffer: number;
  sku?: string;
  barcode?: string;
  retailmanProductId?: string;
  metadata?: Record<string, any>;
};

export type StockUpdate = {
  productId: string;
  storeId: string;
  newStockLevel: number;
  newAvailableStock: number;
  isAvailable: boolean;
};

const formatNaira = (value: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace("NGN", "₦");
};

export const useProducts = () => {
  const supabase = useSupabaseClient<Database>();
  const branchStore = useBranchStore();

  // Reactive state for SSR and real-time updates
  const products = ref<Product[]>([]);
  const pending = ref(false);
  const error = ref<string | null>(null);
  const stockUpdates = ref<Map<string, StockUpdate>>(new Map());
  const realtimeChannel = ref<any>(null);

  /**
   * Fetch products with stock levels for the selected branch
   * Joins products with inventory table, filtering by branch_id and quantity > 0
   */
  const fetchProducts = async () => {
    const branchId = branchStore.activeBranchId;

    if (!branchId) {
      error.value = "No branch selected";
      products.value = [];
      return;
    }

    pending.value = true;
    error.value = null;

    try {
      // Fetch branch info first
      const { data: branchData } = (await supabase
        .from("stores")
        .select("id, name")
        .eq("id", branchId)
        .single()) as { data: { id: string; name: string } | null };

      const branchName = branchData?.name || branchStore.activeBranchName;

      // Fetch inventory for this branch - only items with quantity > 0
      const { data: inventoryData, error: inventoryError } = (await supabase
        .from("store_inventory")
        .select("*")
        .eq("store_id", branchId)
        .eq("is_visible", true)
        .gt("available_stock", 0)) as { data: any[] | null; error: any };

      if (inventoryError) throw inventoryError;
      if (!inventoryData || inventoryData.length === 0) {
        products.value = [];
        pending.value = false;
        return;
      }

      // Get all product IDs from inventory (where quantity > 0)
      const productIds = inventoryData.map((item) => item.product_id);

      // Fetch products in chunks to avoid URL length limits
      const chunkSize = 50;
      const chunks = [];
      for (let i = 0; i < productIds.length; i += chunkSize) {
        chunks.push(productIds.slice(i, i + chunkSize));
      }

      // Fetch all chunks in parallel
      const productsResults = await Promise.all(
        chunks.map((chunk) =>
          supabase
            .from("products")
            .select("*")
            .in("id", chunk)
            .eq("is_active", true),
        ),
      );

      // Combine results and check for errors
      let productsData: any[] = [];
      for (const result of productsResults) {
        if (result.error) throw result.error;
        productsData.push(...(result.data || []));
      }

      // Get category IDs
      const categoryIds = [
        ...new Set(
          productsData?.map((p) => p.category_id).filter(Boolean) || [],
        ),
      ];

      // Fetch categories
      let categoriesMap: Record<string, any> = {};
      if (categoryIds.length > 0) {
        const { data: categoriesData } = (await supabase
          .from("categories")
          .select("id, name, slug")
          .in("id", categoryIds)) as { data: any[] | null };

        categoriesData?.forEach((cat) => {
          categoriesMap[cat.id] = cat;
        });
      }

      // Create inventory lookup
      const inventoryMap: Record<string, any> = {};
      inventoryData.forEach((item) => {
        inventoryMap[item.product_id] = item;
      });

      // Transform data - only include products with quantity > 0
      const transformed: Product[] = (productsData || [])
        .filter((product: any) => {
          const inventory = inventoryMap[product.id];
          // Double-check quantity > 0
          return inventory && inventory.available_stock > 0;
        })
        .map((product: any) => {
          const inventory = inventoryMap[product.id];
          const category = product.category_id
            ? categoriesMap[product.category_id]
            : { name: "Uncategorized", slug: "uncategorized" };
          const finalPrice = inventory.store_price || product.price;
          const effectiveStock = Math.max(
            0,
            (inventory.available_stock || 0) - (inventory.digital_buffer || 2),
          );

          // Generate public URL for image if it's a storage path
          let imageUrl = product.image_url;
          if (imageUrl && !imageUrl.startsWith("http")) {
            const {
              data: { publicUrl },
            } = supabase.storage.from("products").getPublicUrl(imageUrl);
            imageUrl = publicUrl;
          }

          return {
            id: product.id,
            name: product.name,
            description: product.description,
            price: finalPrice,
            oldPrice: finalPrice < product.price ? product.price : undefined,
            imageUrl: imageUrl,
            image_url: imageUrl,
            unit: product.unit,
            sku: product.sku,
            metadata: product.metadata,
            categoryId: product.category_id,
            categoryName: category?.name,
            categorySlug: category?.slug,
            stockLevel: inventory.stock_level,
            availableStock: effectiveStock,
            digitalBuffer: inventory.digital_buffer || 2,
            storeId: branchId,
            storeName: branchName,
            isAvailable: effectiveStock > 0,
            badge:
              finalPrice < product.price
                ? "Deal"
                : effectiveStock <= 5
                  ? "Low Stock"
                  : undefined,
          };
        });

      products.value = transformed;
    } catch (err: any) {
      error.value = err.message || "Failed to fetch products";
      console.error("Error fetching products:", err);
    } finally {
      pending.value = false;
    }
  };

  /**
   * Subscribe to real-time stock updates for the selected branch
   * Updates the UI immediately when stock changes in the database
   */
  const subscribeToStockUpdates = (
    branchId: string,
    onStockUpdate: (update: StockUpdate) => void,
  ) => {
    // Clean up existing subscription
    if (realtimeChannel.value) {
      supabase.removeChannel(realtimeChannel.value);
    }

    // Create new subscription for inventory changes
    realtimeChannel.value = supabase
      .channel(`store_inventory:${branchId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "store_inventory",
          filter: `store_id=eq.${branchId}`,
        },
        async (payload: any) => {
          console.log("Stock change detected:", payload);

          const { new: newData, old: oldData, eventType } = payload;

          if (eventType === "UPDATE" || eventType === "INSERT") {
            // Fetch the product details to get complete info
            const { data: productData } = (await supabase
              .from("products")
              .select("id, name, price, image_url")
              .eq("id", newData.product_id)
              .single()) as { data: { name: string } | null };

            const effectiveStock = Math.max(
              0,
              (newData.available_stock || 0) - (newData.digital_buffer || 2),
            );
            const wasAvailable = oldData
              ? (oldData.available_stock || 0) - (oldData.digital_buffer || 2) >
                0
              : false;
            const isNowAvailable = effectiveStock > 0;

            const update: StockUpdate = {
              productId: newData.product_id,
              storeId: newData.store_id,
              newStockLevel: newData.stock_level || 0,
              newAvailableStock: effectiveStock,
              isAvailable: isNowAvailable,
            };

            // Store the update
            stockUpdates.value.set(newData.product_id, update);

            // Notify callback
            onStockUpdate(update);

            // If product just went out of stock, show a toast
            if (wasAvailable && !isNowAvailable) {
              console.warn(
                `Product ${productData?.name} just went out of stock at ${branchStore.activeBranchName}`,
              );
            }
          }
        },
      )
      .subscribe((status: string) => {
        console.log("Realtime subscription status:", status);
      });

    return realtimeChannel.value;
  };

  /**
   * Unsubscribe from stock updates
   */
  const unsubscribeFromStockUpdates = () => {
    if (realtimeChannel.value) {
      supabase.removeChannel(realtimeChannel.value);
      realtimeChannel.value = null;
    }
  };

  /**
   * Check current stock level for a specific product at the active branch
   * Used before adding to cart for real-time validation
   */
  const checkStock = async (
    productId: string,
    branchId?: string,
  ): Promise<{ available: number; isAvailable: boolean }> => {
    const targetBranchId = branchId || branchStore.activeBranchId;

    if (!targetBranchId) {
      return { available: 0, isAvailable: false };
    }

    const { data, error } = (await supabase
      .from("store_inventory")
      .select("available_stock, digital_buffer")
      .eq("store_id", targetBranchId)
      .eq("product_id", productId)
      .single()) as {
      data: {
        quantity: number;
        available_stock: number;
        digital_buffer: number;
      } | null;
      error: any;
    };

    if (error || !data) {
      return { available: 0, isAvailable: false };
    }

    const effectiveStock = Math.max(
      0,
      (data.available_stock || 0) - (data.digital_buffer || 2),
    );
    return {
      available: effectiveStock,
      isAvailable: effectiveStock > 0,
    };
  };

  const formatPrice = (value: number) => formatNaira(value);

  /**
   * Fetch products filtered by category from the active branch
   */
  const fetchProductsByCategory = async (categorySlug: string) => {
    const branchId = branchStore.activeBranchId;

    if (!branchId) {
      error.value = "No branch selected";
      return [];
    }

    pending.value = true;
    error.value = null;

    try {
      // First get the category ID from slug
      const { data: categoryData, error: catError } = (await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("slug", categorySlug)
        .eq("is_active", true)
        .single()) as {
        data: { id: string; name: string; slug: string } | null;
        error: any;
      };

      if (catError || !categoryData) {
        error.value = "Category not found";
        return [];
      }

      // Fetch products in this category
      const { data: productsData, error: productsError } = (await supabase
        .from("products")
        .select("*")
        .eq("category_id", categoryData.id)
        .eq("is_active", true)) as { data: any[] | null; error: any };

      if (productsError) throw productsError;
      if (!productsData || productsData.length === 0) {
        products.value = [];
        return [];
      }

      // Get product IDs
      const productIds = productsData.map((p) => p.id);

      // Fetch inventory in chunks to avoid URL length limits - only items with quantity > 0
      const chunkSize = 50;
      const chunks = [];
      for (let i = 0; i < productIds.length; i += chunkSize) {
        chunks.push(productIds.slice(i, i + chunkSize));
      }

      // Fetch all chunks in parallel
      const inventoryResults = await Promise.all(
        chunks.map((chunk) =>
          supabase
            .from("store_inventory")
            .select("*")
            .eq("store_id", branchId)
            .eq("is_visible", true)
            .gt("available_stock", 0)
            .in("product_id", chunk),
        ),
      );

      // Combine results and check for errors
      let inventoryData: any[] = [];
      for (const result of inventoryResults) {
        if (result.error) throw result.error;
        inventoryData.push(...(result.data || []));
      }

      // Create inventory lookup map
      const inventoryMap: Record<string, any> = {};
      inventoryData?.forEach((item: any) => {
        inventoryMap[item.product_id] = item;
      });

      // Fetch branch info
      const { data: branchData } = (await supabase
        .from("stores")
        .select("id, name")
        .eq("id", branchId)
        .single()) as { data: { id: string; name: string } | null };

      // Transform and join data - only include products with quantity > 0
      const transformed: Product[] = productsData
        .filter((product: any) => {
          const inventory = inventoryMap[product.id];
          return inventory && inventory.available_stock > 0;
        })
        .map((product: any) => {
          const inventory = inventoryMap[product.id];

          const finalPrice = inventory.store_price || product.price;
          const effectiveStock = Math.max(
            0,
            (inventory.available_stock || 0) - (inventory.digital_buffer || 2),
          );

          // Generate public URL for image if it's a storage path
          let imageUrl = product.image_url;
          if (imageUrl && !imageUrl.startsWith("http")) {
            const {
              data: { publicUrl },
            } = supabase.storage.from("products").getPublicUrl(imageUrl);
            imageUrl = publicUrl;
          }

          return {
            id: product.id,
            name: product.name,
            description: product.description,
            price: finalPrice,
            oldPrice: finalPrice < product.price ? product.price : undefined,
            imageUrl: imageUrl,
            unit: product.unit,
            sku: product.sku,
            metadata: product.metadata,
            categoryId: product.category_id,
            categoryName: categoryData.name,
            categorySlug: categoryData.slug,
            stockLevel: inventory.stock_level,
            availableStock: effectiveStock,
            digitalBuffer: inventory.digital_buffer || 2,
            storeId: branchId,
            storeName: branchData?.name || branchStore.activeBranchName,
            isAvailable: effectiveStock > 0,
            badge:
              finalPrice < product.price
                ? "Deal"
                : effectiveStock <= 5
                  ? "Low Stock"
                  : undefined,
          };
        });

      products.value = transformed;
      return transformed;
    } catch (err: any) {
      error.value = err.message || "Failed to fetch products";
      console.error("Error fetching products by category:", err);
      return [];
    } finally {
      pending.value = false;
    }
  };

  /**
   * GLOBAL SEARCH EXCEPTION
   * Search for a product and check availability across all branches
   * Returns the product if available at current branch, or suggests alternative branches
   */
  const searchProductWithBranchFallback = async (
    query: string,
  ): Promise<{
    localProducts: Product[];
    unavailableAtCurrentBranch: Array<{
      product: Product;
      alternativeBranches: Array<{
        branchId: string;
        branchName: string;
        quantity: number;
      }>;
    }>;
  }> => {
    const branchId = branchStore.activeBranchId;

    if (!branchId) {
      return { localProducts: [], unavailableAtCurrentBranch: [] };
    }

    try {
      // Search for products matching the query
      const { data: searchResults, error: searchError } = (await supabase
        .from("products")
        .select("*")
        .ilike("name", `%${query}%`)
        .eq("is_active", true)
        .limit(20)) as { data: any[] | null; error: any };

      if (searchError || !searchResults || searchResults.length === 0) {
        return { localProducts: [], unavailableAtCurrentBranch: [] };
      }

      const productIds = searchResults.map((p) => p.id);

      // Get category IDs from search results
      const categoryIds = [
        ...new Set(
          searchResults?.map((p) => p.category_id).filter(Boolean) || [],
        ),
      ];

      // Fetch categories for the searched products
      let categoriesMap: Record<string, any> = {};
      if (categoryIds.length > 0) {
        const { data: categoriesData } = (await supabase
          .from("categories")
          .select("id, name, slug")
          .in("id", categoryIds)) as { data: any[] | null };

        categoriesData?.forEach((cat) => {
          categoriesMap[cat.id] = cat;
        });
      }

      // Check inventory at current branch
      const { data: currentBranchInventory } = (await supabase
        .from("store_inventory")
        .select("*")
        .eq("store_id", branchId)
        .eq("is_visible", true)
        .in("product_id", productIds)) as { data: any[] | null };

      // Check inventory at all other branches for products not available at current branch
      const currentBranchProductIds = new Set(
        (currentBranchInventory || [])
          .filter((item) => item.available_stock > 0)
          .map((item) => item.product_id),
      );

      const unavailableProductIds = productIds.filter(
        (id) => !currentBranchProductIds.has(id),
      );

      let alternativeBranchData: any[] = [];
      if (unavailableProductIds.length > 0) {
        // Fetch inventory at other branches for unavailable products
        const { data: otherBranchesInventory } = (await supabase
          .from("store_inventory")
          .select("*, stores(id, name)")
          .neq("store_id", branchId)
          .eq("is_visible", true)
          .in("product_id", unavailableProductIds)
          .gt("available_stock", 0)) as { data: any[] | null };

        alternativeBranchData = otherBranchesInventory || [];
      }

      // Build inventory lookup maps
      const currentBranchInventoryMap: Record<string, any> = {};
      currentBranchInventory?.forEach((item) => {
        currentBranchInventoryMap[item.product_id] = item;
      });

      // Transform available products at current branch
      const localProducts: Product[] = searchResults
        .filter((p) => currentBranchProductIds.has(p.id))
        .map((product) => {
          const inventory = currentBranchInventoryMap[product.id];
          const category = product.category_id
            ? categoriesMap[product.category_id]
            : { name: "Uncategorized", slug: "uncategorized" };
          const effectiveStock = Math.max(
            0,
            (inventory?.available_stock || 0) -
              (inventory?.digital_buffer || 2),
          );
          const finalPrice = inventory?.store_price || product.price;

          let imageUrl = product.image_url;
          if (imageUrl && !imageUrl.startsWith("http")) {
            const {
              data: { publicUrl },
            } = supabase.storage.from("products").getPublicUrl(imageUrl);
            imageUrl = publicUrl;
          }

          return {
            id: product.id,
            name: product.name,
            description: product.description,
            price: finalPrice,
            oldPrice: finalPrice < product.price ? product.price : undefined,
            imageUrl: imageUrl,
            unit: product.unit,
            sku: product.sku,
            metadata: product.metadata,
            categoryId: product.category_id,
            categoryName: category?.name,
            categorySlug: category?.slug,
            stockLevel: inventory?.stock_level || 0,
            availableStock: effectiveStock,
            digitalBuffer: inventory?.digital_buffer || 2,
            storeId: branchId,
            storeName: branchStore.activeBranchName,
            isAvailable: effectiveStock > 0,
            badge:
              finalPrice < product.price
                ? "Deal"
                : effectiveStock <= 5
                  ? "Low Stock"
                  : undefined,
          };
        });

      // Build unavailable products with alternative branches
      const unavailableAtCurrentBranch = searchResults
        .filter((p) => unavailableProductIds.includes(p.id))
        .map((product) => {
          // Find alternative branches for this product
          const alternatives = alternativeBranchData
            .filter((item) => item.product_id === product.id)
            .map((item) => ({
              branchId: item.store_id,
              branchName: item.stores?.name || "Unknown Store",
              quantity: item.available_stock || 0,
            }))
            .sort((a, b) => b.quantity - a.quantity);

          const category = product.category_id
            ? categoriesMap[product.category_id]
            : { name: "Uncategorized", slug: "uncategorized" };

          let imageUrl = product.image_url;
          if (imageUrl && !imageUrl.startsWith("http")) {
            const {
              data: { publicUrl },
            } = supabase.storage.from("products").getPublicUrl(imageUrl);
            imageUrl = publicUrl;
          }

          return {
            product: {
              id: product.id,
              name: product.name,
              description: product.description,
              price: product.price,
              imageUrl: imageUrl,
              unit: product.unit,
              sku: product.sku,
              categoryId: product.category_id,
              categoryName: category?.name,
              categorySlug: category?.slug,
              stockLevel: 0,
              availableStock: 0,
              digitalBuffer: 2,
              storeId: branchId,
              storeName: branchStore.activeBranchName,
              isAvailable: false,
            } as Product,
            alternativeBranches: alternatives,
          };
        })
        .filter((item) => item.alternativeBranches.length > 0);

      return { localProducts, unavailableAtCurrentBranch };
    } catch (err) {
      console.error("Error searching products:", err);
      return { localProducts: [], unavailableAtCurrentBranch: [] };
    }
  };

  return {
    products,
    pending,
    error,
    fetchProducts,
    fetchProductsByCategory,
    searchProductWithBranchFallback,
    subscribeToStockUpdates,
    unsubscribeFromStockUpdates,
    checkStock,
    formatPrice,
    stockUpdates,
  };
};
