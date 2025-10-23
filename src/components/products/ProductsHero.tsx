// src/components/products/ProductsHero.tsx
'use client';

import { Link } from '@/src/i18n/routing';
import { useTranslations } from 'next-intl';
import { ChevronRight, Home } from 'lucide-react';
import type { CategoryInfo } from '@/src/services/productListingService';

interface ProductsHeroProps {
  categoryInfo?: CategoryInfo | null;
  categorySlug?: string;
}

export default function ProductsHero({ categoryInfo, categorySlug }: ProductsHeroProps) {
  const t = useTranslations('breadcrumbs');

  // Determine hero content
  const title = categoryInfo?.name || t('allProducts');
  const description = categoryInfo?.description || t('browseCollection');

  return (
    <section className="products-hero">
      <div className="products-hero__container">
        {/* Breadcrumbs */}
        <nav className="products-hero__breadcrumbs" aria-label="Breadcrumb">
          <ol className="breadcrumbs">
            <li className="breadcrumbs__item">
              <Link href="/" className="breadcrumbs__link">
                <Home size={16} />
                <span>{t('home')}</span>
              </Link>
            </li>
            <ChevronRight size={16} className="breadcrumbs__separator" />
            <li className="breadcrumbs__item">
              <Link href="/products" className="breadcrumbs__link">
                {t('products')}
              </Link>
            </li>
            {categorySlug && categoryInfo && (
              <>
                <ChevronRight size={16} className="breadcrumbs__separator" />
                <li className="breadcrumbs__item breadcrumbs__item--active">
                  <span>{categoryInfo.name}</span>
                </li>
              </>
            )}
          </ol>
        </nav>

        {/* Hero Content */}
        <div className="products-hero__content">
          <h1 className="products-hero__title">{title}</h1>
          <p className="products-hero__description">{description}</p>
          {categoryInfo && categoryInfo.product_count > 0 && (
            <p className="products-hero__count">
              {categoryInfo.product_count} {t('productsAvailable')}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}