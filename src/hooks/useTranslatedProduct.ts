// src/hooks/useTranslateProducts.ts
import { useMemo } from 'react';
import { useLocale } from 'next-intl';

interface ProductVariant {
  id: string;
  color: string;
  size: string;
  translations?: Record<string, {
    color?: string;
    size_label?: string;
  }>;
  [key: string]: unknown;
}

interface Product {
  id: string;
  name: string;
  short_description?: string;
  description?: string;
  material?: string;
  care_instructions?: string;
  badge?: string;
  tags?: string[];
  meta_title?: string;
  meta_description?: string;
  translations?: Record<string, {
    name?: string;
    short_description?: string;
    material?: string;
    care_instructions?: string;
    badge?: string;
    tags?: string[];
  }>;
  variants?: ProductVariant[];
  [key: string]: unknown;
}

/**
 * Fixed version - NO infinite loops!
 * Uses useMemo instead of useEffect to prevent re-renders
 */
export function useTranslateProducts(products: Product[]) {
  const locale = useLocale();

  const translatedProducts = useMemo(() => {
    // If English or no products, return original
    if (!products || products.length === 0 || locale === 'en') {
      return products || [];
    }

    // Apply translations synchronously - no async, no setState!
    return products.map(product => {
      // Get JSONB translations directly from the product
      const translations = product.translations?.[locale] || {};
      
      return {
        ...product,
        // Apply JSONB translations
        name: translations.name || product.name,
        short_description: translations.short_description || product.short_description,
        material: translations.material || product.material,
        care_instructions: translations.care_instructions || product.care_instructions,
        badge: translations.badge || product.badge,
        tags: translations.tags || product.tags,
        
        // For rich content, use what's in the product (will need separate handling)
        description: product.description,
        meta_title: product.meta_title,
        meta_description: product.meta_description,
        
        // Translate variants
        variants: product.variants?.map((variant: ProductVariant) => ({
          ...variant,
          color_translated: variant.translations?.[locale]?.color || variant.color,
          size_label: variant.translations?.[locale]?.size_label || variant.size,
        })) || [],
      };
    });
  }, [products, locale]); // Safe dependencies - no infinite loop!

  return { 
    products: translatedProducts,
    isTranslating: false 
  };
}

/**
 * Even simpler version - just a pure function, no hooks needed
 */
export function translateProducts(products: Product[], locale: string) {
  if (!products || products.length === 0 || locale === 'en') {
    return products || [];
  }

  return products.map(product => {
    const translations = product.translations?.[locale] || {};

    return {
      ...product,
      name: translations.name || product.name,
      short_description: translations.short_description || product.short_description,
      material: translations.material || product.material,
      care_instructions: translations.care_instructions || product.care_instructions,
      badge: translations.badge || product.badge,
      tags: translations.tags || product.tags,
      variants: product.variants?.map((variant: ProductVariant) => ({
        ...variant,
        color_translated: variant.translations?.[locale]?.color || variant.color,
        size_label: variant.translations?.[locale]?.size_label || variant.size,
      })) || [],
    };
  });
}