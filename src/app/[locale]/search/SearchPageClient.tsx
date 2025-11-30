// app/[locale]/search/SearchPageClient.tsx
'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/src/i18n/routing';
import { ChevronLeft, ChevronRight, Package, Search } from 'lucide-react';
import ProductCard from '@/src/components/product-card';
import { useSearch } from '@/src/hooks/useSearch';
import { useFavorites } from '@/src/hooks/useFavorites';

export default function SearchPageClient() {
  const searchParams = useSearchParams();
  const t = useTranslations('search');
  const locale = useLocale();
  const { toggleFavorite, isFavorite } = useFavorites();

  // Get initial query from URL
  const initialQuery = searchParams.get('q') || '';

  const {
    query,
    setQuery,
    filters,
    updateFilters,
    clearFilters,
    searchResults,
    totalCount,
    isLoading,
    page,
    setPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
  } = useSearch(initialQuery);

  // Update search when URL changes
  useEffect(() => {
    const urlQuery = searchParams.get('q') || '';
    if (urlQuery !== query) {
      setQuery(urlQuery);
    }
  }, [searchParams, query, setQuery]);

  // Apply translations to products if needed
  const translatedResults = searchResults.map(product => {
    if (locale === 'fr' && product.translations?.fr) {
      return {
        ...product,
        name: product.translations.fr.name || product.name,
        short_description: product.translations.fr.short_description || product.short_description,
        badge: product.translations.fr.badge || product.badge,
      };
    }
    return product;
  });

  // Generate pagination range
  const getPaginationRange = () => {
    const range: (number | string)[] = [];
    const showPages = 5;

    if (totalPages <= showPages + 2) {
      for (let i = 1; i <= totalPages; i++) {
        range.push(i);
      }
    } else {
      range.push(1);
      if (page > 3) range.push('...');

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        range.push(i);
      }

      if (page < totalPages - 2) range.push('...');
      range.push(totalPages);
    }

    return range;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Filter Header */}
      <div className="bg-white border-b border-gray-200 sticky top-[73px] z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Search Results Info */}
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900">
                {query ? (
                  <>
                    {t('resultsFor') || 'Results for'} &ldquo;<span className="text-brand-dark">{query}</span>&rdquo;
                  </>
                ) : (
                  t('allProducts') || 'All Products'
                )}
              </h1>
              {totalCount > 0 && (
                <span className="text-sm text-gray-500">
                  ({totalCount} {t('products') || 'products'})
                </span>
              )}
            </div>

            {/* Quick Filters */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateFilters({ inStockOnly: !filters.inStockOnly })}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filters.inStockOnly
                    ? 'bg-brand-dark text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-brand-dark'
                }`}
              >
                {t('inStock') || 'In Stock'}
              </button>
              <button
                onClick={() => updateFilters({ onSaleOnly: !filters.onSaleOnly })}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filters.onSaleOnly
                    ? 'bg-brand-red text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-brand-red'
                }`}
              >
                {t('onSale') || 'On Sale'}
              </button>
              {(filters.inStockOnly || filters.onSaleOnly) && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  {t('clearFilters') || 'Clear'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Results Header */}
        {query && (
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              {t('searchResults') || 'Search Results'} &quot;{query}&quot;
            </h1>
            <p className="text-gray-600">
              {isLoading ? (
                <span className="inline-block h-4 w-32 bg-gray-200 rounded animate-pulse" />
              ) : (
                <>
                  {totalCount} {t('productsFound') || 'products found'}
                </>
              )}
            </p>
          </div>
        )}

        {/* Results Grid */}
        {!query ? (
          // Empty state - no search query
          <div className="flex flex-col items-center justify-center py-16">
            <Search className="w-16 h-16 text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t('startSearching') || 'Start searching'}
            </h2>
            <p className="text-gray-600 text-center max-w-md">
              {t('searchHelp') || 'Enter a search term above to find products'}
            </p>
          </div>
        ) : isLoading ? (
          // Loading state
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex flex-col">
                <div className="aspect-[4/5] bg-gray-200 rounded-2xl mb-4 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-3/5 bg-gray-200 rounded animate-pulse" />
                  <div className="h-5 w-4/5 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-2/5 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : searchResults.length > 0 ? (
          <>
            {/* Products Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
              {translatedResults.map((product) => (
                <ProductCard
                  key={product.id}
                  product={{
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    short_description: product.short_description || undefined,
                    base_price: product.base_price,
                    badge: product.badge as 'NEW' | 'HOT' | 'SALE' | 'LIMITED' | null | undefined,
                    primary_image_url: product.primary_image_url || '',
                    in_stock: product.in_stock,
                    has_discount: product.has_discount,
                    discount_percentage: product.discount_percentage,
                    discounted_price: product.discounted_price,
                    available_colors: product.available_colors,
                    variants: [],  // Search doesn't return variants
                    images: [],    // Search doesn't return images
                  }}
                  showColorSwitcher={false}  // Don't show color switcher without variants
                  showSizePicker={false}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={isFavorite(product.id)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-8 border-t border-gray-200">
                <button
                  className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-black disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  onClick={prevPage}
                  disabled={!hasPrevPage}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={20} />
                  {t('previous') || 'Previous'}
                </button>

                <div className="flex items-center gap-1.5">
                  {getPaginationRange().map((pageNum, index) => {
                    if (pageNum === '...') {
                      return (
                        <span key={`ellipsis-${index}`} className="w-10 text-center text-gray-400 text-sm">
                          ...
                        </span>
                      );
                    }

                    return (
                      <button
                        key={pageNum}
                        className={`w-10 h-10 flex items-center justify-center bg-white border rounded-md text-sm font-medium transition-all ${
                          page === pageNum
                            ? 'bg-black border-black text-white'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-black'
                        }`}
                        onClick={() => typeof pageNum === 'number' && setPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-black disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  onClick={nextPage}
                  disabled={!hasNextPage}
                  aria-label="Next page"
                >
                  {t('next') || 'Next'}
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </>
        ) : (
          // No results found
          <div className="flex flex-col items-center justify-center py-16">
            <Package className="w-16 h-16 text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t('noResults') || 'No products found'}
            </h2>
            <p className="text-gray-600 text-center max-w-md mb-6">
              {t('noResultsHelp') || `We couldn't find any products matching "${query}"`}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={clearFilters}
                className="px-6 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                {t('clearFilters') || 'Clear Filters'}
              </button>
              <Link
                href="/products"
                className="px-6 py-2 rounded-lg bg-brand-dark text-white font-medium hover:bg-brand-red transition-colors"
              >
                {t('browseAll') || 'Browse All Products'}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}