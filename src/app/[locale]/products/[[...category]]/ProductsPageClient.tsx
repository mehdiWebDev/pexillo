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
    categoryFilter: filters.categories.length > 0 ? filters.categories : undefined,
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
    <div className="bg-black min-h-screen">
      {/* Hero Section */}
      <ProductsHero categoryInfo={categoryInfo} categorySlug={categorySlug} />

      {/* Main Content */}
      <div className="container mx-auto px-4 lg:px-8 py-8">
        {/* Mobile Filter Button */}
        <button
          className="lg:hidden flex items-center gap-2 w-full px-6 py-3 mb-6 bg-zinc-900 border border-zinc-800 text-white font-bold uppercase text-sm tracking-wider hover:border-acid-lime transition-all"
          onClick={() => setMobileFiltersOpen(true)}
        >
          <Filter size={20} className="text-acid-lime" />
          {t('filters')}
          {hasActiveFilters && (
            <span className="ml-auto px-2 py-1 bg-acid-lime text-black text-xs font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>

        <div className="flex gap-8">
          {/* Sidebar Filters */}
          <aside
            className={`lg:w-80 lg:block ${
              mobileFiltersOpen ? 'fixed inset-0 z-50 bg-black p-4 overflow-y-auto' : 'hidden'
            }`}
          >
            {/* Mobile Close Button */}
            <button
              className="lg:hidden absolute top-4 right-4 p-2 text-white hover:text-acid-lime"
              onClick={() => setMobileFiltersOpen(false)}
            >
              <X size={24} />
            </button>

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
          </aside>

          {/* Main Products Area */}
          <main className="flex-1">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-zinc-800">
              {/* Product Count */}
              <div className="flex items-center gap-2">
                {productsLoading ? (
                  <div className="h-4 w-32 bg-zinc-900 animate-pulse"></div>
                ) : (
                  <p className="text-zinc-400 font-mono text-sm">
                    {t('showing')} <span className="text-white font-bold">{translatedProducts.length}</span> {t('of')}{' '}
                    <span className="text-white font-bold">{totalCount}</span> {t('products')}
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
          className="products-page__overlay"
          onClick={() => setMobileFiltersOpen(false)}
        />
      )}
    </div>
  );
}