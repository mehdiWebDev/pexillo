'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ShoppingCart, Heart, Zap, ArrowRight, Palette, Ruler } from 'lucide-react';

// Product variant interface
export interface ProductVariant {
  id: string;
  size: string;
  color: string;
  color_hex: string;
  inventory_count: number;
}

// Product image interface
export interface ProductImage {
  id: string;
  image_url: string;
  alt_text: string;
  is_primary: boolean;
  variant_id?: string;
  view_type?: 'front' | 'back' | 'side' | 'detail';
}

// Main product interface
export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  short_description?: string;
  base_price: number;
  badge?: 'NEW' | 'HOT' | 'SALE' | 'LIMITED' | null;
  average_rating?: number;
  review_count?: number;
  primary_image_url: string;
  in_stock: boolean;
  has_discount: boolean;
  discount_percentage: number;
  discounted_price: number;
  available_colors: number;
  variants?: ProductVariant[];
  images?: ProductImage[];
  product_type?: 'apparel' | 'accessory' | 'other';
  has_multiple_views?: boolean;
}

interface ProductCardProps {
  product: ProductCardData;
  onAddToCart?: (productId: string, variantId?: string) => void;
  onToggleFavorite?: (productId: string) => void;
  isLoading?: boolean;
  isFavorite?: boolean;
  showColorSwitcher?: boolean;
  showSizePicker?: boolean;
  showTooltips?: boolean; // New prop for tooltips
  compactSizes?: boolean; // New prop for compact size style
}

export default function ProductCard({
  product,
  onAddToCart,
  onToggleFavorite,
  isLoading = false,
  isFavorite = false,
  showColorSwitcher = true,
  showSizePicker = false,
  showTooltips = false,
  compactSizes = false,
}: ProductCardProps) {
  const t = useTranslations('productCard');
  const router = useRouter();
  
  // Get unique colors from variants
  const availableColors = product.variants 
    ? Array.from(new Map(
        product.variants.map(v => [v.color, { color: v.color, hex: v.color_hex }])
      ).values())
    : [];

  // Initialize with first color
  const [selectedColor, setSelectedColor] = useState<string>(
    availableColors.length > 0 ? availableColors[0].color : ''
  );
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [showBackView, setShowBackView] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isImageChanging, setIsImageChanging] = useState(false);
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);

  // Get all sizes with stock info for selected color
  const getSizesWithStock = () => {
    if (!product.variants || !selectedColor) return [];
    
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    
    // Get all sizes for the selected color
    const sizesMap = new Map<string, number>();
    product.variants
      .filter(v => v.color === selectedColor)
      .forEach(v => {
        sizesMap.set(v.size, v.inventory_count);
      });
    
    // Convert to array and sort
    return Array.from(sizesMap.entries())
      .sort((a, b) => sizeOrder.indexOf(a[0]) - sizeOrder.indexOf(b[0]))
      .map(([size, stock]) => ({ size, inStock: stock > 0, stockCount: stock }));
  };

  const sizesWithStock = getSizesWithStock();
  const availableSizes = sizesWithStock.filter(s => s.inStock).map(s => s.size);

  // Initialize size when color changes or on mount
  useEffect(() => {
    if (availableSizes.length > 0 && !availableSizes.includes(selectedSize)) {
      setSelectedSize(availableSizes[0]);
    } else if (availableSizes.length === 0) {
      setSelectedSize('');
    }
  }, [selectedColor]);

  // Update selected variant when color or size changes
  useEffect(() => {
    if (selectedColor && selectedSize && product.variants) {
      const variant = product.variants.find(
        v => v.color === selectedColor && v.size === selectedSize
      );
      setSelectedVariant(variant || null);
      
      // Trigger image change animation
      setIsImageChanging(true);
      setTimeout(() => setIsImageChanging(false), 300);
    }
  }, [selectedColor, selectedSize, product.variants]);

  // Get images for current variant
  const getCurrentVariantImages = () => {
    if (!product.images || product.images.length === 0) {
      return [];
    }

    if (selectedVariant) {
      const variantImages = product.images.filter(
        img => img.variant_id === selectedVariant.id
      );
      
      if (variantImages.length > 0) {
        return variantImages.sort((a, b) => {
          if (a.view_type === 'front') return -1;
          if (b.view_type === 'front') return 1;
          if (a.is_primary) return -1;
          if (b.is_primary) return 1;
          return 0;
        });
      }
    }

    const generalImages = product.images.filter(img => !img.variant_id);
    return generalImages.length > 0 ? generalImages : [];
  };

  const currentImages = getCurrentVariantImages();
  
  // Check if we have both views
  const hasFrontView = currentImages.some(img => img.view_type === 'front');
  const hasBackView = currentImages.some(img => img.view_type === 'back');
  const canFlip = hasFrontView && hasBackView;

  // Get current display image
  const getCurrentImage = () => {
    if (imageError || currentImages.length === 0) {
      return product.primary_image_url || '/api/placeholder/400/500';
    }

    if (showBackView) {
      const backImage = currentImages.find(img => img.view_type === 'back');
      if (backImage) return backImage.image_url;
    }

    const frontImage = currentImages.find(img => img.view_type === 'front');
    if (frontImage) return frontImage.image_url;

    return currentImages[0]?.image_url || product.primary_image_url || '/api/placeholder/400/500';
  };

  // Calculate display price
  const displayPrice = product.has_discount ? product.discounted_price : product.base_price;
  const hasDiscount = product.has_discount && product.discount_percentage > 0;

  // Badge color helper
  const getBadgeColor = (badge: string | null) => {
    if (!badge) return '';
    const badgeMap = {
      'NEW': 'badge--new',
      'HOT': 'badge--hot',
      'SALE': 'badge--sale',
      'LIMITED': 'badge--limited',
    };
    return badgeMap[badge as keyof typeof badgeMap] || '';
  };

  // Helper function to determine if a color is light
  const isLightColor = (hex: string): boolean => {
    // Remove # if present
    const color = hex.replace('#', '');
    
    // Convert hex to RGB
    const r = parseInt(color.substr(0, 2), 16);
    const g = parseInt(color.substr(2, 2), 16);
    const b = parseInt(color.substr(4, 2), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return true if color is light (luminance > 0.7)
    return luminance > 0.7;
  };

  // Handlers
  const handleColorSelect = (color: string) => {
    if (color !== selectedColor) {
      setSelectedColor(color);
      setShowBackView(false); // Reset to front view
      setImageError(false);
    }
  };

  const handleSizeSelect = (size: string, inStock: boolean) => {
    if (inStock) {
      setSelectedSize(size);
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToCart && selectedVariant) {
      onAddToCart(product.id, selectedVariant.id);
    }
  };

  const handleCardClick = () => {
    router.push(`/products/${product.slug}`);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite?.(product.id);
  };

  // Check if current variant is in stock
  const isCurrentVariantInStock = selectedVariant ? selectedVariant.inventory_count > 0 : product.in_stock;

  return (
    <div 
      className="product-card"
      onClick={handleCardClick}
      role="article"
      aria-label={product.name}
    >
      {/* Badge */}
      {product.badge && (
        <div className={`product-card__badge ${getBadgeColor(product.badge)}`}>
          <Zap size={14} />
          {product.badge}
        </div>
      )}

      {/* Discount Badge */}
      {hasDiscount && (
        <div className="product-card__discount">
          -{product.discount_percentage}%
        </div>
      )}

      {/* Favorite Button */}
      <button
        className={`product-card__favorite ${isFavorite ? 'product-card__favorite--active' : ''}`}
        onClick={handleFavoriteClick}
        aria-label={t('addToFavorites')}
      >
        <Heart size={20} />
      </button>

      {/* Image Container */}
      <div 
        className={`product-card__image-container ${isImageChanging ? 'product-card__image-container--changing' : ''}`}
        onMouseEnter={() => canFlip && setShowBackView(true)}
        onMouseLeave={() => canFlip && setShowBackView(false)}
      >
        <img
          src={getCurrentImage()}
          alt={`${product.name} - ${showBackView ? 'Back' : 'Front'} view`}
          className="product-card__image"
          onError={() => setImageError(true)}
        />
        
        {/* View Details Link */}
        <div className="product-card__view-details">
          <span>{t('viewDetails')}</span>
          <ArrowRight size={16} />
        </div>

        {/* Flip indicator dots */}
        {canFlip && (
          <div className="product-card__view-dots">
            <span 
              className={`product-card__view-dot ${!showBackView ? 'product-card__view-dot--active' : ''}`}
              aria-label="Front view"
            />
            <span 
              className={`product-card__view-dot ${showBackView ? 'product-card__view-dot--active' : ''}`}
              aria-label="Back view"
            />
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="product-card__info" onClick={(e) => e.stopPropagation()}>
        <div className="product-card__header">
          <span className="product-card__category">
            {product.available_colors} {t('colorsAvailable')}
          </span>
          
          <h3 className="product-card__name">{product.name}</h3>

          {product.short_description && (
            <p className="product-card__description">
              {product.short_description}
            </p>
          )}
        </div>

        {/* Modern variant selector design */}
        <div className="product-card__variants">
          {/* Color Switcher */}
          {showColorSwitcher && availableColors.length > 0 && (
            <div className="product-card__variants-row">
              <span className="product-card__variants-label">
                <Palette size={12} />
                {t('color')}
              </span>
              <div className="product-card__variants-options">
                {availableColors.map(({ color, hex }) => (
                  <div key={color} className="product-card__color-wrapper">
                    <button
                      className={`
                        product-card__color 
                        ${selectedColor === color ? 'product-card__color--active' : ''} 
                        ${isLightColor(hex) ? 'product-card__color--light' : ''}
                      `}
                      style={{ backgroundColor: hex }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleColorSelect(color);
                      }}
                      onMouseEnter={() => setHoveredColor(color)}
                      onMouseLeave={() => setHoveredColor(null)}
                      aria-label={color}
                      title={color}
                    />
                    {showTooltips && hoveredColor === color && (
                      <span className="product-card__color-tooltip">{color}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Size Picker */}
          {showSizePicker && sizesWithStock.length > 0 && (
            <div className="product-card__variants-row">
              <span className="product-card__variants-label">
                <Ruler size={12} />
                {t('size')}
              </span>
              <div className="product-card__variants-options">
                {sizesWithStock.map(({ size, inStock, stockCount }) => (
                  <button
                    key={size}
                    className={`
                      product-card__size 
                      ${compactSizes ? 'product-card__size--tag' : ''} 
                      ${selectedSize === size ? 'product-card__size--active' : ''} 
                      ${!inStock ? 'product-card__size--out-of-stock' : ''}
                    `}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSizeSelect(size, inStock);
                    }}
                    disabled={!inStock}
                    title={inStock ? `${stockCount} in stock` : 'Out of stock'}
                  >
                    <span>{size}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Price and Add to Cart */}
        <div className="product-card__footer">
          <div className="product-card__price-wrapper">
            <span className="product-card__price">
              ${displayPrice.toFixed(2)}
            </span>
            {hasDiscount && (
              <span className="product-card__original-price">
                ${product.base_price.toFixed(2)}
              </span>
            )}
          </div>

          {/* Add to Cart Button */}
          <button
            className={`product-card__add-to-cart ${isLoading ? 'product-card__add-to-cart--loading' : ''}`}
            onClick={handleAddToCart}
            disabled={isLoading || !isCurrentVariantInStock || !selectedVariant}
            aria-label={t('addToCart')}
            title={!selectedVariant ? 'Select size' : isCurrentVariantInStock ? 'Add to cart' : 'Out of stock'}
          >
            {isLoading ? (
              <span className="btn__loader" />
            ) : (
              <ShoppingCart size={20} />
            )}
          </button>
        </div>

        {/* Stock Warning */}
        {selectedVariant && !isCurrentVariantInStock && (
          <div className="product-card__stock-warning">
            {t('outOfStock')}
          </div>
        )}
      </div>
    </div>
  );
}