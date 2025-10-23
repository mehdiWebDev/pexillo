// src/services/productListingService.ts
import { createClient } from '@/lib/supabase/client';

// =============================================
// TYPE DEFINITIONS
// =============================================

export interface ProductVariant {
  id: string;
  size: string;
  color: string;
  color_hex: string;
  inventory_count: number;
  is_active: boolean;
}

export interface ProductImage {
  id: string;
  image_url: string;
  alt_text: string;
  is_primary: boolean;
  view_type?: 'front' | 'back' | 'side' | 'detail';
  display_order?: number;
  variant_id?: string;  // Links to specific variant
}

export interface EnhancedProduct {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  base_price: number;
  badge: 'NEW' | 'HOT' | 'SALE' | 'LIMITED' | null;
  average_rating: number;
  review_count: number;
  primary_image_url: string;
  in_stock: boolean;
  has_discount: boolean;
  discount_percentage: number;
  discounted_price: number;
  available_colors: number;
  variants: ProductVariant[];
  images: ProductImage[];
  has_multiple_views: boolean;
  product_type: 'apparel' | 'accessory' | 'other';
  total_count?: number;  // Total results for pagination
  is_featured?: boolean;  // NEW: Featured flag
  category_id?: string;   // NEW: Category reference
}

export interface FilterOptions {
  available_sizes: string[];
  available_colors: { color: string; hex: string; count?: number }[];
  available_categories: { id: string; name: string; slug: string; count: number }[];  // NEW
  available_badges: string[];  // NEW
  min_price: number;
  max_price: number;
  total_products: number;
  products_on_sale: number;
  featured_products: number;  // NEW
}

export interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  product_count: number;
}

export interface ProductFilters {
  categorySlug?: string;        // Single category from URL (e.g., /products/hoodies)
  minPrice?: number;
  maxPrice?: number;
  sizeFilter?: string[];
  colorFilter?: string[];
  categoryFilter?: string[];    // NEW: Multiple categories from filter sidebar
  badgeFilter?: string[];       // NEW: Filter by badges
  featuredOnly?: boolean;       // NEW: Show only featured products
  inStockOnly?: boolean;
  onSaleOnly?: boolean;
  sortBy?: 'created_at' | 'price' | 'rating' | 'popular' | 'name';
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

// =============================================
// API FUNCTIONS
// =============================================

/**
 * Get products with enhanced data (variants, discounts, images)
 * 
 * This is the main function that triggers the SQL function!
 * Called by: useProductsEnhanced hook → when any filter changes
 * 
 * @param filters - All active filters from URL
 * @returns Products matching filters + total count for pagination
 */
export async function getProducts(
  filters: ProductFilters = {}
): Promise<{ products: EnhancedProduct[]; totalCount: number }> {
  const supabase = createClient();

  const {
    categorySlug,       // From URL path
    minPrice,
    maxPrice,
    sizeFilter,
    colorFilter,
    categoryFilter,     // NEW: From filter sidebar
    badgeFilter,        // NEW
    featuredOnly = false,  // NEW
    inStockOnly = false,
    onSaleOnly = false,
    sortBy = 'created_at',
    sortOrder = 'DESC',
    page = 1,
    limit = 12,
  } = filters;

  const offset = (page - 1) * limit;

  // Call the enhanced SQL function with all parameters
  const { data, error } = await supabase.rpc('get_products_enhanced', {
    category_slug_param: categorySlug || null,  // Main category from URL
    min_price: minPrice || null,
    max_price: maxPrice || null,
    size_filter: sizeFilter && sizeFilter.length > 0 ? sizeFilter : null,
    color_filter: colorFilter && colorFilter.length > 0 ? colorFilter : null,
    category_filter: categoryFilter && categoryFilter.length > 0 ? categoryFilter : null,  // NEW
    badge_filter: badgeFilter && badgeFilter.length > 0 ? badgeFilter : null,              // NEW
    featured_only: featuredOnly,  // NEW
    in_stock_only: inStockOnly,
    on_sale_only: onSaleOnly,
    sort_by: sortBy,
    sort_order: sortOrder,
    limit_count: limit,
    offset_count: offset,
  });

  if (error) {
    console.error('Error fetching enhanced products:', error);
    throw error;
  }

  const products = data || [];
  const totalCount = products.length > 0 ? products[0].total_count || 0 : 0;

  return { products, totalCount };
}

/**
 * Get available filter options for a category
 * 
 * Called when: Page loads or category changes
 * Purpose: Shows what filters are available
 * 
 * @param categorySlug - Optional category to filter options by
 * @returns All available filter options
 */
export async function getFilterOptions(
  categorySlug?: string
): Promise<FilterOptions> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_filter_options', {
    category_slug_param: categorySlug || null,
  });

  if (error) {
    console.error('Error fetching filter options:', error);
    throw error;
  }

  // The SQL function returns an array with one object
  return data[0] || {
    available_sizes: [],
    available_colors: [],
    available_categories: [],  // NEW
    available_badges: [],      // NEW
    min_price: 0,
    max_price: 1000,
    total_products: 0,
    products_on_sale: 0,
    featured_products: 0,  // NEW
  };
}

/**
 * Get category information for hero/SEO
 * 
 * Called when: Category page loads
 * Purpose: Shows category name, description in hero
 * 
 * @param categorySlug - Category slug from URL
 * @returns Category details or null
 */
export async function getCategoryInfo(
  categorySlug: string
): Promise<CategoryInfo | null> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_category_info', {
    category_slug_param: categorySlug,
  });

  if (error) {
    console.error('Error fetching category info:', error);
    throw error;
  }

  return data[0] || null;
}