// src/components/products/ProductsGrid.tsx
'use client';

import { useTranslations } from 'next-intl';
import ProductCard from '@/src/components/product-card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { EnhancedProduct } from '@/src/services/productListingService';

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

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="products-grid">
        <div className="products-grid__list">
          {[...Array(12)].map((_, i) => (
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
    );
  }

  // Empty state
  if (products.length === 0) {
    return (
      <div className="products-grid">
        <div className="products-grid__empty">
          <div className="empty-state">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <h3>{t('noProducts')}</h3>
            <p>{t('tryAdjusting')}</p>
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
    <div className="products-grid">
      {/* Products List */}
      <div className="products-grid__list">
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
            showTooltips={true}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination__btn pagination__btn--prev"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label={t('previousPage')}
          >
            <ChevronLeft size={20} />
            {t('previous')}
          </button>

          <div className="pagination__numbers">
            {getPaginationRange().map((page, index) => {
              if (page === '...') {
                return (
                  <span key={`ellipsis-${index}`} className="pagination__ellipsis">
                    ...
                  </span>
                );
              }

              return (
                <button
                  key={page}
                  className={`pagination__number ${
                    currentPage === page ? 'pagination__number--active' : ''
                  }`}
                  onClick={() => onPageChange(page as number)}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            className="pagination__btn pagination__btn--next"
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