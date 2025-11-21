// src/app/[locale]/wishlist/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSelector } from 'react-redux';
import { RootState } from '@/src/store';
import { Heart, AlertCircle } from 'lucide-react';
import ProductCard from '@/src/components/product-card';
import { useFavorites } from '@/src/hooks/useFavorites';
import { Link } from '@/src/i18n/routing';

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
      <div className="wishlist-page">
        <div className="container">
          <div className="wishlist-page__header">
            <div className="skeleton skeleton--title" />
            <div className="skeleton skeleton--text" />
          </div>

          <div className="products-grid__list">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="product-card product-card--loading">
                <div className="product-card__image-container">
                  <div className="skeleton skeleton--image" />
                </div>
                <div className="product-card__info">
                  <div className="skeleton skeleton--text skeleton--text-sm" />
                  <div className="skeleton skeleton--text skeleton--text-lg" />
                  <div className="skeleton skeleton--text skeleton--text-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuth) {
    return (
      <div className="wishlist-page">
        <div className="container">
          <div className="wishlist-page__header">
            <h1 className="wishlist-page__title">
              <Heart size={32} />
              {t('title')}
            </h1>
          </div>

          <div className="empty-state">
            <Heart size={64} />
            <h3>{t('loginRequired')}</h3>
            <p>{t('loginRequiredDescription')}</p>
            <div className="empty-state__actions">
              <Link href="/auth/login" className="btn btn--primary">
                {tCommon('login')}
              </Link>
              <Link href="/auth/sign-up" className="btn btn--secondary">
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
      <div className="wishlist-page">
        <div className="container">
          <div className="wishlist-page__header">
            <h1 className="wishlist-page__title">
              <Heart size={32} />
              {t('title')}
            </h1>
          </div>

          <div className="empty-state">
            <AlertCircle size={64} className="text-red-500" />
            <h3>{t('errorLoading')}</h3>
            <p>{error}</p>
            <button onClick={fetchWishlist} className="btn btn--primary">
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
      <div className="wishlist-page">
        <div className="container">
          <div className="wishlist-page__header">
            <h1 className="wishlist-page__title">
              <Heart size={32} />
              {t('title')}
            </h1>
            <p className="wishlist-page__subtitle">{t('subtitle')}</p>
          </div>

          <div className="empty-state">
            <Heart size={64} />
            <h3>{t('emptyTitle')}</h3>
            <p>{t('emptyDescription')}</p>
            <Link href="/products" className="btn btn--primary">
              {t('startShopping')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Wishlist with products
  return (
    <div className="wishlist-page">
      <div className="container">
        <div className="wishlist-page__header">
          <div>
            <h1 className="wishlist-page__title">
              <Heart size={32} />
              {t('title')}
            </h1>
            <p className="wishlist-page__subtitle">
              {t('itemCount', { count: translatedProducts.length })}
            </p>
          </div>
        </div>

        <div className="products-grid__list">
          {translatedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={{
                ...product,
                variants: product.variants || [],
                images: product.images || [],
              }}
              showColorSwitcher={true}
              showSizePicker={false}
              showTooltips={true}
              onToggleFavorite={handleRemoveFavorite}
              isFavorite={true}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
