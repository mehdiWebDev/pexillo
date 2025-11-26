// src/components/products/ProductsHero.tsx
'use client';

import { Link } from '@/src/i18n/routing';
import { useTranslations } from 'next-intl';
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
    <section className="bg-gray-100 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Breadcrumbs */}
        <nav className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-gray-900 transition-colors">{t('home')}</Link>
          <span className="mx-1.5">/</span>
          {categorySlug && categoryInfo ? (
            <>
              <Link href="/products" className="hover:text-gray-900 transition-colors">{t('products')}</Link>
              <span className="mx-1.5">/</span>
              <span className="text-gray-900">{categoryInfo.name}</span>
            </>
          ) : (
            <span className="text-gray-900">{t('products')}</span>
          )}
        </nav>

        {/* Hero Content */}
        <div className="text-left max-w-2xl mx-auto">
          <h1 className="text-6xl md:text-7xl font-black text-black mb-3 tracking-tight">{title}</h1>
          <p className="text-base text-gray-600 mb-2 leading-relaxed">{description}</p>
          {categoryInfo && categoryInfo.product_count > 0 && (
            <p className="text-sm text-gray-400">
              {categoryInfo.product_count} {t('productsAvailable')}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}