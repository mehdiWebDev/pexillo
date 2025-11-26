'use client';

import { useState, useEffect } from 'react';
import { Link } from '@/src/i18n/routing';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { ArrowRight, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  translations?: Record<string, {
    name?: string;
    description?: string;
  }>;
}

// Fallback images for categories without images
const FALLBACK_IMAGES: Record<string, string> = {
  'tees': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=800&auto=format&fit=crop',
  't-shirts': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=800&auto=format&fit=crop',
  'hoodies': 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=800&auto=format&fit=crop',
  'headwear': 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=800&auto=format&fit=crop',
  'accessories': 'https://images.unsplash.com/photo-1627123424574-181ce5171c2f?q=80&w=800&auto=format&fit=crop',
};

const ProductCategories = () => {
  const t = useTranslations('categories');
  const locale = useLocale();
  const supabase = createClient();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (error) throw error;

        setCategories(data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [supabase]);

  const getCategoryName = (category: Category) => {
    // Use translation if available for current locale
    if (category.translations && category.translations[locale]?.name) {
      return category.translations[locale].name;
    }
    return category.name;
  };

  const getCategoryImage = (category: Category) => {
    // Use database image if available
    if (category.image_url) {
      return category.image_url;
    }

    // Fallback to predefined images based on slug
    const slugLower = category.slug.toLowerCase();
    return FALLBACK_IMAGES[slugLower] || FALLBACK_IMAGES['tees'];
  };

  if (loading) {
    return (
      <section className="py-16 bg-brand-gray border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-brand-dark" />
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-brand-gray border-y border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/products/${category.slug}`}
              className="group relative aspect-[3/4] overflow-hidden rounded-2xl border-2 border-transparent hover:border-brand-dark transition-all"
            >
              <Image
                src={getCategoryImage(category)}
                alt={getCategoryName(category)}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
              <div className="absolute bottom-6 left-6">
                <span className="text-white font-black text-2xl uppercase tracking-wider">
                  {getCategoryName(category)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductCategories;
