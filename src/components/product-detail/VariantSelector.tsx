// src/components/product-detail/VariantSelector.tsx
'use client';

import { Check, Ruler } from 'lucide-react';
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

  // Helper function to determine if a color is light
  const isLightColor = (hex: string): boolean => {
    const color = hex.replace('#', '');
    const r = parseInt(color.substr(0, 2), 16);
    const g = parseInt(color.substr(2, 2), 16);
    const b = parseInt(color.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.7;
  };

  return (
    <div className="variant-selector">
      {/* Color Selection */}
      {availableColors.length > 0 && (
        <div className="variant-selector__section">
          <label className="variant-selector__label">
            {t('color') || 'Color'}
            {selectedColor && (
              <span className="variant-selector__selected-value">: {selectedColor}</span>
            )}
          </label>

          <div className="variant-selector__colors">
            {availableColors.map((color) => (
              <button
                key={color.color}
                onClick={() => onColorChange(color.color)}
                className={`variant-selector__color ${
                  selectedColor === color.color ? 'variant-selector__color--active' : ''
                } ${isLightColor(color.hex) ? 'variant-selector__color--light' : ''}`}
                style={{ backgroundColor: color.hex }}
                title={color.color}
                aria-label={`Select ${color.color} color`}
                aria-pressed={selectedColor === color.color}
              >
                {selectedColor === color.color && (
                  <span className="variant-selector__color-check">
                    <Check size={16} strokeWidth={3} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Size Selection */}
      {selectedColor && availableSizes.length > 0 && (
        <div className="variant-selector__section">
          <div className="variant-selector__label-row">
            <label className="variant-selector__label">
              {t('size') || 'Size'}
              {selectedSize && (
                <span className="variant-selector__selected-value">: {selectedSize}</span>
              )}
            </label>

            {onSizeGuideClick && (
              <button
                onClick={onSizeGuideClick}
                className="variant-selector__size-guide"
                type="button"
              >
                <Ruler size={14} />
                {t('sizeGuide') || 'Size Guide'}
              </button>
            )}
          </div>

          <div className="variant-selector__sizes">
            {availableSizes.map((size) => {
              const isOutOfStock = size.inventory_count !== undefined && size.inventory_count === 0;
              const isLowStock = size.inventory_count !== undefined && size.inventory_count > 0 && size.inventory_count <= 5;

              return (
                <button
                  key={size.id}
                  onClick={() => !isOutOfStock && onSizeChange(size.size)}
                  disabled={isOutOfStock}
                  className={`variant-selector__size ${
                    selectedSize === size.size ? 'variant-selector__size--active' : ''
                  } ${isOutOfStock ? 'variant-selector__size--disabled' : ''}`}
                  title={
                    isOutOfStock
                      ? t('outOfStock') || 'Out of stock'
                      : isLowStock
                      ? `${t('lowStock', { count: size.inventory_count })}` || `Only ${size.inventory_count} left`
                      : undefined
                  }
                  aria-label={`Select size ${size.size_label}`}
                  aria-pressed={selectedSize === size.size}
                  aria-disabled={isOutOfStock}
                >
                  <span className="variant-selector__size-label">{size.size_label}</span>
                  {isOutOfStock && (
                    <span className="variant-selector__size-line" />
                  )}
                </button>
              );
            })}
          </div>

          {!selectedSize && (
            <p className="variant-selector__hint">
              {t('selectSize') || 'Please select a size'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
