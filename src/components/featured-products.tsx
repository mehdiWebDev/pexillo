// src/components/featured-products.tsx
'use client';

import { useState } from 'react';
import { Link } from '@/src/i18n/routing';
import { useTranslations } from 'next-intl';
import { ArrowRight, Zap } from 'lucide-react';
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
      <section className="relative bg-black border-t border-zinc-800 py-20">
        <div className="absolute inset-0 cyber-grid opacity-10"></div>
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="flex justify-between items-end mb-12 border-b border-zinc-800 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-acid-lime rounded-full animate-pulse"></div>
                <span className="font-mono text-xs text-zinc-500 uppercase">{'//'}{'/'}  LOADING</span>
              </div>
              <div className="h-12 w-64 bg-zinc-900 animate-pulse"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 aspect-[3/4] animate-pulse"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className="relative bg-black border-t border-zinc-800 py-20">
        <div className="absolute inset-0 cyber-grid opacity-10"></div>
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="text-center py-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 mb-6">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="font-mono text-xs text-red-400 uppercase">ERROR</span>
            </div>
            <p className="text-zinc-400 mb-6">{t('errorLoading')}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-acid-lime text-black font-bold uppercase text-sm tracking-wider hover:bg-white transition-colors"
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
      <section className="relative bg-black border-t border-zinc-800 py-20">
        <div className="absolute inset-0 cyber-grid opacity-10"></div>
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="text-center py-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 mb-6">
              <div className="w-2 h-2 bg-zinc-600 rounded-full"></div>
              <span className="font-mono text-xs text-zinc-500 uppercase">NO DATA</span>
            </div>
            <p className="text-zinc-400">{t('noProducts')}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative bg-black border-t border-zinc-800 py-20">
      {/* Grid Background */}
      <div className="absolute inset-0 cyber-grid opacity-10"></div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="flex justify-between items-end mb-12 border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-acid-lime rounded-full animate-pulse"></div>
              <span className="font-mono text-xs text-zinc-500 uppercase">{'//'}{'/'}  CATALOG</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">
              <span className="text-white">{t('title')} </span>
              <span className="text-acid-lime">{t('titleAccent')}</span>
            </h2>
          </div>

          <Link href="/products">
            <button className="hidden md:flex items-center gap-2 px-6 py-3 bg-zinc-900 border border-zinc-800 text-white font-bold uppercase text-sm tracking-wider hover:border-acid-lime hover:bg-zinc-800 transition-all">
              {t('viewAll')}
              <ArrowRight size={16} />
            </button>
          </Link>
        </div>

        {/* Products Grid - 4 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-zinc-400 font-mono text-sm mb-6">{t('moreProducts')}</p>
          <Link href="/products">
            <button className="px-8 py-4 bg-acid-lime text-black font-bold uppercase text-sm tracking-wider hover:bg-white transition-colors relative group overflow-hidden">
              <span className="relative z-10 flex items-center gap-2">
                <Zap size={16} />
                {t('exploreAll')}
                <ArrowRight size={16} />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;