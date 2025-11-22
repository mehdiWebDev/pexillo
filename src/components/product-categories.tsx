'use client';

import { Link } from '@/src//i18n/routing';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { ArrowRight, Shirt, Wind, Palette, Zap } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  productCount: number;
  imageUrl: string;
  accentColor: 'primary' | 'secondary' | 'accent' | 'neutral';
}

const ProductCategories = () => {
  const t = useTranslations('categories');

  const categories: Category[] = [
    {
      id: '1',
      name: t('tshirts.name'),
      slug: 't-shirts',
      description: t('tshirts.description'),
      icon: Shirt,
      productCount: 124,
      imageUrl: '/api/placeholder/600/400',
      accentColor: 'primary'
    },
    {
      id: '2',
      name: t('hoodies.name'),
      slug: 'hoodies',
      description: t('hoodies.description'),
      icon: Wind,
      productCount: 86,
      imageUrl: '/api/placeholder/600/400',
      accentColor: 'secondary'
    },
    {
      id: '3',
      name: t('sweatshirts.name'),
      slug: 'sweatshirts',
      description: t('sweatshirts.description'),
      icon: Wind,
      productCount: 92,
      imageUrl: '/api/placeholder/600/400',
      accentColor: 'accent'
    },
    {
      id: '4',
      name: t('custom.name'),
      slug: 'custom-designs',
      description: t('custom.description'),
      icon: Palette,
      productCount: 0,
      imageUrl: '/api/placeholder/600/400',
      accentColor: 'neutral'
    }
  ];

  return (
    <section className="relative bg-black border-t border-zinc-800 py-20">
      {/* Grid Background */}
      <div className="absolute inset-0 cyber-grid opacity-10"></div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        {/* Header */}
        <div className="mb-16 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-2 h-2 bg-acid-lime rounded-full animate-pulse"></div>
            <span className="font-mono text-xs text-zinc-500 uppercase">{'//'}{'/'}  COLLECTIONS</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4">
            <span className="text-white">{t('title.line1')} </span>
            <span className="text-acid-lime">{t('title.highlight')}</span>
          </h2>
          <p className="text-zinc-400 font-mono text-sm max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <Link
                key={category.id}
                href={`/products/${category.slug}`}
                className="group relative bg-zinc-900 border border-zinc-800 hover:border-acid-lime transition-all duration-300 overflow-hidden"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Icon Badge */}
                <div className="absolute top-4 left-4 z-10 w-10 h-10 bg-black border border-zinc-800 group-hover:border-acid-lime flex items-center justify-center transition-colors">
                  <Icon className="w-5 h-5 text-acid-lime" />
                </div>

                {/* Special Badge for Custom */}
                {category.slug === 'custom-designs' && (
                  <div className="absolute top-4 right-4 z-10 flex items-center gap-1 px-2 py-1 bg-acid-lime text-black text-xs font-bold uppercase">
                    <Zap className="w-3 h-3" />
                    <span>{t('custom.badge')}</span>
                  </div>
                )}

                {/* Image Container */}
                <div className="relative aspect-square overflow-hidden">
                  <Image
                    src={category.imageUrl}
                    alt={category.name}
                    width={600}
                    height={600}
                    className="object-cover filter grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-80"></div>

                  {/* Product Count Badge */}
                  {category.productCount > 0 && (
                    <div className="absolute bottom-4 left-4 px-3 py-1 bg-zinc-900/90 border border-zinc-800 text-zinc-400 font-mono text-xs">
                      {category.productCount}+ {t('products')}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6 border-t border-zinc-800 group-hover:border-acid-lime transition-colors">
                  <h3 className="text-white font-bold uppercase text-lg mb-2 group-hover:text-acid-lime transition-colors">
                    {category.name}
                  </h3>
                  <p className="text-zinc-400 text-sm font-mono mb-4 leading-relaxed">
                    {category.description}
                  </p>

                  {/* CTA */}
                  <div className="flex items-center gap-2 text-acid-lime text-sm font-bold uppercase">
                    <span>
                      {category.slug === 'custom-designs'
                        ? t('custom.cta')
                        : t('shopNow')}
                    </span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Corner Accents */}
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-transparent group-hover:border-acid-lime transition-colors"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-transparent group-hover:border-acid-lime transition-colors"></div>
              </Link>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-zinc-400 font-mono text-sm mb-6">
            {t('bottomCta.text')}
          </p>
          <Link href="/products">
            <button className="px-8 py-4 bg-acid-lime text-black font-bold uppercase text-sm tracking-wider hover:bg-white transition-colors relative group overflow-hidden">
              <span className="relative z-10 flex items-center gap-2">
                {t('bottomCta.button')}
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

export default ProductCategories;