// src/components/products/ProductsGrid.tsx
'use client';

import { useTranslations } from 'next-intl';
import ProductCard from '@/src/components/product-card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { EnhancedProduct } from '@/src/services/productListingService';
import { useFavorites } from '@/src/hooks/useFavorites';

interface ProductsGridProps {
  products: EnhancedProduct[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function ProductsGrid({
  products,
  isLoading,
  currentPage,
  totalPages,
  onPageChange,
}: ProductsGridProps) {
  const t = useTranslations('productsGrid');
  const { toggleFavorite, isFavorite } = useFavorites();

  // Loading skeleton
  if (isLoading) {
    return (
      <div>
        <div className="grid grid-cols-3 gap-6 mb-12">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="flex flex-col">
              <div className="aspect-[4/5] bg-gray-200 rounded-2xl mb-4 animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-3/5 bg-gray-200 rounded animate-pulse" />
                <div className="h-5 w-4/5 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-2/5 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (products.length === 0) {
    return (
      <div>
        <div className="col-span-full py-16">
          <div className="text-center max-w-md mx-auto">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-6 text-gray-300"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <h3 className="text-xl font-semibold text-black mb-2">{t('noProducts')}</h3>
            <p className="text-sm text-gray-600">{t('tryAdjusting')}</p>
          </div>
        </div>
      </div>
    );
  }

  // Generate pagination range
  const getPaginationRange = () => {
    const range: (number | string)[] = [];
    const showPages = 5; // Show 5 page numbers at a time

    if (totalPages <= showPages + 2) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        range.push(i);
      }
    } else {
      // Always show first page
      range.push(1);

      if (currentPage > 3) {
        range.push('...');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        range.push(i);
      }

      if (currentPage < totalPages - 2) {
        range.push('...');
      }

      // Always show last page
      range.push(totalPages);
    }

    return range;
  };

  return (
    <div>
      {/* Products List */}
      <div className="grid grid-cols-3 gap-6 mb-12">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={{
              ...product,
              variants: product.variants || [],
              images: product.images || [],
            }}
            showColorSwitcher={true}
            showSizePicker={false}
            onToggleFavorite={toggleFavorite}
            isFavorite={isFavorite(product.id)}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-8 border-t border-gray-200">
          <button
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-black disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label={t('previousPage')}
          >
            <ChevronLeft size={20} />
            {t('previous')}
          </button>

          <div className="flex items-center gap-1.5">
            {getPaginationRange().map((page, index) => {
              if (page === '...') {
                return (
                  <span key={`ellipsis-${index}`} className="w-10 text-center text-gray-400 text-sm">
                    ...
                  </span>
                );
              }

              return (
                <button
                  key={page}
                  className={`w-10 h-10 flex items-center justify-center bg-white border rounded-md text-sm font-medium transition-all ${
                    currentPage === page
                      ? 'bg-black border-black text-white'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-black'
                  }`}
                  onClick={() => onPageChange(page as number)}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-black disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label={t('nextPage')}
          >
            {t('next')}
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}