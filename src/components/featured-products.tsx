// src/components/featured-products.tsx
'use client';

import { useState } from 'react';
import { Link } from '@/src/i18n/routing';
import { useTranslations } from 'next-intl';
import { TrendingUp } from 'lucide-react';
import { useFeaturedProducts } from '@/src/hooks/useProductsQuery';
import ProductCard, { ProductCardData } from './product-card';

const FeaturedProducts = () => {
  const t = useTranslations('featuredProducts');
  const { data: products, isLoading, error } = useFeaturedProducts(6);

  console.log(products);

  const [loadingStates, setLoadingStates] = useState<{ [key: string]: boolean }>({});
  const [favoriteStates, setFavoriteStates] = useState<{ [key: string]: boolean }>({});

  const handleAddToCart = async (productId: string, selectedColor?: string, selectedSize?: string) => {
    setLoadingStates(prev => ({ ...prev, [productId]: true }));

    try {
      // TODO: Implement your cart logic here
      console.log('Adding to cart:', { productId, selectedColor, selectedSize });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, [productId]: false }));
    }
  };

  const handleToggleFavorite = async (productId: string) => {
    const isCurrentlyFavorite = favoriteStates[productId];

    // Optimistic update
    setFavoriteStates(prev => ({ ...prev, [productId]: !prev[productId] }));

    try {
      // TODO: Implement your wishlist logic here
      console.log('Toggled favorite for:', productId);
    } catch (error) {
      // Revert on error
      setFavoriteStates(prev => ({ ...prev, [productId]: isCurrentlyFavorite }));
      console.error('Error toggling favorite:', error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <section className="featured-products">
        <div className="featured-products__container">
          <div className="featured-products__header">
            <div className="featured-products__title-wrapper">
              <h2 className="featured-products__title">
                {t('title')}
                <span className="featured-products__title-accent">
                  {t('titleAccent')}
                </span>
              </h2>
              <div className="featured-products__title-underline" />
            </div>
          </div>

          {/* Loading skeleton */}
          <div className="featured-products__grid">
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
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className="featured-products">
        <div className="featured-products__container">
          <div className="featured-products__header">
            <div className="featured-products__title-wrapper">
              <h2 className="featured-products__title">
                {t('title')}
                <span className="featured-products__title-accent">
                  {t('titleAccent')}
                </span>
              </h2>
            </div>
          </div>

          <div className="error-message">
            <p>{t('errorLoading')}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn--primary btn--sm"
            >
              {t('retry')}
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Empty state
  if (!products || products.length === 0) {
    return (
      <section className="featured-products">
        <div className="featured-products__container">
          <div className="featured-products__header">
            <div className="featured-products__title-wrapper">
              <h2 className="featured-products__title">
                {t('title')}
                <span className="featured-products__title-accent">
                  {t('titleAccent')}
                </span>
              </h2>
            </div>
          </div>

          <div className="empty-state">
            <p>{t('noProducts')}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="featured-products">
      <div className="featured-products__container">
        {/* Section Header */}
        <div className="featured-products__header">
          <div className="featured-products__title-wrapper">
            <h2 className="featured-products__title">
              {t('title')}
              <span className="featured-products__title-accent">
                {t('titleAccent')}
              </span>
            </h2>
            <div className="featured-products__title-underline" />
          </div>

          <div className="featured-products__header-actions">
            <Link href="/products" className="btn btn--outline-primary btn--md btn--responsive">
              {t('viewAll')}
              <TrendingUp className="btn__icon" />
            </Link>
          </div>
        </div>

        {/* Products Grid */}
        <div className="featured-products__grid">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product as ProductCardData}
              onAddToCart={handleAddToCart}
              onToggleFavorite={handleToggleFavorite}
              isLoading={loadingStates[product.id]}
              isFavorite={favoriteStates[product.id]}
              showColorSwitcher={true} // Enable when you have variant data
              showSizePicker={true}     // Enable when you have variant data
            />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="featured-products__bottom-cta">
          <p className="featured-products__cta-text">{t('moreProducts')}</p>
          <Link href="/products" className="btn btn--accent btn--lg btn--brutalist">
            {t('exploreAll')}
            <TrendingUp size={20} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;