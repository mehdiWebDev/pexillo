// src/components/products/ProductFilters.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { 
  DollarSign, 
  Palette, 
  Ruler, 
  Package, 
  Tag, 
  RotateCcw,
  FolderOpen,
  Award,
  Star
} from 'lucide-react';
import type { FilterOptions } from '@/src/services/productListingService';
import type { FilterState } from '@/src/hooks/useProductFilters';

interface ProductFiltersProps {
  filterOptions?: FilterOptions;
  isLoading: boolean;
  currentFilters: FilterState;
  onPriceChange: (min?: number, max?: number) => void;
  onSizeToggle: (size: string) => void;
  onColorToggle: (color: string) => void;
  onCategoryToggle: (category: string) => void;  // NEW
  onBadgeToggle: (badge: string) => void;        // NEW
  onFeaturedToggle: (checked: boolean) => void;  // NEW
  onInStockToggle: (checked: boolean) => void;
  onSaleToggle: (checked: boolean) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
}

export default function ProductFilters({
  filterOptions,
  isLoading,
  currentFilters,
  onPriceChange,
  onSizeToggle,
  onColorToggle,
  onCategoryToggle,  // NEW
  onBadgeToggle,      // NEW
  onFeaturedToggle,   // NEW
  onInStockToggle,
  onSaleToggle,
  onReset,
  hasActiveFilters,
}: ProductFiltersProps) {
  const t = useTranslations('filters');

  // Local state for price slider (updates in real-time before debounce)
  const [localMinPrice, setLocalMinPrice] = useState<number>(currentFilters.minPrice || 0);
  const [localMaxPrice, setLocalMaxPrice] = useState<number>(
    currentFilters.maxPrice || filterOptions?.max_price || 1000
  );

  // Update local state when filter options load
  useEffect(() => {
    if (filterOptions) {
      if (!currentFilters.minPrice) setLocalMinPrice(filterOptions.min_price);
      if (!currentFilters.maxPrice) setLocalMaxPrice(filterOptions.max_price);
    }
  }, [filterOptions, currentFilters]);

  // Handle price change with debounce
  const handlePriceChange = (min: number, max: number) => {
    setLocalMinPrice(min);
    setLocalMaxPrice(max);
    onPriceChange(
      min === filterOptions?.min_price ? undefined : min,
      max === filterOptions?.max_price ? undefined : max
    );
  };

  // Check if color is light (for border)
  const isLightColor = (hex: string) => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luma > 200;
  };

  // Badge color mapping
  const getBadgeColor = (badge: string) => {
    switch(badge) {
      case 'NEW': return '#10B981'; // green
      case 'HOT': return '#EF4444'; // red
      case 'SALE': return '#F59E0B'; // amber
      case 'LIMITED': return '#8B5CF6'; // purple
      default: return '#6B7280'; // gray
    }
  };

  if (isLoading) {
    return (
      <div className="product-filters">
        <div className="product-filters__header">
          <div className="skeleton skeleton--text" style={{ width: '100px' }} />
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="product-filters__section">
            <div className="skeleton skeleton--text" style={{ width: '80px', marginBottom: '12px' }} />
            <div className="skeleton skeleton--text" style={{ width: '100%', height: '40px' }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="product-filters">
      {/* Header */}
      <div className="product-filters__header">
        <h3 className="product-filters__title">{t('title')}</h3>
        {hasActiveFilters && (
          <button className="product-filters__reset" onClick={onReset}>
            <RotateCcw size={16} />
            {t('reset')}
          </button>
        )}
      </div>

      {/* NEW: Categories Filter */}
      {filterOptions && filterOptions.available_categories && filterOptions.available_categories.length > 0 && (
        <div className="product-filters__section">
          <div className="product-filters__section-header">
            <FolderOpen size={16} />
            <h4>{t('categories')}</h4>
          </div>

          <div className="category-filter">
            {filterOptions.available_categories.map(({ slug, name, count }) => (
              <label key={slug} className="checkbox-filter">
                <input
                  type="checkbox"
                  checked={currentFilters.categories.includes(slug)}
                  onChange={() => onCategoryToggle(slug)}
                />
                <span className="checkbox-filter__label">
                  {name} 
                  <span className="checkbox-filter__count">({count})</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* NEW: Badges Filter */}
      {filterOptions && filterOptions.available_badges && filterOptions.available_badges.length > 0 && (
        <div className="product-filters__section">
          <div className="product-filters__section-header">
            <Award size={16} />
            <h4>{t('badges')}</h4>
          </div>

          <div className="badge-filter">
            {filterOptions.available_badges.map((badge) => (
              <button
                key={badge}
                className={`badge-filter__option ${
                  currentFilters.badges.includes(badge) ? 'badge-filter__option--active' : ''
                }`}
                style={{
                  '--badge-color': getBadgeColor(badge),
                  borderColor: currentFilters.badges.includes(badge) ? getBadgeColor(badge) : undefined,
                  backgroundColor: currentFilters.badges.includes(badge) ? `${getBadgeColor(badge)}15` : undefined
                } as React.CSSProperties}
                onClick={() => onBadgeToggle(badge)}
              >
                {badge}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* NEW: Featured Filter */}
      {filterOptions && filterOptions.featured_products > 0 && (
        <div className="product-filters__section">
          <div className="product-filters__section-header">
            <Star size={16} />
            <h4>{t('featured')}</h4>
          </div>

          <label className="checkbox-filter">
            <input
              type="checkbox"
              checked={currentFilters.featuredOnly}
              onChange={(e) => onFeaturedToggle(e.target.checked)}
            />
            <span className="checkbox-filter__label">
              {t('featuredOnly')} 
              <span className="checkbox-filter__count">({filterOptions.featured_products})</span>
            </span>
          </label>
        </div>
      )}

      {/* Price Range Filter */}
      <div className="product-filters__section">
        <div className="product-filters__section-header">
          <DollarSign size={16} />
          <h4>{t('priceRange')}</h4>
        </div>

        <div className="price-filter">
          <div className="price-filter__inputs">
            <div className="price-filter__input-group">
              <label htmlFor="min-price">{t('min')}</label>
              <input
                id="min-price"
                type="number"
                min={filterOptions?.min_price || 0}
                max={localMaxPrice}
                value={localMinPrice}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value)) {
                    handlePriceChange(value, localMaxPrice);
                  }
                }}
                className="price-filter__input"
              />
            </div>
            <span className="price-filter__separator">-</span>
            <div className="price-filter__input-group">
              <label htmlFor="max-price">{t('max')}</label>
              <input
                id="max-price"
                type="number"
                min={localMinPrice}
                max={filterOptions?.max_price || 1000}
                value={localMaxPrice}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value)) {
                    handlePriceChange(localMinPrice, value);
                  }
                }}
                className="price-filter__input"
              />
            </div>
          </div>

          {/* Price Range Slider */}
          <div className="price-filter__slider">
            <input
              type="range"
              min={filterOptions?.min_price || 0}
              max={filterOptions?.max_price || 1000}
              value={localMinPrice}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (value < localMaxPrice) {
                  handlePriceChange(value, localMaxPrice);
                }
              }}
              className="price-filter__range price-filter__range--min"
            />
            <input
              type="range"
              min={filterOptions?.min_price || 0}
              max={filterOptions?.max_price || 1000}
              value={localMaxPrice}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (value > localMinPrice) {
                  handlePriceChange(localMinPrice, value);
                }
              }}
              className="price-filter__range price-filter__range--max"
            />
          </div>
        </div>
      </div>

      {/* Colors Filter */}
      {filterOptions && filterOptions.available_colors && filterOptions.available_colors.length > 0 && (
        <div className="product-filters__section">
          <div className="product-filters__section-header">
            <Palette size={16} />
            <h4>{t('colors')}</h4>
          </div>

          <div className="color-filter">
            {filterOptions.available_colors.map(({ color, hex, count }) => (
              <button
                key={color}
                className={`color-filter__swatch ${
                  currentFilters.colors.includes(color) ? 'color-filter__swatch--active' : ''
                } ${isLightColor(hex) ? 'color-filter__swatch--light' : ''}`}
                style={{ backgroundColor: hex }}
                onClick={() => onColorToggle(color)}
                title={`${color} (${count})`}
                aria-label={`${color} (${count} products)`}
              >
                {currentFilters.colors.includes(color) && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M10 3L4.5 8.5L2 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sizes Filter */}
      {filterOptions && filterOptions.available_sizes && filterOptions.available_sizes.length > 0 && (
        <div className="product-filters__section">
          <div className="product-filters__section-header">
            <Ruler size={16} />
            <h4>{t('sizes')}</h4>
          </div>

          <div className="size-filter">
            {filterOptions.available_sizes.map((size) => (
              <button
                key={size}
                className={`size-filter__option ${
                  currentFilters.sizes.includes(size) ? 'size-filter__option--active' : ''
                }`}
                onClick={() => onSizeToggle(size)}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Availability Filter */}
      <div className="product-filters__section">
        <div className="product-filters__section-header">
          <Package size={16} />
          <h4>{t('availability')}</h4>
        </div>

        <label className="checkbox-filter">
          <input
            type="checkbox"
            checked={currentFilters.inStockOnly}
            onChange={(e) => onInStockToggle(e.target.checked)}
          />
          <span className="checkbox-filter__label">{t('inStockOnly')}</span>
        </label>
      </div>

      {/* Sale Filter */}
      {filterOptions && filterOptions.products_on_sale > 0 && (
        <div className="product-filters__section">
          <div className="product-filters__section-header">
            <Tag size={16} />
            <h4>{t('sale')}</h4>
          </div>

          <label className="checkbox-filter">
            <input
              type="checkbox"
              checked={currentFilters.onSaleOnly}
              onChange={(e) => onSaleToggle(e.target.checked)}
            />
            <span className="checkbox-filter__label">
              {t('onSaleOnly')} 
              <span className="checkbox-filter__count">({filterOptions.products_on_sale})</span>
            </span>
          </label>
        </div>
      )}
    </div>
  );
}