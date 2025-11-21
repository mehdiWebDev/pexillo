// src/app/[locale]/products/[slug]/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { use } from 'react';
import { useRouter } from '@/src/i18n/routing';
import { Link } from '@/src/i18n/routing';
import { useTranslations, useLocale } from 'next-intl';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import {
  ShoppingCart,
  Heart,
  Truck,
  RotateCcw,
  Shield,
  Minus,
  Plus,
  ChevronRight,
  Package2,
  Sparkles,
  Headphones
} from 'lucide-react';
import { useCart } from '@/src/hooks/useCart';
import { useFavorites } from '@/src/hooks/useFavorites';
import { useToast } from '@/src/hooks/use-toast';
import ImageGallery from '@/src/components/product-detail/ImageGallery';
import VariantSelector from '@/src/components/product-detail/VariantSelector';
import ProductTabs from '@/src/components/product-detail/ProductTabs';
import SizeGuideModal from '@/src/components/product-detail/SizeGuideModal';

interface ProductDetailProps {
  params: Promise<{ slug: string }>;
}

interface ProductVariant {
  id: string;
  color: string;
  color_hex: string;
  size: string;
  size_label?: string;
  inventory_count: number;
  translations?: Record<string, {
    color?: string;
    size_label?: string;
  }>;
}

interface ProductImage {
  image_url: string;
  alt_text?: string;
}

interface Category {
  name: string;
  slug: string;
  translations?: Record<string, {
    name?: string;
  }>;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  short_description?: string;
  description?: string;
  material?: string;
  care_instructions?: string;
  badge?: string;
  base_price: number;
  primary_image_url: string;
  translations?: Record<string, {
    name?: string;
    short_description?: string;
    description?: string;
    material?: string;
    care_instructions?: string;
    badge?: string;
  }>;
  variants: ProductVariant[];
  images?: ProductImage[];
  categories?: Category;
}

export default function ProductDetailPage({ params }: ProductDetailProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const t = useTranslations('productDetail');
  const locale = useLocale();
  const { addToCart, getCartQuantity } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { toast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  // Fetch product details
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/products/${resolvedParams.slug}`);

        if (!response.ok) {
          throw new Error('Product not found');
        }

        const data = await response.json();
        setProduct(data.product);

        // Set default color (first available)
        const colors = getAvailableColors(data.product.variants);
        if (colors.length > 0) {
          setSelectedColor(colors[0].color);
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        toast({
          title: t('error') || 'Error',
          description: t('productNotFound') || 'Product not found',
          variant: 'destructive'
        });
        router.push('/products');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [resolvedParams.slug, router, t, toast]);

  // Translate product details
  const translatedProduct = useMemo(() => {
    if (!product || locale === 'en') return product;

    const translations = product.translations?.[locale] || {};

    return {
      ...product,
      name: translations.name || product.name,
      short_description: translations.short_description || product.short_description,
      description: translations.description || product.description,
      material: translations.material || product.material,
      care_instructions: translations.care_instructions || product.care_instructions,
      badge: translations.badge || product.badge,
      category: product.categories ? {
        ...product.categories,
        name: product.categories.translations?.[locale]?.name || product.categories.name
      } : null
    };
  }, [product, locale]);

  // Translate variants
  const translatedVariants = useMemo(() => {
    if (!product?.variants || locale === 'en') return product?.variants || [];

    return product.variants.map((variant: ProductVariant) => {
      const variantTranslations = variant.translations?.[locale] || {};
      return {
        ...variant,
        color: variantTranslations.color || variant.color,
        size_label: variantTranslations.size_label || variant.size,
      };
    });
  }, [product, locale]);

  // Helper functions
  const getAvailableColors = (variants: ProductVariant[]) => {
    if (!variants) return [];
    return Array.from(new Map(
      variants.map(v => [v.color, { color: v.color, hex: v.color_hex }])
    ).values());
  };

  const getAvailableSizes = (color: string) => {
    if (!translatedVariants) return [];
    return translatedVariants
      .filter((v: ProductVariant) => v.color === color)
      .map((v: ProductVariant) => ({
        size: v.size,
        size_label: v.size_label || v.size,
        id: v.id,
        inventory_count: v.inventory_count
      }));
  };

  // Update selected variant when color/size changes
  useEffect(() => {
    if (selectedColor && selectedSize && translatedVariants) {
      const variant = translatedVariants.find((v: ProductVariant) =>
        v.color === selectedColor && v.size === selectedSize
      );
      setSelectedVariant(variant || null);

      // Reset quantity when variant changes
      if (variant) {
        setQuantity(1);
      }
    }
  }, [selectedColor, selectedSize, translatedVariants]);

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    setSelectedSize(''); // Reset size when color changes
    setSelectedVariant(null);
  };

  const handleSizeChange = (size: string) => {
    setSelectedSize(size);
  };

  const handleAddToCart = async () => {
    if (!selectedVariant) {
      toast({
        title: t('selectVariant') || 'Select options',
        description: t('selectSizeColor') || 'Please select size and color',
        variant: 'destructive'
      });
      return;
    }

    setIsAddingToCart(true);
    const success = await addToCart(
      product.id,
      selectedVariant.id,
      {
        name: translatedProduct.name,
        slug: product.slug,
        image: product.primary_image_url,
        unitPrice: product.base_price,
        variantSize: selectedVariant.size_label || selectedVariant.size,
        variantColor: selectedVariant.color,
        variantColorHex: selectedVariant.color_hex,
        maxQuantity: selectedVariant.inventory_count,
        translations: product.translations,
        variantTranslations: selectedVariant.translations
      },
      quantity
    );

    if (success) {
      setQuantity(1);
    }
    setIsAddingToCart(false);
  };

  const handleQuantityChange = (delta: number) => {
    const newQty = quantity + delta;
    if (newQty >= 1 && (!selectedVariant || newQty <= maxAvailable)) {
      setQuantity(newQty);
    }
  };

  const handleToggleFavorite = () => {
    if (product) {
      toggleFavorite(product.id);
    }
  };

  const currentCartQuantity = selectedVariant ? getCartQuantity(selectedVariant.id) : 0;
  const maxAvailable = selectedVariant ? selectedVariant.inventory_count - currentCartQuantity : 0;

  if (loading) {
    return (
      <div className="product-detail">
        <div className="product-detail__container">
          <div className="text-center py-12">
            <div className="text-lg">{t('loading') || 'Loading...'}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!translatedProduct) {
    return null;
  }

  const availableColors = getAvailableColors(product.variants);
  const availableSizes = getAvailableSizes(selectedColor);
  const productImages = product.images?.length > 0
    ? product.images
    : [{ image_url: product.primary_image_url, alt_text: translatedProduct.name }];

  const productIsFavorited = isFavorite(product.id);

  return (
    <div className="product-detail">
      <div className="product-detail__container">
        {/* Breadcrumb */}
        <nav className="product-detail__breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <ChevronRight size={16} />
          <Link href="/products">Products</Link>
          {translatedProduct.category && (
            <>
              <ChevronRight size={16} />
              <Link href={`/products/${translatedProduct.category.slug}`}>
                {translatedProduct.category.name}
              </Link>
            </>
          )}
          <ChevronRight size={16} />
          <span>{translatedProduct.name}</span>
        </nav>

        {/* Main Grid */}
        <div className="product-detail__grid">
          {/* Image Gallery Section */}
          <div className="product-detail__image-section">
            <ImageGallery
              images={productImages}
              productName={translatedProduct.name}
              badge={translatedProduct.badge}
            />
          </div>

          {/* Product Info Section */}
          <div className="product-detail__info-section">
            <div className="space-y-6">
              {/* Header */}
              <div>
                {translatedProduct.category && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {translatedProduct.category.name}
                  </p>
                )}
                <h1 className="text-3xl md:text-4xl font-bold mb-3">
                  {translatedProduct.name}
                </h1>
                {translatedProduct.short_description && (
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {translatedProduct.short_description}
                  </p>
                )}
              </div>

              {/* Price */}
              <div>
                <div className="text-3xl font-bold">
                  ${product.base_price.toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('features.freeShipping')}
                </p>
              </div>

              {/* Stock Status */}
              {selectedVariant && (
                <div>
                  {selectedVariant.inventory_count > 0 ? (
                    <Badge variant="default" className="bg-green-500">
                      {t('inStock')}
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      {t('outOfStock')}
                    </Badge>
                  )}
                  {selectedVariant.inventory_count > 0 && selectedVariant.inventory_count <= 5 && (
                    <span className="text-sm text-orange-600 ml-2">
                      {t('lowStock', { count: selectedVariant.inventory_count })}
                    </span>
                  )}
                </div>
              )}

              {/* Variant Selector */}
              <VariantSelector
                availableColors={availableColors}
                selectedColor={selectedColor}
                onColorChange={handleColorChange}
                availableSizes={availableSizes}
                selectedSize={selectedSize}
                onSizeChange={handleSizeChange}
                onSizeGuideClick={() => setIsSizeGuideOpen(true)}
              />

              {/* Quantity Selector */}
              {selectedVariant && selectedVariant.inventory_count > 0 && (
                <div>
                  <label className="block text-sm font-semibold mb-3">
                    {t('quantity')}
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center border-2 border-border rounded-lg overflow-hidden">
                      <button
                        onClick={() => handleQuantityChange(-1)}
                        disabled={quantity <= 1}
                        className="p-3 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="px-6 font-semibold min-w-[60px] text-center">{quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(1)}
                        disabled={quantity >= maxAvailable}
                        className="p-3 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    {currentCartQuantity > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {currentCartQuantity} {t('inCart')}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleAddToCart}
                  disabled={!selectedVariant || isAddingToCart || maxAvailable === 0}
                  className="flex-1"
                  size="lg"
                >
                  <ShoppingCart size={20} className="mr-2" />
                  {isAddingToCart
                    ? t('adding') || 'Adding...'
                    : t('addToCart') || 'Add to Cart'}
                </Button>
                <Button
                  onClick={handleToggleFavorite}
                  variant="outline"
                  size="lg"
                  className="px-4"
                  aria-label={productIsFavorited ? t('removeFromFavorites') : t('addToFavorites')}
                >
                  <Heart
                    size={20}
                    className={productIsFavorited ? 'fill-current text-red-500' : ''}
                  />
                </Button>
              </div>

              {/* Trust Features */}
              <div className="grid grid-cols-1 gap-3 p-4 bg-muted/30 rounded-xl border border-border">
                <div className="flex items-center gap-3 text-sm">
                  <Truck size={20} className="text-primary flex-shrink-0" />
                  <span>{t('features.freeShipping')}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <RotateCcw size={20} className="text-primary flex-shrink-0" />
                  <span>{t('features.returns')}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Shield size={20} className="text-primary flex-shrink-0" />
                  <span>{t('features.secure')}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Sparkles size={20} className="text-primary flex-shrink-0" />
                  <span>{t('features.quality')}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Package2 size={20} className="text-primary flex-shrink-0" />
                  <span>{t('features.production')}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Headphones size={20} className="text-primary flex-shrink-0" />
                  <span>{t('features.support')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Tabs */}
        <ProductTabs
          description={translatedProduct.description}
          material={translatedProduct.material}
          careInstructions={translatedProduct.care_instructions}
        />
      </div>

      {/* Size Guide Modal */}
      <SizeGuideModal
        isOpen={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
      />
    </div>
  );
}
