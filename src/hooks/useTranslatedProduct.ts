// src/hooks/useTranslateProducts.ts
import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';

/**
 * Hook to apply translations to products that now include translations field
 * This version works with the updated get_products_enhanced function
 */
export function useTranslateProducts(products: any[]) {
  const locale = useLocale();
  const [translatedProducts, setTranslatedProducts] = useState(products);
  const [isTranslating, setIsTranslating] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // If English or no products, return original
    if (locale === 'en' || !products || products.length === 0) {
      setTranslatedProducts(products);
      return;
    }

    // Now that translations are included in the API response, we can apply them directly
    applyTranslations();
  }, [products, locale]);

  async function applyTranslations() {
    setIsTranslating(true);
    
    try {
      // Get product IDs for fetching rich content translations
      const productIds = products.map(p => p.id);

      // Fetch rich content from translations table (descriptions, meta tags)
      const { data: richTranslations } = await supabase
        .from('translations')
        .select('entity_id, field_name, translated_text')
        .eq('entity_type', 'product')
        .in('entity_id', productIds)
        .eq('language_code', locale);

      // Build rich translations map
      const richMap = new Map();
      richTranslations?.forEach(trans => {
        if (!richMap.has(trans.entity_id)) {
          richMap.set(trans.entity_id, {});
        }
        richMap.get(trans.entity_id)[trans.field_name] = trans.translated_text;
      });

      // Apply translations to products
      const translated = products.map(product => {
        const richContent = richMap.get(product.id) || {};
        
        // Now we can access product.translations directly!
        const jsonbTranslations = product.translations?.[locale] || {};
        
        return {
          ...product,
          // Apply JSONB translations (from products.translations column)
          name: jsonbTranslations.name || product.name,
          short_description: jsonbTranslations.short_description || product.short_description,
          material: jsonbTranslations.material || product.material,
          care_instructions: jsonbTranslations.care_instructions || product.care_instructions,
          badge: jsonbTranslations.badge || product.badge,
          tags: jsonbTranslations.tags || product.tags,
          
          // Apply rich content from translations table
          description: richContent.description || product.description,
          meta_title: richContent.meta_title || product.meta_title,
          meta_description: richContent.meta_description || product.meta_description,
          
          // Translate variants (they should have translations field too now)
          variants: product.variants?.map((variant: any) => ({
            ...variant,
            color_translated: variant.translations?.[locale]?.color || variant.color,
            size_label: variant.translations?.[locale]?.size_label || variant.size,
          })) || [],
        };
      });

      setTranslatedProducts(translated);
    } catch (error) {
      console.error('Error translating products:', error);
      setTranslatedProducts(products);
    } finally {
      setIsTranslating(false);
    }
  }

  return { 
    products: translatedProducts, 
    isTranslating 
  };
}

/**
 * Simplified version - no DB calls, just uses the translations from the API
 * Use this if you don't need rich content translations
 */
export function useTranslateProductsSimple(products: any[]) {
  const locale = useLocale();
  
  if (!products || products.length === 0 || locale === 'en') {
    return products || [];
  }

  // Apply translations directly from the products data
  return products.map(product => {
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
      
      // Variant translations
      variants: product.variants?.map((variant: any) => ({
        ...variant,
        color_translated: variant.translations?.[locale]?.color || variant.color,
        size_label: variant.translations?.[locale]?.size_label || variant.size,
      })) || [],
    };
  });
}