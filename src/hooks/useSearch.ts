// src/hooks/useSearch.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from '@/src/i18n/routing';
import {
  searchProducts,
  quickSearch,
  getSearchSuggestions,
  getQueryCompletions,
  getBrandSuggestions,
  trackSearch,
  SearchResult,
  SearchFilters,
  SearchResponse,
  QuerySuggestion,
  BrandSuggestion
} from '@/src/services/searchService';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Main search hook
export function useSearch(initialQuery: string = '', initialFilters?: SearchFilters) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilters>(initialFilters || {});
  const [page, setPage] = useState(1);
  const [isSearching, setIsSearching] = useState(false);

  const debouncedQuery = useDebounce(query, 300);
  const limit = 20;

  // Main search query
  const {
    data: searchResults,
    isLoading,
    isFetching,
    error,
    refetch
  } = useQuery<SearchResponse>({
    queryKey: ['search', debouncedQuery, filters, page],
    queryFn: async () => {
      const results = await searchProducts({
        query: debouncedQuery,
        filters,
        limit,
        offset: (page - 1) * limit
      });

      // Track the search for analytics (only on first page)
      if (page === 1 && results.totalCount !== undefined) {
        trackSearch(debouncedQuery, results.totalCount);
      }

      return results;
    },
    enabled: debouncedQuery.length > 0,
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  // Quick search for autocomplete
  const {
    data: quickResults,
    isLoading: isQuickLoading
  } = useQuery<SearchResult[]>({
    queryKey: ['quickSearch', debouncedQuery],
    queryFn: () => quickSearch(debouncedQuery, 5),
    enabled: debouncedQuery.length > 1 && debouncedQuery.length < 20,
    staleTime: 10000,
    gcTime: 60000,
  });

  // Search suggestions
  const {
    data: suggestions,
    isLoading: isSuggestionsLoading
  } = useQuery({
    queryKey: ['searchSuggestions'],
    queryFn: getSearchSuggestions,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
  });

  // Query completions for autocomplete
  const {
    data: queryCompletions,
    isLoading: isCompletionsLoading
  } = useQuery<QuerySuggestion[]>({
    queryKey: ['queryCompletions', debouncedQuery],
    queryFn: () => getQueryCompletions(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 10000,
    gcTime: 60000,
  });

  // Brand suggestions
  const {
    data: brandSuggestions,
    isLoading: isBrandsLoading
  } = useQuery<BrandSuggestion[]>({
    queryKey: ['brandSuggestions', debouncedQuery],
    queryFn: () => getBrandSuggestions(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 10000,
    gcTime: 60000,
  });

  // Handle search submission
  const handleSearch = useCallback((searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (!finalQuery.trim()) return;

    setIsSearching(true);

    // Navigate to search results page with query params
    const params = new URLSearchParams({
      q: finalQuery,
      ...(filters.inStockOnly && { inStock: 'true' }),
      ...(filters.onSaleOnly && { onSale: 'true' }),
      ...(filters.minPrice && { minPrice: filters.minPrice.toString() }),
      ...(filters.maxPrice && { maxPrice: filters.maxPrice.toString() }),
    });

    router.push(`/search?${params.toString()}`);
    setIsSearching(false);
  }, [query, filters, router]);

  // Handle filter changes
  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1); // Reset to first page when filters change
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({});
    setPage(1);
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setFilters({});
    setPage(1);
  }, []);

  // Pagination helpers
  const totalPages = useMemo(() => {
    if (!searchResults) return 0;
    return Math.ceil(searchResults.totalCount / limit);
  }, [searchResults]);

  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setPage(prev => prev + 1);
    }
  }, [hasNextPage]);

  const prevPage = useCallback(() => {
    if (hasPrevPage) {
      setPage(prev => prev - 1);
    }
  }, [hasPrevPage]);

  return {
    // Query state
    query,
    setQuery,
    debouncedQuery,

    // Filter state
    filters,
    updateFilters,
    clearFilters,

    // Search results
    searchResults: searchResults?.results || [],
    totalCount: searchResults?.totalCount || 0,
    quickResults: quickResults || [],
    suggestions,
    queryCompletions: queryCompletions || [],
    brandSuggestions: brandSuggestions || [],

    // Loading states
    isLoading: isLoading || isFetching,
    isQuickLoading,
    isSuggestionsLoading,
    isCompletionsLoading,
    isBrandsLoading,
    isSearching,

    // Error state
    error,

    // Actions
    handleSearch,
    clearSearch,
    refetch,

    // Pagination
    page,
    setPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
  };
}

// Hook for search page (reads from URL params)
export function useSearchPage() {
  const router = useRouter();
  const searchParams = new URLSearchParams(
    typeof window !== 'undefined' ? window.location.search : ''
  );

  // Parse initial values from URL
  const initialQuery = searchParams.get('q') || '';
  const initialFilters: SearchFilters = {
    inStockOnly: searchParams.get('inStock') === 'true',
    onSaleOnly: searchParams.get('onSale') === 'true',
    minPrice: searchParams.get('minPrice')
      ? parseFloat(searchParams.get('minPrice')!)
      : undefined,
    maxPrice: searchParams.get('maxPrice')
      ? parseFloat(searchParams.get('maxPrice')!)
      : undefined,
  };

  const search = useSearch(initialQuery, initialFilters);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams({
      q: search.query,
      ...(search.filters.inStockOnly && { inStock: 'true' }),
      ...(search.filters.onSaleOnly && { onSale: 'true' }),
      ...(search.filters.minPrice && {
        minPrice: search.filters.minPrice.toString(),
      }),
      ...(search.filters.maxPrice && {
        maxPrice: search.filters.maxPrice.toString(),
      }),
    });

    const newUrl = `/search?${params.toString()}`;
    const currentUrl = window.location.pathname + window.location.search;

    if (newUrl !== currentUrl) {
      router.replace(newUrl);
    }
  }, [search.query, search.filters, router]);

  return search;
}