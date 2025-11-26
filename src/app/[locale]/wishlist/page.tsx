// src/app/[locale]/wishlist/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSelector } from 'react-redux';
import { RootState } from '@/src/store';
import { Heart, AlertCircle, X, Loader2 } from 'lucide-react';
import { useFavorites } from '@/src/hooks/useFavorites';
import { Link } from '@/src/i18n/routing';
import PageHeader from '@/src/components/PageHeader';
import Image from 'next/image';

interface ProductVariant {
  id: string;
  color: string;
  color_hex: string;
  size: string;
  inventory_count: number;
  translations?: Record<string, {
    color?: string;
    size_label?: string;
  }>;
}

interface ProductImage {
  id: string;
  image_url: string;
  alt_text: string;
  is_primary: boolean;
  variant_id?: string;
  view_type?: 'front' | 'back' | 'side' | 'detail';
}

interface Category {
  id: string;
  name: string;
  slug: string;
  translations?: Record<string, {
    name?: string;
  }>;
}

interface WishlistProduct {
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
  category?: Category;
  variants?: ProductVariant[];
  images?: ProductImage[];
  translations?: Record<string, {
    name?: string;
    short_description?: string;
    description?: string;
    material?: string;
    care_instructions?: string;
    badge?: string;
    tags?: string[];
  }>;
  wishlist_id: string;
  added_to_wishlist: string;
}

export default function WishlistPage() {
  const t = useTranslations('wishlist');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { isAuth, user } = useSelector((state: RootState) => state.auth);
  const { toggleFavorite } = useFavorites();

  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuth && user?.id) {
      fetchWishlist();
    } else {
      // For guest users, we don't have product details
      setLoading(false);
    }
  }, [isAuth, user?.id]);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/wishlist');

      if (!response.ok) {
        throw new Error('Failed to fetch wishlist');
      }

      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error('Error fetching wishlist:', err);
      setError('Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (productId: string) => {
    await toggleFavorite(productId);
    // Refresh the list
    if (isAuth && user?.id) {
      fetchWishlist();
    }
  };

  // Apply translations inline - same as ProductsPageClient
  const translatedProducts = useMemo(() => {
    if (locale === 'en') return products;

    return products.map(product => {
      const trans = product.translations?.[locale] || {};
      return {
        ...product,
        // Apply JSONB translations
        name: trans.name || product.name,
        short_description: trans.short_description || product.short_description,
        badge: (trans.badge as 'NEW' | 'HOT' | 'SALE' | 'LIMITED' | null | undefined) || product.badge,
        // Translate variants
        variants: product.variants?.map((v: ProductVariant) => ({
          ...v,
          color_translated: v.translations?.[locale]?.color || v.color,
          size_label: v.translations?.[locale]?.size_label || v.size,
        })) || [],
      };
    });
  }, [products, locale]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <PageHeader
          badge={t('headerBadge')}
          title={t('headerTitle')}
          description={t('headerDescription')}
        />
        <div className="max-w-7xl mx-auto px-4 py-16 flex-1 w-full">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-brand-red" />
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuth) {
    return (
      <div className="min-h-screen flex flex-col">
        <PageHeader
          badge={t('headerBadge')}
          title={t('headerTitle')}
          description={t('headerDescription')}
        />
        <div className="max-w-7xl mx-auto px-4 py-16 flex-1 w-full">
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
            <Heart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="font-black text-2xl text-brand-dark mb-2">{t('loginRequired')}</h3>
            <p className="text-gray-500 mb-6">{t('loginRequiredDescription')}</p>
            <div className="flex gap-3 justify-center">
              <Link href="/auth/login" className="px-6 py-3 bg-brand-dark text-white font-bold rounded-xl hover:bg-brand-red transition-colors">
                {tCommon('login')}
              </Link>
              <Link href="/auth/sign-up" className="px-6 py-3 border-2 border-gray-200 text-brand-dark font-bold rounded-xl hover:border-brand-dark transition-colors">
                {tCommon('signup')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <PageHeader
          badge={t('headerBadge')}
          title={t('headerTitle')}
          description={t('headerDescription')}
        />
        <div className="max-w-7xl mx-auto px-4 py-16 flex-1 w-full">
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h3 className="font-black text-2xl text-brand-dark mb-2">{t('errorLoading')}</h3>
            <p className="text-gray-500 mb-6">{error}</p>
            <button onClick={fetchWishlist} className="px-6 py-3 bg-brand-dark text-white font-bold rounded-xl hover:bg-brand-red transition-colors">
              {tCommon('retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (translatedProducts.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <PageHeader
          badge={t('headerBadge')}
          title={t('headerTitle')}
          description={t('headerDescription')}
        />
        <div className="max-w-7xl mx-auto px-4 py-16 flex-1 w-full">
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
            <Heart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="font-black text-2xl text-brand-dark mb-2">{t('emptyTitle')}</h3>
            <p className="text-gray-500 mb-6">{t('emptyDescription')}</p>
            <Link href="/products" className="px-6 py-3 bg-brand-dark text-white font-bold rounded-xl hover:bg-brand-red transition-colors inline-block">
              {t('startShopping')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Wishlist with products
  return (
    <div className="min-h-screen flex flex-col">
      <PageHeader
        badge={t('headerBadge')}
        title={t('headerTitle')}
        description={t('itemCount', { count: translatedProducts.length })}
      />
      <div className="max-w-7xl mx-auto px-4 py-16 flex-1 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {translatedProducts.map((product) => {
            const primaryImage = product.images?.find((img) => img.is_primary)?.image_url || product.primary_image_url;
            const translatedName = product.translations?.[locale]?.name || product.name;
            const translatedShortDesc = product.translations?.[locale]?.short_description || product.short_description;
            const translatedBadge = product.translations?.[locale]?.badge || product.badge;
            const displayPrice = product.has_discount ? product.discounted_price : product.base_price;
            const categoryName = product.category?.translations?.[locale]?.name || product.category?.name;

            // Count unique sizes and colors
            const uniqueSizes = [...new Set(product.variants?.map(v => v.size) || [])].length;
            const uniqueColors = [...new Set(product.variants?.map(v => v.color) || [])].length;

            return (
              <div key={product.id} className="group cursor-pointer h-full flex flex-col">
                <div className="relative flex-1 bg-white border-2 border-gray-200 rounded-2xl overflow-hidden flex flex-col hover:border-brand-red transition-colors">
                  {/* Product Image */}
                  <Link href={`/products/${product.slug}`} className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                    <Image
                      src={primaryImage}
                      alt={translatedName}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Badge */}
                    {translatedBadge && (
                      <div className="absolute top-3 left-3 bg-brand-red text-white px-3 py-1 rounded-full text-xs font-black uppercase">
                        {translatedBadge}
                      </div>
                    )}

                    {/* Stock Status Badge */}
                    {!product.in_stock && (
                      <div className="absolute bottom-3 left-3 bg-gray-900 text-white px-3 py-1 rounded-full text-xs font-bold">
                        {t('outOfStock')}
                      </div>
                    )}

                    {/* Remove Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleRemoveFavorite(product.id);
                      }}
                      className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md text-brand-red hover:bg-brand-red hover:text-white transition-colors z-10"
                      aria-label={t('removeFromWishlist')}
                      title={t('remove')}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </Link>

                  {/* Product Info */}
                  <div className="p-4 flex-1 flex flex-col">
                    {/* Category */}
                    {categoryName && (
                      <Link
                        href={`/products?category=${product.category?.slug}`}
                        className="text-xs font-bold text-gray-500 uppercase tracking-wider hover:text-brand-red transition-colors mb-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {categoryName}
                      </Link>
                    )}

                    {/* Product Name */}
                    <Link href={`/products/${product.slug}`}>
                      <h3 className="font-black text-lg text-brand-dark mb-2 hover:text-brand-red transition-colors">
                        {translatedName}
                      </h3>
                    </Link>

                    {/* Short Description */}
                    {translatedShortDesc && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {translatedShortDesc}
                      </p>
                    )}

                    {/* Variants Info */}
                    <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
                      {uniqueColors > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full bg-gradient-to-r from-red-500 via-blue-500 to-green-500"></span>
                          {uniqueColors} {uniqueColors === 1 ? t('color') : t('colors')}
                        </span>
                      )}
                      {uniqueSizes > 0 && (
                        <span>
                          {uniqueSizes} {uniqueSizes === 1 ? t('size') : t('sizes')}
                        </span>
                      )}
                    </div>

                    {/* Price and Discount */}
                    <div className="mt-auto">
                      <div className="flex items-center gap-2 mb-2">
                        {product.has_discount ? (
                          <>
                            <span className="font-black text-xl text-brand-dark">${displayPrice.toFixed(2)}</span>
                            <span className="text-sm text-gray-400 line-through">${product.base_price.toFixed(2)}</span>
                            <span className="text-xs font-bold text-white bg-brand-red px-2 py-1 rounded-full">
                              -{product.discount_percentage}%
                            </span>
                          </>
                        ) : (
                          <span className="font-black text-xl text-brand-dark">${displayPrice.toFixed(2)}</span>
                        )}
                      </div>

                      {/* Stock Status Text */}
                      <div className="flex items-center justify-between">
                        {product.in_stock ? (
                          <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                            {t('inStock')}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                            <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                            {t('outOfStock')}
                          </span>
                        )}

                        {/* Added to Wishlist Date */}
                        <span className="text-xs text-gray-400">
                          {t('added')} {new Date(product.added_to_wishlist).toLocaleDateString(locale === 'fr' ? 'fr-CA' : 'en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
