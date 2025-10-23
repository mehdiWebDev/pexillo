// src/services/productService.ts
import { createClient } from '@/lib/supabase/client';

// Type definitions
export interface Product {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  base_price: number;
  badge: 'NEW' | 'HOT' | 'SALE' | 'LIMITED' | null;
  average_rating: number;
  review_count: number;
  primary_image_url: string;
  min_variant_price: number;
  max_variant_price: number;
  available_colors: number;
  in_stock: boolean;
  has_discount: boolean;
  discount_percentage: number;
  discounted_price: number;
}

export interface CategoryProduct extends Product {
  available_sizes: string[];
  available_colors_list: string[];
  lowest_price: number;
}


// Get featured products
export async function getFeaturedProducts(limit: number = 6, offset: number = 0): Promise<Product[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_featured_products', {
    limit_count: limit,
    offset_count: offset
  });

  if (error) {
    console.error('Error fetching featured products:', error);
    throw error;
  }

  return data || [];
}

// Get products by category with filters
export async function getProductsByCategory({
  categorySlug,
  minPrice,
  maxPrice,
  sizeFilter,
  colorFilter,
  sortBy = 'created_at',
  sortOrder = 'DESC',
  limit = 12,
  offset = 0
}: {
  categorySlug: string;
  minPrice?: number;
  maxPrice?: number;
  sizeFilter?: string[];
  colorFilter?: string[];
  sortBy?: string;
  sortOrder?: string;
  limit?: number;
  offset?: number;
}): Promise<CategoryProduct[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_products_by_category', {
    category_slug: categorySlug,
    min_price: minPrice,
    max_price: maxPrice,
    size_filter: sizeFilter,
    color_filter: colorFilter,
    sort_by: sortBy,
    sort_order: sortOrder,
    limit_count: limit,
    offset_count: offset
  });

  if (error) {
    console.error('Error fetching products by category:', error);
    throw error;
  }

  return data || [];
}

// Get best sellers
export async function getBestSellers(limit: number = 6, daysBack: number = 30): Promise<Product[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_best_sellers', {
    limit_count: limit,
    days_back: daysBack
  });

  if (error) {
    console.error('Error fetching best sellers:', error);
    throw error;
  }

  return data || [];
}

// Get new arrivals
export async function getNewArrivals(limit: number = 6, daysNew: number = 14): Promise<Product[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_new_arrivals', {
    limit_count: limit,
    days_considered_new: daysNew
  });

  if (error) {
    console.error('Error fetching new arrivals:', error);
    throw error;
  }

  return data || [];
}

// Get sale products
export async function getSaleProducts(limit: number = 12, offset: number = 0) {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_sale_products', {
    limit_count: limit,
    offset_count: offset
  });

  if (error) {
    console.error('Error fetching sale products:', error);
    throw error;
  }

  return data || [];
}

// Get related products
export async function getRelatedProducts(productId: string, limit: number = 4): Promise<Product[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_related_products', {
    product_id: productId,
    limit_count: limit
  });

  if (error) {
    console.error('Error fetching related products:', error);
    throw error;
  }

  return data || [];
}

// Search products
export async function searchProducts(query: string, limit: number = 20, offset: number = 0) {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('search_products', {
    search_query: query,
    limit_count: limit,
    offset_count: offset
  });

  if (error) {
    console.error('Error searching products:', error);
    throw error;
  }

  return data || [];
}

// Get wishlist count
export async function getWishlistCount(): Promise<number> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_wishlist_count');

  if (error) {
    console.error('Error fetching wishlist count:', error);
    return 0;
  }

  return data || 0;
}

// Get cart count
export async function getCartCount(): Promise<number> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_cart_count');

  if (error) {
    console.error('Error fetching cart count:', error);
    return 0;
  }

  return data || 0;
}


