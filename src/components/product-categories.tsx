'use client';

import { Link } from '@/src//i18n/routing';
import { useTranslations } from 'next-intl';
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
    <section className="product-categories">
      <div className="product-categories__container">
        {/* Header */}
        <div className="product-categories__header">
          <div className="product-categories__title-wrapper">
            <h2 className="product-categories__title">
              {t('title.line1')}
              <span className="product-categories__title-accent">
                {t('title.highlight')}
              </span>
            </h2>
            <div className="product-categories__title-underline" />
          </div>
          <p className="product-categories__subtitle">
            {t('subtitle')}
          </p>
        </div>

        {/* Categories Grid */}
        <div className="product-categories__grid">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <Link
                key={category.id}
                href={`/products/${category.slug}`}
                className={`category-card category-card--${category.accentColor}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Icon Badge */}
                <div className="category-card__icon-badge">
                  <Icon className="w-6 h-6" />
                </div>

                {/* Image Container */}
                <div className="category-card__image-container">
                  <img
                    src={category.imageUrl}
                    alt={category.name}
                    className="category-card__image"
                  />
                  <div className="category-card__overlay" />
                  
                  {/* Product Count Badge */}
                  {category.productCount > 0 && (
                    <div className="category-card__count">
                      {category.productCount}+ {t('products')}
                    </div>
                  )}
                  
                  {/* Special Badge for Custom */}
                  {category.slug === 'custom-designs' && (
                    <div className="category-card__special-badge">
                      <Zap className="w-4 h-4" />
                      <span>{t('custom.badge')}</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="category-card__content">
                  <h3 className="category-card__name">{category.name}</h3>
                  <p className="category-card__description">
                    {category.description}
                  </p>
                  
                  {/* CTA */}
                  <div className="category-card__cta">
                    <span className="category-card__cta-text">
                      {category.slug === 'custom-designs' 
                        ? t('custom.cta') 
                        : t('shopNow')}
                    </span>
                    <ArrowRight className="category-card__cta-icon" />
                  </div>
                </div>

                {/* Decorative Corner */}
                <div className="category-card__corner" />
              </Link>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="product-categories__bottom-cta">
          <div className="product-categories__cta-content">
            <p className="product-categories__cta-text">
              {t('bottomCta.text')}
            </p>
            <Link href="/products" className="btn btn--brutalist btn--lg">
              {t('bottomCta.button')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductCategories;