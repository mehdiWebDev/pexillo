// src/app/[locale]/products/[slug]/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { use } from 'react';
import { useRouter } from '@/src/i18n/routing';
import { Link } from '@/src/i18n/routing';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/src/components/ui/button';
import {
  Heart
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

interface ApiProductImage {
  id?: string;
  image_url: string;
  alt_text?: string;
  is_primary?: boolean;
  view_type?: 'front' | 'back' | 'side' | 'detail';
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
  badge?: 'NEW' | 'HOT' | 'SALE' | 'LIMITED' | null;
  base_price: number;
  primary_image_url: string;
  translations?: Record<string, {
    name?: string;
    short_description?: string;
    description?: string;
    material?: string;
    care_instructions?: string;
    badge?: 'NEW' | 'HOT' | 'SALE' | 'LIMITED' | null;
  }>;
  variants: ProductVariant[];
  images?: ApiProductImage[];
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
      categories: product.categories ? {
        ...product.categories,
        name: product.categories.translations?.[locale]?.name || product.categories.name
      } : product.categories
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
    if (!product || !selectedVariant) {
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
        name: translatedProduct!.name,
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

  if (!product || !translatedProduct) {
    return null;
  }

  type GalleryImage = {
    id?: string;
    image_url: string;
    alt_text: string;
    is_primary?: boolean;
    view_type?: 'front' | 'back' | 'side' | 'detail';
  };

  const availableColors = getAvailableColors(product.variants);
  const availableSizes = getAvailableSizes(selectedColor);
  const rawImages = (product.images && product.images.length > 0)
    ? product.images
    : [{ image_url: product.primary_image_url, alt_text: translatedProduct.name }];
  const productImages: GalleryImage[] = rawImages.map((img: ApiProductImage | { image_url: string; alt_text: string }) => ({
    id: 'id' in img ? img.id : undefined,
    image_url: img.image_url,
    alt_text: img.alt_text ?? translatedProduct.name,
    is_primary: 'is_primary' in img ? img.is_primary : undefined,
    view_type: 'view_type' in img ? img.view_type : undefined,
  }));

  const productIsFavorited = isFavorite(product.id);

  return (
    <div className="bg-white min-h-screen">
      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
        <nav className="text-[10px] font-bold text-gray-400 uppercase tracking-wider" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-gray-900 transition-colors">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/products" className="hover:text-gray-900 transition-colors">Shop</Link>
          {translatedProduct.categories && (
            <>
              <span className="mx-1.5">/</span>
              <Link href={`/products/${translatedProduct.categories.slug}`} className="hover:text-gray-900 transition-colors">
                {translatedProduct.categories.name}
              </Link>
            </>
          )}
          <span className="mx-1.5">/</span>
          <span className="text-gray-900">{translatedProduct.name}</span>
        </nav>
      </div>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Image Gallery Section */}
          <div className="lg:col-span-7">
            <ImageGallery
              images={productImages}
              productName={translatedProduct.name}
              badge={translatedProduct.badge as 'NEW' | 'HOT' | 'SALE' | 'LIMITED' | null | undefined}
            />
          </div>

          {/* Product Info Section */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 space-y-5">
              {/* Header */}
              <div className="border-b border-gray-100 pb-6">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    {translatedProduct.badge && (
                      <span className="bg-gray-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded inline-block mb-2 transform -rotate-1">
                        {translatedProduct.badge}
                      </span>
                    )}
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-none tracking-tight mb-1.5">
                      {translatedProduct.name}
                    </h1>
                    {translatedProduct.short_description && (
                      <p className="text-gray-500 font-medium text-sm">
                        {translatedProduct.short_description}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handleToggleFavorite}
                    variant="outline"
                    size="lg"
                    className="p-2.5 rounded-full border-2 border-gray-200 hover:border-red-500 hover:text-red-500 flex-shrink-0"
                    aria-label={productIsFavorited ? t('removeFromFavorites') : t('addToFavorites')}
                  >
                    <Heart
                      size={20}
                      className={productIsFavorited ? 'fill-current text-red-500' : ''}
                    />
                  </Button>
                </div>

                <div className="flex items-end gap-3 mt-4">
                  <span className="text-2xl font-black text-gray-900">
                    ${product.base_price.toFixed(2)}
                  </span>
                  <div className="flex items-center gap-1 text-xs font-bold text-gray-900 mb-0.5">
                    <div className="flex text-gray-900 text-sm">
                      ★★★★★
                    </div>
                    <span className="underline decoration-2 decoration-gray-200 ml-1">128 Reviews</span>
                  </div>
                </div>
              </div>

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

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={!selectedVariant || isAddingToCart || maxAvailable === 0}
                  className="w-full py-3.5 bg-gray-900 text-white font-black rounded-xl hover:bg-gray-800 transition-all flex justify-center items-center gap-2.5 shadow-lg hover:-translate-y-1 text-base disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed"
                >
                  <span>{isAddingToCart ? t('adding') || 'Adding...' : t('addToCart') || 'Add to Bag'}</span>
                  <span className="w-1 h-1 bg-white rounded-full opacity-50"></span>
                  <span>${product.base_price.toFixed(2)}</span>
                </button>

                {selectedVariant && selectedVariant.inventory_count > 0 && selectedVariant.inventory_count <= 12 && (
                  <div className="bg-red-50 text-red-600 px-3 py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-bold border border-red-100">
                    <span className="animate-pulse">🔥</span>
                    Selling fast! {selectedVariant.inventory_count} left in stock.
                  </div>
                )}
              </div>

              {/* Details Accordion */}
              <ProductTabs
                description={translatedProduct.description}
                material={translatedProduct.material}
                careInstructions={translatedProduct.care_instructions}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Size Guide Modal */}
      <SizeGuideModal
        isOpen={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
      />
    </div>
  );
}
