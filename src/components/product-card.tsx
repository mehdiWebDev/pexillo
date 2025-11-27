'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ShoppingCart, Heart, ArrowRight,
  AlertCircle, Check, Loader2
} from 'lucide-react';
import { useCart } from '@/src/hooks/useCart';
import { toast } from '@/src/hooks/use-toast';

// --- Interfaces (Kept from your code) ---
export interface ProductVariant {
  id: string;
  size: string;
  color: string;
  color_hex: string;
  inventory_count: number;
  translations?: Record<string, { color?: string; size_label?: string; }>;
}

export interface ProductImage {
  id: string;
  image_url: string;
  alt_text: string;
  is_primary: boolean;
  variant_id?: string;
  view_type?: 'front' | 'back' | 'side' | 'detail';
}

export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  short_description?: string;
  base_price: number;
  badge?: 'NEW' | 'HOT' | 'SALE' | 'LIMITED' | null;
  primary_image_url: string;
  in_stock: boolean;
  has_discount: boolean;
  discount_percentage: number;
  discounted_price: number;
  available_colors: number;
  variants?: ProductVariant[];
  images?: ProductImage[];
  translations?: Record<string, unknown>;
}

interface ProductCardProps {
  product: ProductCardData;
  onAddToCart?: (productId: string, variantId?: string) => void;
  onToggleFavorite?: (productId: string) => void;
  isLoading?: boolean;
  isFavorite?: boolean;
  showColorSwitcher?: boolean;
  showSizePicker?: boolean;
}

export default function ProductCard({
  product,
  onAddToCart,
  onToggleFavorite,
  isLoading = false,
  isFavorite = false,
  showColorSwitcher = true,
  showSizePicker = false,
}: ProductCardProps) {
  // Mock translation for demo purposes if hook fails
  const t = (key: string, params?: { count?: number }) => {
    const dict: Record<string, string> = {
      addToFavorites: 'Favorite',
      viewDetails: 'View',
      colorsAvailable: 'Colors',
      color: 'Color',
      size: 'Size',
      addToCart: 'Add',
      inCart: 'in bag',
      lastOne: 'Last one!',
      onlyXLeft: `Only ${params?.count} left`,
      outOfStock: 'Sold Out'
    };
    return dict[key] || key;
  };
  
  const router = useRouter();
  const { addToCart, getCartQuantity } = useCart();

  // --- Logic extracted from your code ---
  const availableColors = product.variants
    ? Array.from(new Map(product.variants.map(v => [v.color, { color: v.color, hex: v.color_hex }])).values())
    : [];

  const [selectedColor, setSelectedColor] = useState<string>(availableColors.length > 0 ? availableColors[0].color : '');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [showBackView, setShowBackView] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isImageChanging, setIsImageChanging] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const currentCartQuantity = selectedVariant ? getCartQuantity(selectedVariant.id) : 0;
  const canAddMore = selectedVariant ? currentCartQuantity < selectedVariant.inventory_count : false;
  const remainingAvailable = selectedVariant ? selectedVariant.inventory_count - currentCartQuantity : 0;

  const getSizesWithStock = () => {
    if (!product.variants || !selectedColor) return [];
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const sizesMap = new Map<string, number>();
    product.variants.filter(v => v.color === selectedColor).forEach(v => sizesMap.set(v.size, v.inventory_count));
    return Array.from(sizesMap.entries())
      .sort((a, b) => sizeOrder.indexOf(a[0]) - sizeOrder.indexOf(b[0]))
      .map(([size, stock]) => ({ size, inStock: stock > 0, stockCount: stock }));
  };

  const sizesWithStock = getSizesWithStock();
  const availableSizes = sizesWithStock.filter(s => s.inStock).map(s => s.size);

  useEffect(() => {
    if (availableSizes.length > 0 && !availableSizes.includes(selectedSize)) {
      setSelectedSize(availableSizes[0]);
    } else if (availableSizes.length === 0) {
      setSelectedSize('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColor, availableSizes]); // Removed selectedSize from deps to avoid loop

  useEffect(() => {
    if (selectedColor && selectedSize && product.variants) {
      const variant = product.variants.find(v => v.color === selectedColor && v.size === selectedSize);
      setSelectedVariant(variant || null);
      setIsImageChanging(true);
      setTimeout(() => setIsImageChanging(false), 300);
    }
  }, [selectedColor, selectedSize, product.variants]);

  const getCurrentVariantImages = () => {
    if (!product.images || product.images.length === 0) return [];
    if (selectedVariant) {
      const variantImages = product.images.filter(img => img.variant_id === selectedVariant.id);
      if (variantImages.length > 0) {
        return variantImages.sort((a, b) => (a.view_type === 'front' ? -1 : b.view_type === 'front' ? 1 : 0));
      }
    }
    return product.images.filter(img => !img.variant_id);
  };

  const currentImages = getCurrentVariantImages();
  const canFlip = currentImages.some(img => img.view_type === 'front') && currentImages.some(img => img.view_type === 'back');

  const getCurrentImage = () => {
    if (imageError || currentImages.length === 0) return product.primary_image_url || '/api/placeholder/400/500';
    if (showBackView) {
      const backImage = currentImages.find(img => img.view_type === 'back');
      if (backImage) return backImage.image_url;
    }
    const frontImage = currentImages.find(img => img.view_type === 'front');
    return frontImage?.image_url || currentImages[0]?.image_url || product.primary_image_url;
  };

  const displayPrice = product.has_discount ? product.discounted_price : product.base_price;
  const hasDiscount = product.has_discount && product.discount_percentage > 0;

  const getStockInfo = () => {
    if (!selectedVariant) return null;
    const stockToShow = remainingAvailable;
    if (stockToShow === 0) return null;
    if (stockToShow <= 5) { // Adjusted threshold for "hype" feel
      return { count: stockToShow, isCritical: stockToShow <= 2 };
    }
    return null;
  };

  const stockInfo = getStockInfo();
  const isCurrentVariantInStock = selectedVariant ? selectedVariant.inventory_count > 0 : product.in_stock;

  // --- Handlers ---
  const handleColorSelect = (color: string) => {
    if (color !== selectedColor) {
      setSelectedColor(color);
      setShowBackView(false);
      setImageError(false);
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedVariant) {
      toast({ title: 'Select Options', description: 'Please select size and color', variant: 'destructive' });
      return;
    }
    if (!canAddMore) return;

    setIsAddingToCart(true);
    try {
      const success = await addToCart(product.id, selectedVariant.id, {
        name: product.name,
        slug: product.slug,
        image: getCurrentImage(),
        unitPrice: displayPrice,
        variantSize: selectedVariant.size,
        variantColor: selectedVariant.color,
        variantColorHex: selectedVariant.color_hex,
        maxQuantity: selectedVariant.inventory_count,
        translations: product.translations as Record<string, { name?: string; description?: string; }> | undefined,
        variantTranslations: selectedVariant.translations,
      });
      if (success && onAddToCart) onAddToCart(product.id, selectedVariant.id);
    } finally {
      setIsAddingToCart(false);
    }
  };

  // --- Styles Helpers ---
  const getBadgeStyle = (badge: string) => {
    switch(badge) {
      case 'NEW': return 'bg-brand-yellow text-brand-dark border-brand-dark';
      case 'HOT': return 'bg-brand-red text-white border-white';
      case 'SALE': return 'bg-brand-dark text-white border-gray-500';
      case 'LIMITED': return 'bg-brand-purple text-white border-white';
      default: return 'bg-brand-gray text-brand-dark border-brand-dark';
    }
  };

  return (
    <div 
      className="group relative flex flex-col h-full cursor-pointer"
      onClick={() => router.push(`/products/${product.slug}`)}
    >
      {/* Main Card Body - Flat Design, No Shadow */}
      <div className="relative flex-1 bg-white border border-gray-200 rounded-2xl overflow-hidden transition-all duration-300 hover:border-brand-red hover:-translate-y-1">
        
        {/* Image Section */}
        <div 
          className="relative aspect-[4/5] overflow-hidden bg-brand-gray"
          onMouseEnter={() => canFlip && setShowBackView(true)}
          onMouseLeave={() => canFlip && setShowBackView(false)}
        >
          <Image
            src={getCurrentImage()}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 33vw"
            className={`object-cover transition-transform duration-700 ease-out ${isImageChanging ? 'opacity-80 blur-sm' : 'opacity-100'} group-hover:scale-105`}
            onError={() => setImageError(true)}
          />

          {/* Badges - Sticker Style */}
          <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex flex-col gap-1 sm:gap-2 items-start z-10">
            {product.badge && (
              <div className={`px-2 sm:px-3 py-0.5 sm:py-1 text-[9px] sm:text-xs font-black tracking-wider border sm:border-2 rounded shadow-sm transform -rotate-2 ${getBadgeStyle(product.badge)}`}>
                {product.badge}
              </div>
            )}
            {hasDiscount && (
              <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9px] sm:text-xs font-bold bg-white text-brand-red border border-brand-red rounded transform rotate-1">
                -{product.discount_percentage}%
              </div>
            )}
          </div>

          {/* Favorite Button */}
          <button
            className={`absolute top-2 sm:top-3 right-2 sm:right-3 p-1.5 sm:p-2.5 rounded-full border sm:border-2 transition-all duration-200 z-20
              ${isFavorite
                ? 'bg-brand-red border-brand-red text-white'
                : 'bg-white border-gray-200 text-gray-400 hover:border-brand-red hover:text-brand-red'
              }`}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite?.(product.id); }}
          >
            <Heart size={14} className="sm:w-[18px] sm:h-[18px]" fill={isFavorite ? "currentColor" : "none"} />
          </button>

          {/* Out of Stock Overlay */}
          {(!isCurrentVariantInStock && selectedVariant) && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-10">
              <span className="bg-brand-dark text-white px-4 py-2 font-bold uppercase tracking-widest transform -rotate-6 border-2 border-white shadow-lg">
                {t('outOfStock')}
              </span>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="p-2 sm:p-3 md:p-4 flex flex-col gap-2 sm:gap-3">

          {/* Title & Price */}
          <div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-2">
              <h3 className="font-heading font-bold text-sm sm:text-base md:text-lg leading-tight text-brand-dark line-clamp-1 group-hover:text-brand-red transition-colors">
                {product.name}
              </h3>
              {/* Mobile/Compact Price View */}
              <div className="flex flex-row sm:flex-col items-baseline sm:items-end gap-2 sm:gap-0">
                <span className={`font-black text-base sm:text-lg ${hasDiscount ? 'text-brand-red' : 'text-brand-dark'}`}>
                  ${displayPrice.toFixed(2)}
                </span>
                {hasDiscount && (
                  <span className="text-[10px] sm:text-xs text-gray-400 line-through font-medium">
                    ${product.base_price.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
            {product.short_description && (
              <p className="text-[10px] sm:text-xs text-gray-500 mt-1 line-clamp-1 font-medium">
                {product.short_description}
              </p>
            )}
          </div>

          {/* Variants: Color & Size */}
          <div className="space-y-2 sm:space-y-3">

            {/* Color Switcher */}
            {showColorSwitcher && availableColors.length > 0 && (
              <div className="flex items-center gap-1.5 sm:gap-2" onClick={(e) => e.stopPropagation()}>
                {availableColors.map(({ color, hex }) => (
                  <button
                    key={color}
                    className={`
                      w-5 h-5 sm:w-6 sm:h-6 rounded-full border shadow-sm flex-shrink-0 transition-all
                      ${selectedColor === color ? 'ring-2 ring-offset-1 sm:ring-offset-2 ring-brand-dark scale-110 border-transparent' : 'border-gray-200 hover:scale-110'}
                    `}
                    style={{ backgroundColor: hex }}
                    onClick={() => handleColorSelect(color)}
                    title={color}
                  />
                ))}
                {/* Count of extra colors if many */}
                {product.available_colors > availableColors.length && (
                  <span className="text-[9px] sm:text-[10px] text-gray-400 font-bold">+{product.available_colors - availableColors.length}</span>
                )}
              </div>
            )}

            {/* Size Picker - Flat Design */}
            {showSizePicker && sizesWithStock.length > 0 && (
              <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                {sizesWithStock.map(({ size, inStock }) => (
                  <button
                    key={size}
                    className={`
                      px-2.5 py-1 text-xs font-bold border rounded transition-all
                      ${selectedSize === size 
                        ? 'bg-brand-dark text-white border-brand-dark' 
                        : inStock 
                          ? 'bg-white text-brand-dark border-gray-200 hover:border-brand-dark' 
                          : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed line-through'
                      }
                    `}
                    onClick={() => inStock && setSelectedSize(size)}
                    disabled={!inStock}
                  >
                    {size}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Stock & Cart Logic Footer */}
          <div className="pt-2 sm:pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2">

            {/* Left Side: Status Indicators */}
            <div className="flex flex-col gap-0.5 sm:gap-1">
              {/* Low Stock Warning */}
              {stockInfo && canAddMore && (
                <span className={`text-[9px] sm:text-[10px] font-bold flex items-center gap-0.5 sm:gap-1 ${stockInfo.isCritical ? 'text-brand-red' : 'text-orange-500'}`}>
                  <AlertCircle size={8} className="sm:w-[10px] sm:h-[10px]" />
                  {stockInfo.count === 1 ? t('lastOne') : t('onlyXLeft', { count: stockInfo.count })}
                </span>
              )}

              {/* In Cart Indicator */}
              {currentCartQuantity > 0 && (
                <span className="text-[9px] sm:text-[10px] font-bold text-brand-green flex items-center gap-0.5 sm:gap-1 bg-green-50 px-1 sm:px-1.5 py-0.5 rounded-md w-fit">
                  <Check size={8} className="sm:w-[10px] sm:h-[10px]" /> {currentCartQuantity} {t('inCart')}
                </span>
              )}
            </div>

            {/* Right Side: Action Button */}
            <button
              className={`
                flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg font-bold text-xs sm:text-sm transition-all w-full sm:w-auto
                ${!canAddMore && selectedVariant
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white border sm:border-2 border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white sm:hover:-translate-y-0.5'
                }
              `}
              onClick={handleAddToCart}
              disabled={isAddingToCart || isLoading || !selectedVariant || !canAddMore}
            >
              {isAddingToCart ? (
                <Loader2 size={14} className="animate-spin sm:w-4 sm:h-4" />
              ) : !selectedVariant ? (
                <>Select <ArrowRight size={12} className="sm:w-[14px] sm:h-[14px]" /></>
              ) : !canAddMore ? (
                <span className="text-[10px] sm:text-xs">Max</span>
              ) : (
                <>Add <ShoppingCart size={14} className="sm:w-4 sm:h-4" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}