// src/components/product-detail/VariantSelector.tsx
'use client';

import { useTranslations } from 'next-intl';

interface Color {
  color: string;
  hex: string;
}

interface Size {
  size: string;
  size_label: string;
  id: string;
  inventory_count?: number;
}

interface VariantSelectorProps {
  // Color selection
  availableColors: Color[];
  selectedColor: string;
  onColorChange: (color: string) => void;

  // Size selection
  availableSizes: Size[];
  selectedSize: string;
  onSizeChange: (size: string) => void;

  // Size guide
  onSizeGuideClick?: () => void;
}

export default function VariantSelector({
  availableColors,
  selectedColor,
  onColorChange,
  availableSizes,
  selectedSize,
  onSizeChange,
  onSizeGuideClick,
}: VariantSelectorProps) {
  const t = useTranslations('productDetail');

  // Helper function to determine if a color is light (commented out - not currently used)
  // const isLightColor = (hex: string): boolean => {
  //   const color = hex.replace('#', '');
  //   const r = parseInt(color.substr(0, 2), 16);
  //   const g = parseInt(color.substr(2, 2), 16);
  //   const b = parseInt(color.substr(4, 2), 16);
  //   const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  //   return luminance > 0.7;
  // };

  return (
    <div className="space-y-6">
      {/* Color Selection */}
      {availableColors.length > 0 && (
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 block">
            {t('color') || 'Color'}:{' '}
            {selectedColor && <span className="text-gray-900">{selectedColor}</span>}
          </span>
          <div className="flex gap-2.5">
            {availableColors.map((color) => (
              <button
                key={color.color}
                onClick={() => onColorChange(color.color)}
                className={`w-10 h-10 rounded-full border-2 transition-all ${
                  selectedColor === color.color
                    ? 'border-white ring-2 ring-gray-900 scale-110'
                    : 'border-gray-200 hover:border-gray-900'
                }`}
                style={{ backgroundColor: color.hex }}
                title={color.color}
                aria-label={`Select ${color.color} color`}
                aria-pressed={selectedColor === color.color}
              />
            ))}
          </div>
        </div>
      )}

      {/* Size Selection */}
      {selectedColor && availableSizes.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              {t('size') || 'Size'}:{' '}
              {selectedSize && <span className="text-gray-900">{selectedSize}</span>}
            </span>
            {onSizeGuideClick && (
              <button
                onClick={onSizeGuideClick}
                className="text-[10px] font-bold text-gray-900 border-b-2 border-gray-200 hover:border-gray-900 transition-colors"
                type="button"
              >
                {t('sizeGuide') || 'Size Guide'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-5 gap-2">
            {availableSizes.map((size) => {
              const isOutOfStock = size.inventory_count !== undefined && size.inventory_count === 0;

              return (
                <button
                  key={size.id}
                  onClick={() => !isOutOfStock && onSizeChange(size.size)}
                  disabled={isOutOfStock}
                  className={`py-2.5 border-2 rounded-lg font-bold text-sm transition-all relative overflow-hidden ${
                    selectedSize === size.size
                      ? 'bg-gray-900 text-white border-gray-900'
                      : isOutOfStock
                      ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                      : 'border-gray-200 hover:border-gray-900'
                  }`}
                  title={isOutOfStock ? t('outOfStock') || 'Out of stock' : undefined}
                  aria-label={`Select size ${size.size_label}`}
                  aria-pressed={selectedSize === size.size}
                  aria-disabled={isOutOfStock}
                >
                  {size.size_label}
                  {isOutOfStock && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full h-[1px] bg-gray-300 rotate-45"></div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
