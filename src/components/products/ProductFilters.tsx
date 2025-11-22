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
import { useTranslateCategories } from '@/src/hooks/useTranslateCategories';
import type { FilterOptions } from '@/src/services/productListingService';
import type { FilterState } from '@/src/hooks/useProductFilters';

interface ProductFiltersProps {
  filterOptions?: FilterOptions;
  isLoading: boolean;
  currentFilters: FilterState;
  onPriceChange: (min?: number, max?: number) => void;
  onSizeToggle: (size: string) => void;
  onColorToggle: (color: string) => void;
  onCategoryToggle: (category: string) => void;  
  onBadgeToggle: (badge: string) => void;        
  onFeaturedToggle: (checked: boolean) => void;  
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
  onCategoryToggle,  
  onBadgeToggle,      
  onFeaturedToggle,   
  onInStockToggle,
  onSaleToggle,
  onReset,
  hasActiveFilters,
}: ProductFiltersProps) {
  const t = useTranslations('filters');

  // Translate categories
  const translatedCategories = useTranslateCategories(filterOptions?.available_categories);

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
    <div className="bg-black border border-zinc-800 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-acid-lime rounded-full animate-pulse"></div>
          <h3 className="text-white font-bold uppercase text-sm tracking-wider">{'//'}{'/'}  {t('title')}</h3>
        </div>
        {hasActiveFilters && (
          <button
            className="flex items-center gap-1 text-xs font-mono text-zinc-500 hover:text-acid-lime transition-colors uppercase"
            onClick={onReset}
          >
            <RotateCcw size={12} />
            {t('reset')}
          </button>
        )}
      </div>

      {/* Categories Filter - Using translated categories */}
      {translatedCategories && translatedCategories.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FolderOpen size={14} className="text-acid-lime" />
            <h4 className="text-white font-bold uppercase text-xs tracking-wider font-mono">{t('categories')}</h4>
          </div>

          <div className="space-y-2">
            {translatedCategories.map((category) => (
              <label key={category.slug} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={currentFilters.categories.includes(category.slug)}
                  onChange={() => onCategoryToggle(category.slug)}
                  className="w-4 h-4 bg-zinc-900 border-2 border-zinc-700 checked:bg-acid-lime checked:border-acid-lime focus:ring-2 focus:ring-acid-lime focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-zinc-200 text-sm font-mono group-hover:text-white transition-colors flex-1">
                  {category.name}
                </span>
                <span className="text-zinc-500 text-xs font-mono">({category.count})</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Badges Filter */}
      {filterOptions && filterOptions.available_badges && filterOptions.available_badges.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Award size={14} className="text-acid-lime" />
            <h4 className="text-white font-bold uppercase text-xs tracking-wider font-mono">{t('badges')}</h4>
          </div>

          <div className="flex flex-wrap gap-2">
            {filterOptions.available_badges.map((badge) => (
              <button
                key={badge}
                className={`px-3 py-1 text-xs font-bold uppercase tracking-wider transition-all ${
                  currentFilters.badges.includes(badge)
                    ? 'bg-acid-lime text-black border border-acid-lime'
                    : 'bg-zinc-900 text-zinc-200 border border-zinc-800 hover:border-acid-lime hover:text-white'
                }`}
                onClick={() => onBadgeToggle(badge)}
              >
                {badge}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Featured Filter */}
      {filterOptions && filterOptions.featured_products > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Star size={14} className="text-acid-lime" />
            <h4 className="text-white font-bold uppercase text-xs tracking-wider font-mono">{t('featured')}</h4>
          </div>

          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={currentFilters.featuredOnly}
              onChange={(e) => onFeaturedToggle(e.target.checked)}
              className="w-4 h-4 bg-zinc-900 border-2 border-zinc-700 checked:bg-acid-lime checked:border-acid-lime focus:ring-2 focus:ring-acid-lime focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-zinc-200 text-sm font-mono group-hover:text-white transition-colors flex-1">
              {t('featuredOnly')}
              <span className="text-zinc-500 text-xs ml-1">({filterOptions.featured_products})</span>
            </span>
          </label>
        </div>
      )}

      {/* Price Range Filter */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <DollarSign size={14} className="text-acid-lime" />
          <h4 className="text-white font-bold uppercase text-xs tracking-wider font-mono">{t('priceRange')}</h4>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label htmlFor="min-price" className="text-zinc-500 text-xs font-mono uppercase mb-1 block">{t('min')}</label>
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
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white font-mono text-sm focus:border-acid-lime focus:outline-none"
              />
            </div>
            <span className="text-zinc-400 pt-6">-</span>
            <div className="flex-1">
              <label htmlFor="max-price" className="text-zinc-500 text-xs font-mono uppercase mb-1 block">{t('max')}</label>
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
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white font-mono text-sm focus:border-acid-lime focus:outline-none"
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
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Palette size={14} className="text-acid-lime" />
            <h4 className="text-white font-bold uppercase text-xs tracking-wider font-mono">{t('colors')}</h4>
          </div>

          <div className="flex flex-wrap gap-2">
            {filterOptions.available_colors.map(({ color, hex, count }) => (
              <button
                key={color}
                className={`
                  w-10 h-10 rounded-full border-2 transition-all relative
                  ${currentFilters.colors.includes(color)
                    ? 'border-acid-lime shadow-lg shadow-acid-lime/20 scale-110'
                    : 'border-zinc-700 hover:border-zinc-500'
                  }
                  ${isLightColor(hex) ? 'shadow-inner' : ''}
                `}
                style={{ backgroundColor: hex }}
                onClick={() => onColorToggle(color)}
                title={`${color} (${count})`}
                aria-label={`${color} (${count} products)`}
              >
                {currentFilters.colors.includes(color) && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 12 12"
                    fill="none"
                    className={`absolute inset-0 m-auto ${isLightColor(hex) ? 'text-black' : 'text-white'}`}
                  >
                    <path
                      d="M10 3L4.5 8.5L2 6"
                      stroke="currentColor"
                      strokeWidth="2.5"
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
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Ruler size={14} className="text-acid-lime" />
            <h4 className="text-white font-bold uppercase text-xs tracking-wider font-mono">{t('sizes')}</h4>
          </div>

          <div className="flex flex-wrap gap-2">
            {filterOptions.available_sizes.map((size) => (
              <button
                key={size}
                className={`
                  px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border
                  ${currentFilters.sizes.includes(size)
                    ? 'bg-acid-lime text-black border-acid-lime'
                    : 'bg-zinc-900 text-zinc-200 border-zinc-800 hover:border-acid-lime hover:text-white'
                  }
                `}
                onClick={() => onSizeToggle(size)}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Availability Filter */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Package size={14} className="text-acid-lime" />
          <h4 className="text-white font-bold uppercase text-xs tracking-wider font-mono">{t('availability')}</h4>
        </div>

        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={currentFilters.inStockOnly}
            onChange={(e) => onInStockToggle(e.target.checked)}
            className="w-4 h-4 bg-zinc-900 border-2 border-zinc-700 checked:bg-acid-lime checked:border-acid-lime focus:ring-2 focus:ring-acid-lime focus:ring-offset-0 cursor-pointer"
          />
          <span className="text-zinc-200 text-sm font-mono group-hover:text-white transition-colors">
            {t('inStockOnly')}
          </span>
        </label>
      </div>

      {/* Sale Filter */}
      {filterOptions && filterOptions.products_on_sale > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Tag size={14} className="text-acid-lime" />
            <h4 className="text-white font-bold uppercase text-xs tracking-wider font-mono">{t('sale')}</h4>
          </div>

          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={currentFilters.onSaleOnly}
              onChange={(e) => onSaleToggle(e.target.checked)}
              className="w-4 h-4 bg-zinc-900 border-2 border-zinc-700 checked:bg-acid-lime checked:border-acid-lime focus:ring-2 focus:ring-acid-lime focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-zinc-200 text-sm font-mono group-hover:text-white transition-colors flex-1">
              {t('onSaleOnly')}
              <span className="text-zinc-400 text-xs ml-1">({filterOptions.products_on_sale})</span>
            </span>
          </label>
        </div>
      )}
    </div>
  );
}