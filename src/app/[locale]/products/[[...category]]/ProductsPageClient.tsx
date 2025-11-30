// app/[locale]/products/[[...category]]/ProductsPageClient.tsx
'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import ProductsHero from '@/src/components/products/ProductsHero';
import ProductFilters from '@/src/components/products/ProductFilters';
import ProductsGrid from '@/src/components/products/ProductsGrid';
import ProductSort from '@/src/components/products/ProductSort';
import ActiveFilters from '@/src/components/products/ActiveFilters';
import { useProductFilters } from '@/src/hooks/useProductFilters';
import { useProductsEnhanced, useFilterOptions, useCategoryInfo } from '@/src/hooks/useProductsQuery';
import { Filter, X } from 'lucide-react';
import type { ProductVariant } from '@/src/services/productListingService';

// =============================================
// CLIENT COMPONENT
// =============================================

interface ProductsPageClientProps {
  categorySlug?: string;
}

export default function ProductsPageClient({ categorySlug }: ProductsPageClientProps) {
  const t = useTranslations('productsPage');
  const locale = useLocale();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Filter state management - All filter logic is handled here
  const {
    filters,
    debouncedMinPrice,
    debouncedMaxPrice,
    updateFilters,
    resetFilters,
    toggleSize,
    toggleColor,
    toggleCategory,
    toggleBadge,
    removeFilter,
    hasActiveFilters,
  } = useProductFilters();

  // Fetch filter options (available categories, badges, colors, sizes, etc.)
  const { data: filterOptions, isLoading: filtersLoading } = useFilterOptions(categorySlug);
  
  // Fetch category info for hero section
  const { data: categoryInfo } = useCategoryInfo(categorySlug);
  
  // Fetch products using all filters
  // This is where get_products_enhanced is triggered!
  const { data: productsData, isLoading: productsLoading } = useProductsEnhanced({
    categorySlug,
    // Price filters (debounced for performance)
    minPrice: debouncedMinPrice,
    maxPrice: debouncedMaxPrice,
    // Multi-select filters
    sizeFilter: filters.sizes.length > 0 ? filters.sizes : undefined,
    colorFilter: filters.colors.length > 0 ? filters.colors : undefined,
    categoryIdFilter: filters.categories.length > 0 ? filters.categories : undefined, // OPTIMIZED: Using UUIDs
    badgeFilter: filters.badges.length > 0 ? filters.badges : undefined,
    // Toggle filters
    featuredOnly: filters.featuredOnly,
    inStockOnly: filters.inStockOnly,
    onSaleOnly: filters.onSaleOnly,
    // Sorting
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    // Pagination
    page: filters.page,
    limit: 12,
  });

  const products = productsData?.products || [];
  const totalCount = productsData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / 12);
  
  // Apply translations inline - no hooks, no infinite loops!
  const translatedProducts = locale === 'en' ? products : products.map(product => {
    const trans = product.translations?.[locale] || {};
    return {
      ...product,
      // Apply JSONB translations
      name: trans.name || product.name,
      short_description: trans.short_description || product.short_description,
      badge: trans.badge || product.badge,
      material: trans.material || product.material,
      care_instructions: trans.care_instructions || product.care_instructions,
      tags: trans.tags || product.tags,
      // Keep original values for rich content (description, meta fields)
      // These would need separate handling from translations table if needed
      description: product.description,
      meta_title: product.meta_title,
      meta_description: product.meta_description,
      // Translate variants
      variants: product.variants?.map((v: ProductVariant) => ({
        ...v,
        color_translated: v.translations?.[locale]?.color || v.color,
        size_label: v.translations?.[locale]?.size_label || v.size,
      })) || [],
    };
  });

  // Count active filters for mobile badge
  const activeFilterCount = [
    filters.minPrice && 1,
    filters.maxPrice && 1,
    filters.sizes.length,
    filters.colors.length,
    filters.categories.length,
    filters.badges.length,
    filters.featuredOnly && 1,
    filters.inStockOnly && 1,
    filters.onSaleOnly && 1,
  ].filter(Boolean).reduce((a, b) => (a as number) + (b as number), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <ProductsHero categoryInfo={categoryInfo} categorySlug={categorySlug} />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Mobile Filter Button */}
        <button
          className="lg:hidden w-full flex items-center justify-center gap-2 px-4 py-3.5 mb-6 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-all relative"
          onClick={() => setMobileFiltersOpen(true)}
        >
          <Filter size={20} />
          {t('filters')}
          {hasActiveFilters && (
            <span className="absolute -top-1.5 -right-1.5 bg-black text-white text-xs px-2 py-0.5 rounded-full min-w-[20px] text-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[256px_1fr] gap-12">
          {/* Sidebar Filters */}
          <aside
            className={`
              fixed lg:sticky top-0 lg:top-6 left-0 w-[85%] max-w-[320px] lg:w-auto lg:max-w-none
              h-screen lg:h-fit max-h-screen lg:max-h-[calc(100vh-6rem)]
              bg-white lg:bg-transparent z-[1000] lg:z-auto
              transition-transform duration-300 lg:transition-none
              overflow-y-auto scrollbar-none
              shadow-xl lg:shadow-none
              ${mobileFiltersOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}
          >
            {/* Mobile Close Button */}
            <div className="lg:hidden sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-black text-black uppercase tracking-wide">{t('filters')}</h3>
              <button
                className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-md text-gray-600 hover:bg-gray-200 hover:text-black transition-all"
                onClick={() => setMobileFiltersOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 lg:px-0">
              <ProductFilters
                filterOptions={filterOptions}
                isLoading={filtersLoading}
                currentFilters={filters}
                // Price callbacks
                onPriceChange={(min, max) => updateFilters({ minPrice: min, maxPrice: max })}
                // Multi-select callbacks
                onSizeToggle={toggleSize}
                onColorToggle={toggleColor}
                onCategoryToggle={toggleCategory}
                onBadgeToggle={toggleBadge}
                // Toggle callbacks
                onFeaturedToggle={(checked) => updateFilters({ featuredOnly: checked })}
                onInStockToggle={(checked) => updateFilters({ inStockOnly: checked })}
                onSaleToggle={(checked) => updateFilters({ onSaleOnly: checked })}
                // Reset
                onReset={resetFilters}
                hasActiveFilters={hasActiveFilters}
              />
            </div>
          </aside>

          {/* Main Products Area */}
          <main className="flex-1">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-200">
              {/* Product Count */}
              <div className="text-sm text-gray-600">
                {productsLoading ? (
                  <div className="h-4 w-[150px] bg-gray-200 rounded animate-pulse" />
                ) : (
                  <p>
                    {t('showing')} <strong className="text-black font-semibold">{translatedProducts.length}</strong> {t('of')}{' '}
                    <strong className="text-black font-semibold">{totalCount}</strong> {t('products')}
                  </p>
                )}
              </div>

              {/* Sort Dropdown */}
              <ProductSort
                sortBy={filters.sortBy}
                sortOrder={filters.sortOrder}
                onSortChange={(sortBy, sortOrder) => updateFilters({ sortBy, sortOrder, page: 1 })}
              />
            </div>

            {/* Active Filters (chips showing what's selected) */}
            {hasActiveFilters && (
              <ActiveFilters
                filters={filters}
                filterOptions={filterOptions}
                onRemoveFilter={removeFilter}
                onResetAll={resetFilters}
              />
            )}

            {/* Products Grid */}
            <ProductsGrid
              products={translatedProducts}
              isLoading={productsLoading}
              currentPage={filters.page}
              totalPages={totalPages}
              onPageChange={(page) => updateFilters({ page })}
            />
          </main>
        </div>
      </div>

      {/* Mobile Filter Overlay */}
      {mobileFiltersOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[999] lg:hidden"
          onClick={() => setMobileFiltersOpen(false)}
        />
      )}
    </div>
  );
}