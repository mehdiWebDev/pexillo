// src/services/searchService.ts
import { createClient } from '@/lib/supabase/client';

// Search result types
export interface SearchResult {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  base_price: number;
  badge: 'NEW' | 'HOT' | 'SALE' | 'LIMITED' | null;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  primary_image_url: string | null;
  in_stock: boolean;
  has_discount: boolean;
  discount_percentage: number;
  discounted_price: number;
  available_colors: number;
  min_variant_price: number | null;
  max_variant_price: number | null;
  relevance_score: number;
  created_at: string;
  updated_at: string;
  translations?: Record<string, {
    name?: string;
    short_description?: string;
    badge?: string;
    material?: string;
    tags?: string[];
  }>; // Added translations support with proper types
}

export interface SearchFilters {
  inStockOnly?: boolean;
  onSaleOnly?: boolean;
  minPrice?: number;
  maxPrice?: number;
  categoryIds?: string[];
  badges?: string[];
}

export interface SearchOptions {
  query: string;
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  hasMore: boolean;
}

// Search history management (localStorage)
const SEARCH_HISTORY_KEY = 'pexillo_search_history';
const MAX_HISTORY_ITEMS = 10;

export function getSearchHistory(): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
}

export function addToSearchHistory(query: string): void {
  if (typeof window === 'undefined' || !query.trim()) return;

  try {
    let history = getSearchHistory();

    // Remove duplicate if exists
    history = history.filter(item => item.toLowerCase() !== query.toLowerCase());

    // Add to beginning
    history.unshift(query);

    // Keep only max items
    history = history.slice(0, MAX_HISTORY_ITEMS);

    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving search history:', error);
  }
}

export function clearSearchHistory(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch (error) {
    console.error('Error clearing search history:', error);
  }
}

// Main search function
export async function searchProducts({
  query,
  filters = {},
  limit = 20,
  offset = 0
}: SearchOptions): Promise<SearchResponse> {
  const supabase = createClient();

  try {
    // Call the search_products function
    const { data, error } = await supabase
      .rpc('search_products', {
        search_query: query,
        limit_count: limit,
        offset_count: offset
      });

    if (error) {
      console.error('Search error:', error);
      throw error;
    }

    let results: SearchResult[] = data || [];

    // Apply client-side filters if needed
    if (filters.inStockOnly) {
      results = results.filter((p: SearchResult) => p.in_stock);
    }

    if (filters.onSaleOnly) {
      results = results.filter((p: SearchResult) => p.has_discount);
    }

    if (filters.minPrice !== undefined) {
      results = results.filter((p: SearchResult) => p.discounted_price >= filters.minPrice!);
    }

    if (filters.maxPrice !== undefined) {
      results = results.filter((p: SearchResult) => p.discounted_price <= filters.maxPrice!);
    }

    if (filters.categoryIds && filters.categoryIds.length > 0) {
      results = results.filter((p: SearchResult) =>
        p.category_id && filters.categoryIds!.includes(p.category_id)
      );
    }

    if (filters.badges && filters.badges.length > 0) {
      results = results.filter((p: SearchResult) =>
        p.badge && filters.badges!.includes(p.badge)
      );
    }

    // Add to search history if it's a new search (offset = 0)
    if (offset === 0 && query.trim()) {
      addToSearchHistory(query);
    }

    return {
      results,
      totalCount: results.length,
      hasMore: results.length === limit // If we got full limit, there might be more
    };
  } catch (error) {
    console.error('Error searching products:', error);
    return {
      results: [],
      totalCount: 0,
      hasMore: false
    };
  }
}

// Quick search for autocomplete (lighter query)
export async function quickSearch(query: string, limit: number = 5): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .rpc('search_products', {
        search_query: query,
        limit_count: limit,
        offset_count: 0
      });

    if (error) {
      console.error('Quick search error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in quick search:', error);
    return [];
  }
}

// Get search suggestions (trending, recent, etc.)
export async function getSearchSuggestions(): Promise<{
  recent: string[];
  trending: string[];
  categories: Array<{ id: string; name: string; slug: string }>;
}> {
  const supabase = createClient();

  try {
    // Get recent searches from localStorage
    const recent = getSearchHistory();

    // Get categories for suggestions
    const { data: categoriesData } = await supabase
      .from('categories')
      .select('id, name, slug')
      .eq('is_active', 'true')
      .order('name')
      .limit(8);

    // Get trending searches dynamically
    let trending: string[] = [];

    // Option 1: Get trending from search analytics (if table exists)
    try {
      const { data: trendingSearches } = await supabase
        .rpc('get_trending_searches', {
          days_back: 7,
          limit_count: 5
        });

      if (trendingSearches && trendingSearches.length > 0) {
        trending = trendingSearches.map((item: { search_term: string }) => item.search_term);
      }
    } catch {
      // Table might not exist yet, fall back to product-based trending
    }

    // Option 2: If no search analytics, use popular products
    if (trending.length === 0) {
      try {
        const { data: popularProducts } = await supabase
          .from('products')
          .select('name, purchase_count, view_count')
          .eq('is_active', true)
          .order('purchase_count', { ascending: false })
          .limit(5);

        if (popularProducts && popularProducts.length > 0) {
          trending = popularProducts.map((p: { name: string }) => p.name);
        }
      } catch {
        // Fall back to default trending
      }
    }

    // Option 3: Default fallback trending searches
    if (trending.length === 0) {
      trending = [
        'T-Shirt',
        'Hoodie',
        'New Arrivals',
        'Sale',
        'Summer Collection'
      ];
    }

    return {
      recent,
      trending,
      categories: categoriesData || []
    };
  } catch (error) {
    console.error('Error getting search suggestions:', error);
    return {
      recent: getSearchHistory(),
      trending: [],
      categories: []
    };
  }
}

// Get query completion suggestions
export interface QuerySuggestion {
  suggestion: string;
  type: 'product' | 'category' | 'brand' | 'popular';
  relevance_score: number;
}

export async function getQueryCompletions(partialQuery: string): Promise<QuerySuggestion[]> {
  if (!partialQuery || partialQuery.length < 2) return [];

  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .rpc('get_search_suggestions', {
        partial_query: partialQuery,
        limit_count: 8
      });

    if (error) {
      console.error('Error getting query completions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching query completions:', error);
    return [];
  }
}

// Get brand suggestions
export interface BrandSuggestion {
  brand_name: string;
  product_count: number;
}

export async function getBrandSuggestions(partialQuery: string): Promise<BrandSuggestion[]> {
  if (!partialQuery || partialQuery.length < 2) return [];

  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .rpc('get_brand_suggestions', {
        partial_query: partialQuery,
        limit_count: 5
      });

    if (error) {
      console.error('Error getting brand suggestions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching brand suggestions:', error);
    return [];
  }
}

// Track search analytics using secure function
export async function trackSearch(
  query: string,
  resultCount: number,
  clickedProductId?: string
): Promise<void> {
  const supabase = createClient();

  try {
    // Use the secure function instead of direct insert
    // This bypasses RLS and prevents direct table manipulation
    await supabase.rpc('track_search', {
      p_search_query: query,
      p_result_count: resultCount,
      p_clicked_product_id: clickedProductId || null
    });
  } catch (error) {
    // Silently fail if function doesn't exist
    console.log('Search tracking skipped:', error);
  }
}