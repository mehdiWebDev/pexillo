// src/components/products/ProductsHero.tsx
'use client';

import { Link } from '@/src/i18n/routing';
import { useTranslations } from 'next-intl';
import { ChevronRight, Home, Package } from 'lucide-react';
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
    <section className="relative bg-black border-b border-zinc-800 py-12">
      {/* Grid Background */}
      <div className="absolute inset-0 cyber-grid opacity-10"></div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        {/* Breadcrumbs */}
        <nav className="mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm font-mono">
            <li>
              <Link href="/" className="flex items-center gap-2 text-zinc-300 hover:text-acid-lime transition-colors">
                <Home size={14} />
                <span>{t('home')}</span>
              </Link>
            </li>
            <ChevronRight size={14} className="text-zinc-600" />
            <li>
              <Link href="/products" className="text-zinc-300 hover:text-acid-lime transition-colors">
                {t('products')}
              </Link>
            </li>
            {categorySlug && categoryInfo && (
              <>
                <ChevronRight size={14} className="text-zinc-600" />
                <li className="text-white font-bold">
                  {categoryInfo.name}
                </li>
              </>
            )}
          </ol>
        </nav>

        {/* Hero Content */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-acid-lime rounded-full animate-pulse"></div>
            <span className="font-mono text-xs text-zinc-500 uppercase">{'//'}{'/'}  CATALOG</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter text-white">
            {title}
          </h1>

          <p className="text-zinc-300 font-mono text-sm max-w-2xl border-l-2 border-acid-lime pl-4">
            {description}
          </p>

          {categoryInfo && categoryInfo.product_count > 0 && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800">
              <Package size={16} className="text-acid-lime" />
              <span className="text-zinc-200 font-mono text-sm">
                {categoryInfo.product_count} {t('productsAvailable')}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}