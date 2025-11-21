// src/hooks/useProductFilters.ts
'use client';

import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useDebounce } from './useDebounce';

export interface FilterState {
  // Price filters
  minPrice?: number;
  maxPrice?: number;
  
  // Multi-select filters
  sizes: string[];
  colors: string[];
  categories: string[];  // NEW: Filter by multiple categories
  badges: string[];      // NEW: Filter by badges (NEW, HOT, SALE, LIMITED)
  
  // Toggle filters
  featuredOnly: boolean; // NEW: Show only featured products
  inStockOnly: boolean;
  onSaleOnly: boolean;
  
  // Sorting and pagination
  sortBy: 'created_at' | 'price' | 'rating' | 'popular' | 'name';
  sortOrder: 'ASC' | 'DESC';
  page: number;
}

/**
 * Hook to manage product filters with URL synchronization
 * 
 * How it works:
 * 1. Reads filter state from URL query parameters
 * 2. Provides functions to update individual filters
 * 3. Automatically syncs changes back to URL
 * 4. Debounces price changes to prevent excessive API calls
 * 5. Resets to page 1 when filters change (except sort/page)
 */
export function useProductFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Parse current filters from URL
  const currentFilters = useMemo((): FilterState => {
    // Price filters
    const minPrice = searchParams.get('price-min');
    const maxPrice = searchParams.get('price-max');
    
    // Multi-select filters (comma-separated values)
    const sizes = searchParams.get('sizes');
    const colors = searchParams.get('colors');
    const categories = searchParams.get('category');  // NEW
    const badges = searchParams.get('badge');        // NEW
    
    // Boolean filters
    const featuredOnly = searchParams.get('featured') === 'true';  // NEW
    const inStockOnly = searchParams.get('in-stock') === 'true';
    const onSaleOnly = searchParams.get('on-sale') === 'true';
    
    // Sort and pagination
    const sort = searchParams.get('sort') || 'created_at-desc';
    const page = parseInt(searchParams.get('page') || '1', 10);

    const [sortBy = 'created_at', sortOrder = 'DESC'] = sort.split('-') as [
      FilterState['sortBy'],
      FilterState['sortOrder']
    ];

    return {
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      sizes: sizes ? sizes.split(',') : [],
      colors: colors ? colors.split(',') : [],
      categories: categories ? categories.split(',') : [],  // NEW
      badges: badges ? badges.split(',') : [],            // NEW
      featuredOnly,                                        // NEW
      inStockOnly,
      onSaleOnly,
      sortBy,
      sortOrder,
      page,
    };
  }, [searchParams]);

  // Debounce price values for performance (prevents API calls while sliding)
  const debouncedMinPrice = useDebounce(currentFilters.minPrice, 500);
  const debouncedMaxPrice = useDebounce(currentFilters.maxPrice, 500);

  // Update URL with new filters
  const updateFilters = useCallback(
    (updates: Partial<FilterState>) => {
      const params = new URLSearchParams(searchParams.toString());

      // Helper function to set or delete param
      const setOrDelete = (key: string, value: string | number | boolean | string[] | undefined) => {
        if (value === undefined || value === false || value === '' ||
            (Array.isArray(value) && value.length === 0)) {
          params.delete(key);
        } else if (Array.isArray(value)) {
          params.set(key, value.join(','));
        } else {
          params.set(key, value.toString());
        }
      };

      // Update each filter type
      if ('minPrice' in updates) setOrDelete('price-min', updates.minPrice);
      if ('maxPrice' in updates) setOrDelete('price-max', updates.maxPrice);
      if ('sizes' in updates) setOrDelete('sizes', updates.sizes);
      if ('colors' in updates) setOrDelete('colors', updates.colors);
      if ('categories' in updates) setOrDelete('category', updates.categories);  // NEW
      if ('badges' in updates) setOrDelete('badge', updates.badges);           // NEW
      if ('featuredOnly' in updates) setOrDelete('featured', updates.featuredOnly ? 'true' : undefined); // NEW
      if ('inStockOnly' in updates) setOrDelete('in-stock', updates.inStockOnly ? 'true' : undefined);
      if ('onSaleOnly' in updates) setOrDelete('on-sale', updates.onSaleOnly ? 'true' : undefined);

      // Handle sorting
      if (updates.sortBy !== undefined || updates.sortOrder !== undefined) {
        const newSortBy = updates.sortBy || currentFilters.sortBy;
        const newSortOrder = updates.sortOrder || currentFilters.sortOrder;
        params.set('sort', `${newSortBy}-${newSortOrder.toLowerCase()}`);
      }

      // Handle pagination
      if (updates.page !== undefined) {
        if (updates.page > 1) {
          params.set('page', updates.page.toString());
        } else {
          params.delete('page');
        }
      }

      // Reset to page 1 if filters change (not sort or page)
      const isFilterChange = Object.keys(updates).some(
        (key) => key !== 'page' && key !== 'sortBy' && key !== 'sortOrder'
      );
      if (isFilterChange && !updates.page) {
        params.delete('page');
      }

      // Update URL without scrolling
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, pathname, router, currentFilters]
  );

  // Reset all filters
  const resetFilters = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  // Toggle functions for multi-select filters
  const toggleSize = useCallback(
    (size: string) => {
      const newSizes = currentFilters.sizes.includes(size)
        ? currentFilters.sizes.filter((s) => s !== size)
        : [...currentFilters.sizes, size];
      updateFilters({ sizes: newSizes });
    },
    [currentFilters.sizes, updateFilters]
  );

  const toggleColor = useCallback(
    (color: string) => {
      const newColors = currentFilters.colors.includes(color)
        ? currentFilters.colors.filter((c) => c !== color)
        : [...currentFilters.colors, color];
      updateFilters({ colors: newColors });
    },
    [currentFilters.colors, updateFilters]
  );

  // NEW: Toggle category filter
  const toggleCategory = useCallback(
    (category: string) => {
      const newCategories = currentFilters.categories.includes(category)
        ? currentFilters.categories.filter((c) => c !== category)
        : [...currentFilters.categories, category];
      updateFilters({ categories: newCategories });
    },
    [currentFilters.categories, updateFilters]
  );

  // NEW: Toggle badge filter
  const toggleBadge = useCallback(
    (badge: string) => {
      const newBadges = currentFilters.badges.includes(badge)
        ? currentFilters.badges.filter((b) => b !== badge)
        : [...currentFilters.badges, badge];
      updateFilters({ badges: newBadges });
    },
    [currentFilters.badges, updateFilters]
  );

  // Remove single filter
  const removeFilter = useCallback(
    (filterType: keyof FilterState, value?: string) => {
      switch (filterType) {
        case 'minPrice':
          updateFilters({ minPrice: undefined });
          break;
        case 'maxPrice':
          updateFilters({ maxPrice: undefined });
          break;
        case 'sizes':
          if (value) {
            const newSizes = currentFilters.sizes.filter((s) => s !== value);
            updateFilters({ sizes: newSizes });
          }
          break;
        case 'colors':
          if (value) {
            const newColors = currentFilters.colors.filter((c) => c !== value);
            updateFilters({ colors: newColors });
          }
          break;
        case 'categories':  // NEW
          if (value) {
            const newCategories = currentFilters.categories.filter((c) => c !== value);
            updateFilters({ categories: newCategories });
          }
          break;
        case 'badges':  // NEW
          if (value) {
            const newBadges = currentFilters.badges.filter((b) => b !== value);
            updateFilters({ badges: newBadges });
          }
          break;
        case 'featuredOnly':  // NEW
          updateFilters({ featuredOnly: false });
          break;
        case 'inStockOnly':
          updateFilters({ inStockOnly: false });
          break;
        case 'onSaleOnly':
          updateFilters({ onSaleOnly: false });
          break;
      }
    },
    [currentFilters, updateFilters]
  );

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      currentFilters.minPrice !== undefined ||
      currentFilters.maxPrice !== undefined ||
      currentFilters.sizes.length > 0 ||
      currentFilters.colors.length > 0 ||
      currentFilters.categories.length > 0 ||  // NEW
      currentFilters.badges.length > 0 ||      // NEW
      currentFilters.featuredOnly ||           // NEW
      currentFilters.inStockOnly ||
      currentFilters.onSaleOnly
    );
  }, [currentFilters]);

  return {
    filters: currentFilters,
    debouncedMinPrice,
    debouncedMaxPrice,
    updateFilters,
    resetFilters,
    toggleSize,
    toggleColor,
    toggleCategory,  // NEW
    toggleBadge,     // NEW
    removeFilter,
    hasActiveFilters,
  };
}