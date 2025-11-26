// src/components/featured-products.tsx
'use client';

import { useState } from 'react';
import { Link } from '@/src/i18n/routing';
import { useTranslations } from 'next-intl';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useFeaturedProducts } from '@/src/hooks/useProductsQuery';
import ProductCard, { ProductCardData } from './product-card';

const FeaturedProducts = () => {
  const t = useTranslations('featuredProducts');
  const { data: products, isLoading, error } = useFeaturedProducts(8);

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
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-12">
            <h2 className="text-3xl md:text-5xl font-black text-brand-dark">
              {t('title')}
            </h2>
          </div>

          <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-brand-dark" />
          </div>
        </div>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-12">
            <h2 className="text-3xl md:text-5xl font-black text-brand-dark">
              {t('title')}
            </h2>
          </div>

          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">{t('errorLoading')}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-brand-dark text-white font-bold rounded-xl hover:-translate-y-1 transition-all"
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
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-12">
            <h2 className="text-3xl md:text-5xl font-black text-brand-dark">
              {t('title')}
            </h2>
          </div>

          <div className="text-center py-12">
            <p className="text-gray-600">{t('noProducts')}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex justify-between items-end mb-12">
          <h2 className="text-3xl md:text-5xl font-black text-brand-dark">
            {t('title')}
          </h2>
          <Link
            href="/products"
            className="hidden md:flex items-center gap-2 font-bold hover:text-brand-red transition-colors group"
          >
            {t('viewAll')}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product as ProductCardData}
              onAddToCart={handleAddToCart}
              onToggleFavorite={handleToggleFavorite}
              isLoading={loadingStates[product.id]}
              isFavorite={favoriteStates[product.id]}
              showColorSwitcher={true}
              showSizePicker={true}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
