// app/[locale]/products/[[...category]]/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductsPageClient from './ProductsPageClient';
import { getCategoryInfo } from '@/src/services/productListingService';

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
  const categorySlug = resolvedParams.category?.[0];

  // Default metadata for all products
  if (!categorySlug) {
    return {
      title: 'All Products | Your Store Name',
      description: 'Browse our complete collection of premium products. Find the perfect item for you.',
      openGraph: {
        title: 'All Products | Your Store Name',
        description: 'Browse our complete collection of premium products.',
        type: 'website',
      },
    };
  }

  // Category-specific metadata
  try {
    const categoryInfo = await getCategoryInfo(categorySlug);

    console.log('categoryInfo', categoryInfo);

    if (!categoryInfo) {
      return {
        title: 'Category Not Found',
        description: 'The requested category could not be found.',
      };
    }

    return {
      title: `${categoryInfo.name} | Your Store Name`,
      description: categoryInfo.description || `Browse our ${categoryInfo.name} collection. ${categoryInfo.product_count} products available.`,
      openGraph: {
        title: `${categoryInfo.name} | Your Store Name`,
        description: categoryInfo.description || `Browse our ${categoryInfo.name} collection.`,
        images: categoryInfo.image_url ? [{ url: categoryInfo.image_url }] : [],
        type: 'website',
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Products | Your Store Name',
      description: 'Browse our product collection.',
    };
  }
}

// =============================================
// PAGE COMPONENT (SERVER)
// =============================================

export default async function ProductsPage({ params }: PageProps) {
  const resolvedParams = await params;
  const categorySlug = resolvedParams.category?.[0];

  // Verify category exists if provided
  if (categorySlug) {
    try {
      const categoryInfo = await getCategoryInfo(categorySlug);
      if (!categoryInfo) {
        notFound();
      }
    } catch (error) {
      console.error('Error fetching category:', error);
      notFound();
    }
  }

  return <ProductsPageClient categorySlug={categorySlug} />;
}