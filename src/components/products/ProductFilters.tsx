// src/components/products/ProductFilters.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  RotateCcw
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
      <div className="bg-transparent">
        <div className="flex items-center justify-between mb-8">
          <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="mb-8 pb-8 border-b border-gray-200">
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-3" />
            <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-transparent">
      {/* Header - Hidden on mobile (shown in drawer header) */}
      <div className="hidden lg:flex items-center justify-between mb-8">
        <h3 className="text-lg font-black text-black uppercase tracking-wide">{t('title')}</h3>
        {hasActiveFilters && (
          <button
            className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 hover:text-black px-3.5 py-2 rounded-lg transition-all uppercase tracking-wider"
            onClick={onReset}
          >
            <RotateCcw size={16} />
            {t('reset')}
          </button>
        )}
      </div>

      {/* Mobile Reset Button */}
      {hasActiveFilters && (
        <div className="lg:hidden mb-4 pt-4">
          <button
            className="w-full flex items-center justify-center gap-2 text-sm font-bold text-gray-600 hover:bg-gray-100 hover:text-black px-4 py-2.5 rounded-lg transition-all uppercase tracking-wider"
            onClick={onReset}
          >
            <RotateCcw size={16} />
            {t('reset')}
          </button>
        </div>
      )}

      {/* Categories Filter - Using translated categories */}
      {translatedCategories && translatedCategories.length > 0 && (
        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <h4 className="text-base font-black text-black uppercase tracking-wider">{t('categories')}</h4>
          </div>

          <div className="flex flex-col gap-2">
            {translatedCategories.map((category) => (
              <label key={category.slug} className="flex items-center gap-3 cursor-pointer py-2 font-medium text-gray-700 hover:text-black transition-colors">
                <input
                  type="checkbox"
                  checked={currentFilters.categories.includes(category.slug)}
                  onChange={() => onCategoryToggle(category.slug)}
                  className="w-5 h-5 cursor-pointer accent-black border-2 border-gray-300 rounded"
                />
                <span className="flex-1 select-none font-medium">
                  {category.name}
                  <span className="text-gray-400 text-[13px] ml-1">({category.count})</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Badges Filter */}
      {filterOptions && filterOptions.available_badges && filterOptions.available_badges.length > 0 && (
        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <h4 className="text-base font-black text-black uppercase tracking-wider">{t('badges')}</h4>
          </div>

          <div className="flex flex-wrap gap-2">
            {filterOptions.available_badges.map((badge) => (
              <button
                key={badge}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-full border-2 transition-all ${
                  currentFilters.badges.includes(badge)
                    ? 'text-white'
                    : 'border-gray-200 text-gray-700 hover:border-black'
                }`}
                style={{
                  borderColor: currentFilters.badges.includes(badge) ? getBadgeColor(badge) : undefined,
                  backgroundColor: currentFilters.badges.includes(badge) ? getBadgeColor(badge) : undefined
                }}
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
        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <h4 className="text-base font-black text-black uppercase tracking-wider">{t('featured')}</h4>
          </div>

          <label className="flex items-center gap-3 cursor-pointer py-2 font-medium text-gray-700 hover:text-black transition-colors">
            <input
              type="checkbox"
              checked={currentFilters.featuredOnly}
              onChange={(e) => onFeaturedToggle(e.target.checked)}
              className="w-5 h-5 cursor-pointer accent-black border-2 border-gray-300 rounded"
            />
            <span className="flex-1 select-none font-medium">
              {t('featuredOnly')}
              <span className="text-gray-400 text-[13px] ml-1">({filterOptions.featured_products})</span>
            </span>
          </label>
        </div>
      )}

      {/* Price Range Filter */}
      <div className="mb-8 pb-8 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <h4 className="text-base font-black text-black uppercase tracking-wider">{t('priceRange')}</h4>
        </div>

        <div>
          <div className="flex items-end gap-2 mb-4">
            <div className="flex-1">
              <input
                id="min-price"
                type="number"
                placeholder={t('min')}
                min={filterOptions?.min_price || 0}
                max={localMaxPrice}
                value={localMinPrice}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value)) {
                    handlePriceChange(value, localMaxPrice);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold bg-gray-50 text-black placeholder:text-gray-400 placeholder:font-medium focus:outline-none focus:border-black focus:bg-white transition-all"
              />
            </div>
            <span className="font-bold text-gray-400 pb-2">-</span>
            <div className="flex-1">
              <input
                id="max-price"
                type="number"
                placeholder={t('max')}
                min={localMinPrice}
                max={filterOptions?.max_price || 1000}
                value={localMaxPrice}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value)) {
                    handlePriceChange(localMinPrice, value);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold bg-gray-50 text-black placeholder:text-gray-400 placeholder:font-medium focus:outline-none focus:border-black focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Price Range Slider */}
          <div className="relative h-1.5 mt-4">
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
              className="absolute w-full h-1.5 bg-transparent pointer-events-none appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4.5 [&::-webkit-slider-thumb]:h-4.5 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md"
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
              className="absolute w-full h-1.5 bg-transparent pointer-events-none appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4.5 [&::-webkit-slider-thumb]:h-4.5 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md"
            />
          </div>
        </div>
      </div>

      {/* Colors Filter */}
      {filterOptions && filterOptions.available_colors && filterOptions.available_colors.length > 0 && (
        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <h4 className="text-base font-black text-black uppercase tracking-wider">{t('colors')}</h4>
          </div>

          <div className="grid grid-cols-6 gap-2">
            {filterOptions.available_colors.map(({ color, hex, count }) => (
              <button
                key={color}
                className={`w-8 h-8 rounded-full border transition-all flex items-center justify-center ${
                  currentFilters.colors.includes(color)
                    ? 'ring-2 ring-offset-2 ring-black border-transparent shadow-md'
                    : isLightColor(hex)
                    ? 'border-gray-300 hover:border-black'
                    : 'border-gray-200 hover:border-black'
                } hover:scale-110`}
                style={{ backgroundColor: hex }}
                onClick={() => onColorToggle(color)}
                title={`${color} (${count})`}
                aria-label={`${color} (${count} products)`}
              >
                {currentFilters.colors.includes(color) && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={isLightColor(hex) ? 'text-black' : 'text-white'} style={{ filter: isLightColor(hex) ? 'none' : 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>
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
        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <h4 className="text-base font-black text-black uppercase tracking-wider">{t('sizes')}</h4>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {filterOptions.available_sizes.map((size) => (
              <button
                key={size}
                className={`h-10 flex items-center justify-center border rounded-lg text-sm font-bold transition-all ${
                  currentFilters.sizes.includes(size)
                    ? 'bg-black border-black text-white'
                    : 'bg-white border-gray-200 text-black hover:border-black hover:bg-black hover:text-white'
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
      <div className="mb-8 pb-8 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <h4 className="text-base font-black text-black uppercase tracking-wider">{t('availability')}</h4>
        </div>

        <label className="flex items-center gap-3 cursor-pointer py-2 font-medium text-gray-700 hover:text-black transition-colors">
          <input
            type="checkbox"
            checked={currentFilters.inStockOnly}
            onChange={(e) => onInStockToggle(e.target.checked)}
            className="w-5 h-5 cursor-pointer accent-black border-2 border-gray-300 rounded"
          />
          <span className="flex-1 select-none font-medium">{t('inStockOnly')}</span>
        </label>
      </div>

      {/* Sale Filter */}
      {filterOptions && filterOptions.products_on_sale > 0 && (
        <div className="mb-8 pb-24">
          <div className="flex items-center gap-2 mb-4">
            <h4 className="text-base font-black text-black uppercase tracking-wider">{t('sale')}</h4>
          </div>

          <label className="flex items-center gap-3 cursor-pointer py-2 font-medium text-gray-700 hover:text-black transition-colors">
            <input
              type="checkbox"
              checked={currentFilters.onSaleOnly}
              onChange={(e) => onSaleToggle(e.target.checked)}
              className="w-5 h-5 cursor-pointer accent-black border-2 border-gray-300 rounded"
            />
            <span className="flex-1 select-none font-medium">
              {t('onSaleOnly')}
              <span className="text-gray-400 text-[13px] ml-1">({filterOptions.products_on_sale})</span>
            </span>
          </label>
        </div>
      )}
    </div>
  );
}