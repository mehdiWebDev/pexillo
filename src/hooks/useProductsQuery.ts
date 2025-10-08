// src/hooks/useProductsQuery.ts
import { useQuery } from '@tanstack/react-query';
import {
  getFeaturedProducts,
  getProductsByCategory,
  getBestSellers,
  getNewArrivals,
  getSaleProducts,
  getRelatedProducts,
  searchProducts,
  getWishlistCount,
  getCartCount,
} from '@/src/services/productService';

// Featured Products Hook
export function useFeaturedProducts(limit: number = 6, offset: number = 0) {
  return useQuery({
    queryKey: ['products', 'featured', limit, offset],
    queryFn: () => getFeaturedProducts(limit, offset),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}

// Products by Category Hook
export function useProductsByCategory({
  categorySlug,
  minPrice,
  maxPrice,
  sizeFilter,
  colorFilter,
  sortBy = 'created_at',
  sortOrder = 'DESC',
  limit = 12,
  offset = 0,
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
}) {
  return useQuery({
    queryKey: [
      'products',
      'category',
      categorySlug,
      { minPrice, maxPrice, sizeFilter, colorFilter, sortBy, sortOrder, limit, offset },
    ],
    queryFn: () =>
      getProductsByCategory({
        categorySlug,
        minPrice,
        maxPrice,
        sizeFilter,
        colorFilter,
        sortBy,
        sortOrder,
        limit,
        offset,
      }),
    staleTime: 5 * 60 * 1000,
    enabled: !!categorySlug, // Only run if categorySlug exists
  });
}

// Best Sellers Hook
export function useBestSellers(limit: number = 6, daysBack: number = 30) {
  return useQuery({
    queryKey: ['products', 'best-sellers', limit, daysBack],
    queryFn: () => getBestSellers(limit, daysBack),
    staleTime: 10 * 60 * 1000, // 10 minutes (changes less frequently)
  });
}

// New Arrivals Hook
export function useNewArrivals(limit: number = 6, daysNew: number = 14) {
  return useQuery({
    queryKey: ['products', 'new-arrivals', limit, daysNew],
    queryFn: () => getNewArrivals(limit, daysNew),
    staleTime: 5 * 60 * 1000,
  });
}

// Sale Products Hook
export function useSaleProducts(limit: number = 12, offset: number = 0) {
  return useQuery({
    queryKey: ['products', 'sale', limit, offset],
    queryFn: () => getSaleProducts(limit, offset),
    staleTime: 3 * 60 * 1000, // 3 minutes (sales change frequently)
  });
}

// Related Products Hook
export function useRelatedProducts(productId: string | null, limit: number = 4) {
  return useQuery({
    queryKey: ['products', 'related', productId, limit],
    queryFn: () => getRelatedProducts(productId!, limit),
    staleTime: 10 * 60 * 1000,
    enabled: !!productId, // Only run if productId exists
  });
}

// Product Search Hook
export function useProductSearch(query: string, limit: number = 20, offset: number = 0) {
  return useQuery({
    queryKey: ['products', 'search', query, limit, offset],
    queryFn: () => searchProducts(query, limit, offset),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: query.length > 0, // Only search if query exists
  });
}

// Wishlist Count Hook
export function useWishlistCount() {
  return useQuery({
    queryKey: ['wishlist', 'count'],
    queryFn: getWishlistCount,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

// Cart Count Hook
export function useCartCount() {
  return useQuery({
    queryKey: ['cart', 'count'],
    queryFn: getCartCount,
    staleTime: 30 * 1000, // 30 seconds (updates frequently)
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

// Legacy hook for backward compatibility
export function useProductsQuery() {
  return useFeaturedProducts();
}