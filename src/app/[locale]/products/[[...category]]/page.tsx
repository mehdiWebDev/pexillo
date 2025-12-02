// app/[locale]/products/[[...category]]/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductsPageClient from './ProductsPageClient';
import ProductDetailPageClient from './ProductDetailPageClient';
import { getCategoryInfo } from '@/src/services/productListingService';
import { createClient } from '@/lib/supabase/client';

// =============================================
// PAGE PROPS
// =============================================

interface PageProps {
  params: Promise<{
    locale: string;
    category?: string[];
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// =============================================
// METADATA (SEO)
// =============================================

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.category?.[0];

  // Default metadata for all products
  if (!slug) {
    return {
      title: 'All Products | Pexillo',
      description: 'Browse our complete collection of premium products. Find the perfect item for you.',
      openGraph: {
        title: 'All Products | Pexillo',
        description: 'Browse our complete collection of premium products.',
        type: 'website',
      },
    };
  }

  // Check if it's a category first
  try {
    const categoryInfo = await getCategoryInfo(slug);

    if (categoryInfo) {
      return {
        title: `${categoryInfo.name} | Pexillo`,
        description: categoryInfo.description || `Browse our ${categoryInfo.name} collection. ${categoryInfo.product_count} products available.`,
        openGraph: {
          title: `${categoryInfo.name} | Pexillo`,
          description: categoryInfo.description || `Browse our ${categoryInfo.name} collection.`,
          images: categoryInfo.image_url ? [{ url: categoryInfo.image_url }] : [],
          type: 'website',
        },
      };
    }
  } catch {
    // Not a category, might be a product
  }

  // Check if it's a product
  const supabase = createClient();
  const { data: product } = await supabase
    .from('products')
    .select('name, short_description, meta_title, meta_description, primary_image_url, base_price, discounted_price, has_discount')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (product) {
    // Use meta fields if available, fallback to product fields
    const title = product.meta_title || `${product.name} | Pexillo`;
    const description = product.meta_description ||
                       product.short_description ||
                       `Shop ${product.name} at Pexillo. Premium quality products at great prices.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: product.primary_image_url ? [{ url: product.primary_image_url }] : [],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: product.primary_image_url ? [product.primary_image_url] : [],
      },
    };
  }

  return {
    title: 'Page Not Found | Pexillo',
    description: 'The requested page could not be found.',
  };
}

// =============================================
// PAGE COMPONENT (SERVER)
// =============================================

async function checkSlugType(slug: string): Promise<'category' | 'product' | 'not_found'> {
  const supabase = createClient();

  // Check if it's a category
  const { data: category } = await supabase
    .from('categories')
    .select('slug')
    .eq('slug', slug)
    .eq('is_active', 'true')
    .single();

  if (category) {
    return 'category';
  }

  // Check if it's a product
  const { data: product } = await supabase
    .from('products')
    .select('slug')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (product) {
    return 'product';
  }

  return 'not_found';
}

export default async function ProductsPage({ params }: PageProps) {
  const resolvedParams = await params;

  const slug = resolvedParams.category?.[0];

  // If no slug, show all products
  if (!slug) {
    return <ProductsPageClient categorySlug={undefined} />;
  }

  // Check what type of slug this is
  const slugType = await checkSlugType(slug);

  switch (slugType) {
    case 'category':
      return <ProductsPageClient categorySlug={slug} />;

    case 'product':
      return <ProductDetailPageClient productSlug={slug} />;

    default:
      notFound();
  }
}