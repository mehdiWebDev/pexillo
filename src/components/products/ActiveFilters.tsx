// src/components/products/ActiveFilters.tsx
'use client';

import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import type { FilterState } from '@/src/hooks/useProductFilters';
import type { FilterOptions } from '@/src/services/productListingService';

interface ActiveFiltersProps {
  filters: FilterState;
  filterOptions?: FilterOptions;
  onRemoveFilter: (filterType: keyof FilterState | 'priceRange', value?: string) => void;
  onResetAll: () => void;
}

export default function ActiveFilters({
  filters,
  filterOptions,
  onRemoveFilter,
  onResetAll,
}: ActiveFiltersProps) {
  const t = useTranslations('activeFilters');

  // Get color hex for display
  const getColorHex = (colorName: string): string => {
    const color = filterOptions?.available_colors?.find((c) => c.color === colorName);
    return color?.hex || '#000000';
  };

  // Get category name from ID (optimized to use UUIDs)
  const getCategoryName = (categoryId: string): string => {
    const category = filterOptions?.available_categories?.find((c) => c.id === categoryId);
    return category?.name || 'Unknown';
  };

  // Badge color mapping
  const getBadgeColor = (badge: string) => {
    switch(badge) {
      case 'NEW': return '#10B981';
      case 'HOT': return '#EF4444';
      case 'SALE': return '#F59E0B';
      case 'LIMITED': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg flex-wrap">
      <div className="flex flex-wrap gap-2 flex-1">
        {/* Price Range */}
        {(filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
          <div className="flex items-center gap-2 px-3 py-1.5 pr-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700">
            <span>
              {t('price')}: ${filters.minPrice || filterOptions?.min_price || 0} - $
              {filters.maxPrice || filterOptions?.max_price || 1000}
            </span>
            <button
              onClick={() => onRemoveFilter('priceRange')}
              aria-label={t('remove')}
              className="flex items-center justify-center w-4.5 h-4.5 bg-gray-100 rounded text-gray-600 hover:bg-gray-200 hover:text-black transition-all"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Categories */}
        {filters.categories.map((category) => (
          <div key={category} className="flex items-center gap-2 px-3 py-1.5 pr-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700">
            <span>
              {t('category')}: {getCategoryName(category)}
            </span>
            <button onClick={() => onRemoveFilter('categories', category)} aria-label={t('remove')} className="flex items-center justify-center w-4.5 h-4.5 bg-gray-100 rounded text-gray-600 hover:bg-gray-200 hover:text-black transition-all">
              <X size={14} />
            </button>
          </div>
        ))}

        {/* Badges */}
        {filters.badges.map((badge) => (
          <div
            key={badge}
            className="flex items-center gap-2 px-3 py-1.5 pr-2 rounded-md text-sm font-semibold uppercase tracking-wide text-xs border-2"
            style={{
              borderColor: getBadgeColor(badge),
              backgroundColor: `${getBadgeColor(badge)}15`
            }}
          >
            <span>{badge}</span>
            <button onClick={() => onRemoveFilter('badges', badge)} aria-label={t('remove')} className="flex items-center justify-center w-4.5 h-4.5 bg-white/50 rounded text-gray-700 hover:bg-white transition-all">
              <X size={14} />
            </button>
          </div>
        ))}

        {/* Colors */}
        {filters.colors.map((color) => (
          <div key={color} className="flex items-center gap-2 px-3 py-1.5 pr-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700">
            <span
              className="w-3.5 h-3.5 rounded-full border border-gray-200"
              style={{ backgroundColor: getColorHex(color) }}
            />
            <span>{color}</span>
            <button onClick={() => onRemoveFilter('colors', color)} aria-label={t('remove')} className="flex items-center justify-center w-4.5 h-4.5 bg-gray-100 rounded text-gray-600 hover:bg-gray-200 hover:text-black transition-all">
              <X size={14} />
            </button>
          </div>
        ))}

        {/* Sizes */}
        {filters.sizes.map((size) => (
          <div key={size} className="flex items-center gap-2 px-3 py-1.5 pr-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700">
            <span>
              {t('size')}: {size}
            </span>
            <button onClick={() => onRemoveFilter('sizes', size)} aria-label={t('remove')} className="flex items-center justify-center w-4.5 h-4.5 bg-gray-100 rounded text-gray-600 hover:bg-gray-200 hover:text-black transition-all">
              <X size={14} />
            </button>
          </div>
        ))}

        {/* Featured Only */}
        {filters.featuredOnly && (
          <div className="flex items-center gap-2 px-3 py-1.5 pr-2 bg-gradient-to-r from-yellow-100 to-amber-100 border border-amber-400 rounded-md text-sm text-amber-900">
            <span>⭐ {t('featuredOnly')}</span>
            <button onClick={() => onRemoveFilter('featuredOnly')} aria-label={t('remove')} className="flex items-center justify-center w-4.5 h-4.5 bg-white/70 rounded text-amber-800 hover:bg-white transition-all">
              <X size={14} />
            </button>
          </div>
        )}

        {/* In Stock Only */}
        {filters.inStockOnly && (
          <div className="flex items-center gap-2 px-3 py-1.5 pr-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700">
            <span>{t('inStockOnly')}</span>
            <button onClick={() => onRemoveFilter('inStockOnly')} aria-label={t('remove')} className="flex items-center justify-center w-4.5 h-4.5 bg-gray-100 rounded text-gray-600 hover:bg-gray-200 hover:text-black transition-all">
              <X size={14} />
            </button>
          </div>
        )}

        {/* On Sale Only */}
        {filters.onSaleOnly && (
          <div className="flex items-center gap-2 px-3 py-1.5 pr-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700">
            <span>{t('onSaleOnly')}</span>
            <button onClick={() => onRemoveFilter('onSaleOnly')} aria-label={t('remove')} className="flex items-center justify-center w-4.5 h-4.5 bg-gray-100 rounded text-gray-600 hover:bg-gray-200 hover:text-black transition-all">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Clear All Button */}
      <button
        className="text-sm text-gray-600 bg-white border border-gray-300 px-3.5 py-1.5 rounded-md hover:bg-black hover:border-black hover:text-white transition-all whitespace-nowrap w-full sm:w-auto"
        onClick={onResetAll}
      >
        {t('clearAll')}
      </button>
    </div>
  );
}