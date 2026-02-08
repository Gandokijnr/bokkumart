import type { Database } from '../types/database.types'

export type Category = {
  id: string
  name: string
  slug: string
  description?: string
  imageUrl?: string
  sortOrder: number
  isActive: boolean
  parentId?: string
  productCount?: number
}

export const useCategories = () => {
  const supabase = useSupabaseClient<Database>()
  
  const categories = ref<Category[]>([])
  const pending = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch all active categories from the database
   * Optionally includes product count per category (fetched separately)
   */
  const fetchCategories = async (includeProductCount = false) => {
    pending.value = true
    error.value = null

    try {
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (categoriesError) throw categoriesError

      let categoriesWithCount: Category[] = (categoriesData || []).map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        imageUrl: cat.image_url,
        sortOrder: cat.sort_order,
        isActive: cat.is_active,
        parentId: cat.parent_id,
        productCount: 0
      }))

      // Fetch product counts separately if requested
      if (includeProductCount && categoriesWithCount.length > 0) {
        const categoryIds = categoriesWithCount.map(c => c.id)
        
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('category_id')
          .in('category_id', categoryIds)
          .eq('is_active', true)

        if (!productsError && productsData) {
          // Count products per category
          const countMap: Record<string, number> = {}
          productsData.forEach((p: any) => {
            if (p.category_id) {
              countMap[p.category_id] = (countMap[p.category_id] || 0) + 1
            }
          })

          // Update counts
          categoriesWithCount = categoriesWithCount.map(cat => ({
            ...cat,
            productCount: countMap[cat.id] || 0
          }))
        }
      }

      categories.value = categoriesWithCount
      return categories.value
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch categories'
      console.error('Error fetching categories:', err)
      return []
    } finally {
      pending.value = false
    }
  }

  /**
   * Get a single category by slug
   */
  const getCategoryBySlug = async (slug: string): Promise<Category | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

      if (fetchError) throw fetchError
      if (!data) return null

      return {
        id: data.id,
        name: data.name,
        slug: data.slug,
        description: data.description,
        imageUrl: data.image_url,
        sortOrder: data.sort_order,
        isActive: data.is_active,
        parentId: data.parent_id
      }
    } catch (err: any) {
      console.error('Error fetching category:', err)
      return null
    }
  }

  /**
   * Get category icon based on category name/slug
   * Returns appropriate emoji for common categories
   */
  const getCategoryIcon = (category: Category): string => {
    const iconMap: Record<string, string> = {
      'dairy-eggs': '🥛',
      'grains-rice': '🌾',
      'beverages': '🧃',
      'electronics': '📺',
      'fresh-produce': '🥬',
      'meat-seafood': '🍗',
      'cooking-oil': '🛢️',
      'bakery': '🍞',
      'condiments': '🧂',
      'kitchen-appliances': '🔌'
    }

    return iconMap[category.slug] || '📦'
  }

  /**
   * Format category display text
   */
  const getCategorySubtitle = (category: Category): string => {
    if (category.productCount && category.productCount > 0) {
      return `${category.productCount} items`
    }
    return category.description?.substring(0, 40) || 'Shop now'
  }

  return {
    categories,
    pending,
    error,
    fetchCategories,
    getCategoryBySlug,
    getCategoryIcon,
    getCategorySubtitle
  }
}
