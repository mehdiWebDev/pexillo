// src/components/products/ActiveFilters.tsx
'use client';

import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import type { FilterState } from '@/src/hooks/useProductFilters';
import type { FilterOptions } from '@/src/services/productListingService';

interface ActiveFiltersProps {
  filters: FilterState;
  filterOptions?: FilterOptions;
  onRemoveFilter: (filterType: keyof FilterState, value?: string) => void;
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

  // Get category name from slug
  const getCategoryName = (slug: string): string => {
    const category = filterOptions?.available_categories?.find((c) => c.slug === slug);
    return category?.name || slug;
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
    <div className="active-filters">
      <div className="active-filters__chips">
        {/* Price Range */}
        {(filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
          <div className="filter-chip">
            <span>
              {t('price')}: ${filters.minPrice || filterOptions?.min_price || 0} - $
              {filters.maxPrice || filterOptions?.max_price || 1000}
            </span>
            <button
              onClick={() => {
                onRemoveFilter('minPrice');
                onRemoveFilter('maxPrice');
              }}
              aria-label={t('remove')}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* NEW: Categories */}
        {filters.categories.map((category) => (
          <div key={category} className="filter-chip">
            <span>
              {t('category')}: {getCategoryName(category)}
            </span>
            <button onClick={() => onRemoveFilter('categories', category)} aria-label={t('remove')}>
              <X size={14} />
            </button>
          </div>
        ))}

        {/* NEW: Badges */}
        {filters.badges.map((badge) => (
          <div 
            key={badge} 
            className="filter-chip filter-chip--badge"
            style={{
              '--badge-color': getBadgeColor(badge),
              borderColor: getBadgeColor(badge),
              backgroundColor: `${getBadgeColor(badge)}15`
            } as React.CSSProperties}
          >
            <span>{badge}</span>
            <button onClick={() => onRemoveFilter('badges', badge)} aria-label={t('remove')}>
              <X size={14} />
            </button>
          </div>
        ))}

        {/* Colors */}
        {filters.colors.map((color) => (
          <div key={color} className="filter-chip filter-chip--color">
            <span
              className="filter-chip__color-dot"
              style={{ backgroundColor: getColorHex(color) }}
            />
            <span>{color}</span>
            <button onClick={() => onRemoveFilter('colors', color)} aria-label={t('remove')}>
              <X size={14} />
            </button>
          </div>
        ))}

        {/* Sizes */}
        {filters.sizes.map((size) => (
          <div key={size} className="filter-chip">
            <span>
              {t('size')}: {size}
            </span>
            <button onClick={() => onRemoveFilter('sizes', size)} aria-label={t('remove')}>
              <X size={14} />
            </button>
          </div>
        ))}

        {/* NEW: Featured Only */}
        {filters.featuredOnly && (
          <div className="filter-chip filter-chip--featured">
            <span>⭐ {t('featuredOnly')}</span>
            <button onClick={() => onRemoveFilter('featuredOnly')} aria-label={t('remove')}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* In Stock Only */}
        {filters.inStockOnly && (
          <div className="filter-chip">
            <span>{t('inStockOnly')}</span>
            <button onClick={() => onRemoveFilter('inStockOnly')} aria-label={t('remove')}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* On Sale Only */}
        {filters.onSaleOnly && (
          <div className="filter-chip">
            <span>{t('onSaleOnly')}</span>
            <button onClick={() => onRemoveFilter('onSaleOnly')} aria-label={t('remove')}>
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Clear All Button */}
      <button className="active-filters__clear-all" onClick={onResetAll}>
        {t('clearAll')}
      </button>
    </div>
  );
}