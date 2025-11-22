'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { ShoppingCart, Heart, Zap, ArrowRight, Palette, Ruler, AlertCircle, Check } from 'lucide-react';
import { useCart } from '@/src/hooks/useCart';
import { toast } from '@/src/hooks/use-toast';

// Product variant interface
export interface ProductVariant {
  id: string;
  size: string;
  color: string;
  color_hex: string;
  inventory_count: number;
  translations?: Record<string, {
    color?: string;
    size_label?: string;
  }>;
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
  translations?: Record<string, {
    name?: string;
    short_description?: string;
    description?: string;
    material?: string | null;
    care_instructions?: string | null;
    badge?: string | null;
    tags?: string[] | null;
  }>;
}

interface ProductCardProps {
  product: ProductCardData;
  onAddToCart?: (productId: string, variantId?: string) => void;
  onToggleFavorite?: (productId: string) => void;
  isLoading?: boolean;
  isFavorite?: boolean;
  showColorSwitcher?: boolean;
  showSizePicker?: boolean;
  showTooltips?: boolean;
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
}: ProductCardProps) {
  const t = useTranslations('productCard');
  const router = useRouter();
  const { addToCart, getCartQuantity } = useCart();

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
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // Get current quantity in cart for selected variant
  const currentCartQuantity = selectedVariant 
    ? getCartQuantity(selectedVariant.id) 
    : 0;
  
  // Check if can add more
  const canAddMore = selectedVariant 
    ? currentCartQuantity < selectedVariant.inventory_count 
    : false;
    
  // Calculate remaining available
  const remainingAvailable = selectedVariant 
    ? selectedVariant.inventory_count - currentCartQuantity 
    : 0;

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
  }, [selectedColor, availableSizes, selectedSize]);

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

  // Helper function to determine if a color is light
  const isLightColor = (hex: string): boolean => {
    const color = hex.replace('#', '');
    const r = parseInt(color.substr(0, 2), 16);
    const g = parseInt(color.substr(2, 2), 16);
    const b = parseInt(color.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.7;
  };

  // Get stock info for display
  const getStockInfo = () => {
    if (!selectedVariant) return null;

    // Use remaining available instead of total stock
    const stockToShow = remainingAvailable;

    if (stockToShow === 0) return null;
    if (stockToShow <= 10) {
      return {
        count: stockToShow,
        isCritical: stockToShow <= 3,
        isLow: stockToShow > 3 && stockToShow <= 10
      };
    }

    return null;
  };

  const stockInfo = getStockInfo();

  // Handlers
  const handleColorSelect = (color: string) => {
    if (color !== selectedColor) {
      setSelectedColor(color);
      setShowBackView(false);
      setImageError(false);
    }
  };

  const handleSizeSelect = (size: string, inStock: boolean) => {
    if (inStock) {
      setSelectedSize(size);
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedVariant) {
      toast({
        title: 'Select Options',
        description: 'Please select size and color',
        variant: 'destructive',
      });
      return;
    }

    if (!canAddMore) {
      toast({
        title: 'Maximum quantity reached',
        description: `You already have ${currentCartQuantity} in your cart (maximum available)`,
        variant: 'destructive',
      });
      return;
    }

    setIsAddingToCart(true);

    try {
      const success = await addToCart(
        product.id,
        selectedVariant.id,
        {
          name: product.name,
          slug: product.slug,
          image: product.primary_image_url,
          unitPrice: displayPrice,
          variantSize: selectedVariant.size,
          variantColor: selectedVariant.color,
          variantColorHex: selectedVariant.color_hex,
          maxQuantity: selectedVariant.inventory_count,
          translations: product.translations,
          variantTranslations: selectedVariant.translations,
        }
      );

      if (success && onAddToCart) {
        onAddToCart(product.id, selectedVariant.id);
      }
    } finally {
      setIsAddingToCart(false);
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
      className="group relative bg-zinc-900 border border-zinc-800 hover:border-acid-lime transition-all duration-300 cursor-pointer overflow-hidden"
      onClick={handleCardClick}
      role="article"
      aria-label={product.name}
    >
      {/* Badge */}
      {product.badge && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2 py-1 bg-acid-lime text-black text-xs font-bold uppercase">
          <Zap size={12} />
          {product.badge}
        </div>
      )}

      {/* Discount Badge */}
      {hasDiscount && (
        <div className="absolute top-3 right-3 z-10 px-2 py-1 bg-red-500 text-white text-xs font-bold uppercase">
          -{product.discount_percentage}%
        </div>
      )}

      {/* Favorite Button */}
      <button
        className={`absolute top-3 ${product.badge ? 'right-3' : hasDiscount ? 'left-3' : 'right-3'} z-10 w-8 h-8 flex items-center justify-center bg-black/80 border border-zinc-800 hover:border-acid-lime transition-colors ${isFavorite ? 'text-acid-lime' : 'text-zinc-400'}`}
        onClick={handleFavoriteClick}
        aria-label={t('addToFavorites')}
      >
        <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
      </button>

      {/* Image Container */}
      <div
        className={`relative aspect-[3/4] overflow-hidden bg-black ${isImageChanging ? 'opacity-50' : ''}`}
        onMouseEnter={() => canFlip && setShowBackView(true)}
        onMouseLeave={() => canFlip && setShowBackView(false)}
      >
        <Image
          src={getCurrentImage()}
          alt={`${product.name} - ${showBackView ? 'Back' : 'Front'} view`}
          width={400}
          height={500}
          className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-500"
          onError={() => setImageError(true)}
        />

        {/* Scan Line Effect */}
        <div className="absolute inset-0 scan-line opacity-0 group-hover:opacity-100"></div>

        {/* View Details Link */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <div className="flex items-center justify-between text-white">
            <span className="font-mono text-xs uppercase">{t('viewDetails')}</span>
            <ArrowRight size={14} className="text-acid-lime" />
          </div>
        </div>

        {/* Flip indicator dots */}
        {canFlip && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full transition-colors ${!showBackView ? 'bg-acid-lime' : 'bg-zinc-600'}`}
              aria-label="Front view"
            />
            <span
              className={`w-1.5 h-1.5 rounded-full transition-colors ${showBackView ? 'bg-acid-lime' : 'bg-zinc-600'}`}
              aria-label="Back view"
            />
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        {/* Product Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-zinc-500 uppercase">
              {product.available_colors} {t('colorsAvailable')}
            </span>
          </div>

          <h3 className="text-white font-bold text-base uppercase tracking-tight leading-tight">
            {product.name}
          </h3>

          {product.short_description && (
            <p className="text-zinc-300 text-sm font-mono leading-snug line-clamp-2">
              {product.short_description}
            </p>
          )}
        </div>

        {/* Variant Selectors */}
        <div className="space-y-3 pt-2 border-t border-zinc-800">
          {/* Color Switcher */}
          {showColorSwitcher && availableColors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Palette size={12} className="text-acid-lime" />
                <span className="font-mono text-xs text-zinc-400 uppercase">
                  {t('color')}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableColors.map(({ color, hex }) => (
                  <div key={color} className="relative">
                    <button
                      className={`
                        w-8 h-8 rounded-full border-2 transition-all
                        ${selectedColor === color
                          ? 'border-acid-lime shadow-lg shadow-acid-lime/20 scale-110'
                          : 'border-zinc-700 hover:border-zinc-500'
                        }
                        ${isLightColor(hex) ? 'shadow-inner' : ''}
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
                    >
                      {selectedColor === color && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Check
                            size={16}
                            className={isLightColor(hex) ? 'text-black' : 'text-white'}
                            strokeWidth={3}
                          />
                        </div>
                      )}
                    </button>
                    {showTooltips && hoveredColor === color && (
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black border border-zinc-700 text-white text-xs font-mono whitespace-nowrap z-20">
                        {color}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Size Picker */}
          {showSizePicker && sizesWithStock.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Ruler size={12} className="text-acid-lime" />
                <span className="font-mono text-xs text-zinc-400 uppercase">
                  {t('size')}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {sizesWithStock.map(({ size, inStock, stockCount }) => (
                  <button
                    key={size}
                    className={`
                      px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all border
                      ${selectedSize === size
                        ? 'bg-acid-lime text-black border-acid-lime'
                        : inStock
                        ? 'bg-zinc-800 text-white border-zinc-700 hover:border-acid-lime'
                        : 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed line-through'
                      }
                    `}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSizeSelect(size, inStock);
                    }}
                    disabled={!inStock}
                    title={inStock ? `${stockCount} in stock` : 'Out of stock'}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Price and Add to Cart */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
          <div className="space-y-1">
            <div className="text-2xl font-black text-white tracking-tight">
              ${displayPrice.toFixed(2)}
            </div>
            {hasDiscount && (
              <div className="text-sm text-zinc-500 line-through font-mono">
                ${product.base_price.toFixed(2)}
              </div>
            )}
          </div>

          {/* Add to Cart Button */}
          <button
            className={`
              w-12 h-12 flex items-center justify-center transition-all border-2
              ${isAddingToCart || isLoading
                ? 'bg-zinc-800 border-zinc-700 cursor-wait'
                : !canAddMore && selectedVariant
                ? 'bg-green-600 border-green-600 text-white'
                : isCurrentVariantInStock && selectedVariant
                ? 'bg-acid-lime border-acid-lime text-black hover:bg-white hover:border-white'
                : 'bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed'
              }
            `}
            onClick={handleAddToCart}
            disabled={isAddingToCart || isLoading || !isCurrentVariantInStock || !selectedVariant || !canAddMore}
            aria-label={t('addToCart')}
            title={
              !selectedVariant
                ? 'Select size'
                : !canAddMore
                ? `Maximum quantity (${currentCartQuantity}) in cart`
                : isCurrentVariantInStock
                ? 'Add to cart'
                : 'Out of stock'
            }
          >
            {isAddingToCart || isLoading ? (
              <div className="w-5 h-5 border-2 border-zinc-600 border-t-acid-lime rounded-full animate-spin" />
            ) : !canAddMore && selectedVariant ? (
              <Check size={20} strokeWidth={3} />
            ) : (
              <ShoppingCart size={20} />
            )}
          </button>
        </div>

        {/* In Cart Badge */}
        {currentCartQuantity > 0 && remainingAvailable > 0 && (
          <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-950/30 text-green-400 border border-green-800 text-xs font-mono uppercase">
            <Check size={12} />
            <span>{currentCartQuantity} {t('inCart')}</span>
          </div>
        )}

        {/* Low Stock Indicator */}
        {stockInfo && canAddMore && (
          <div className={`
            inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono uppercase border
            ${stockInfo.isCritical
              ? 'bg-red-950/30 text-red-400 border-red-800 animate-pulse'
              : 'bg-amber-950/30 text-amber-400 border-amber-800'
            }
          `}>
            {stockInfo.isCritical && (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            <span>
              {stockInfo.count === 1
                ? t('lastOne')
                : t('onlyXLeft', { count: stockInfo.count })}
            </span>
          </div>
        )}

        {/* Stock Warning */}
        {selectedVariant && !isCurrentVariantInStock && (
          <div className="px-3 py-2 bg-red-950/30 text-red-400 border border-red-800 text-xs font-mono uppercase text-center">
            {t('outOfStock')}
          </div>
        )}
      </div>
    </div>
  );
}