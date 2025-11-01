// src/hooks/useTranslateCategories.ts
import { useMemo } from 'react';
import { useLocale } from 'next-intl';

// Type for category with translations
interface CategoryTranslations {
  [locale: string]: {
    name?: string;
    description?: string;
  };
}

// Basic category interface - matches your database
interface Category {
  id?: string;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  sort_order?: number;
  translations?: CategoryTranslations;
  count?: number; // For filter display
}

// Category from filter options (available_categories)
interface FilterCategory {
  slug: string;
  name: string;
  count: number;
  translations?: CategoryTranslations;
}

/**
 * Hook to apply translations to categories
 * Works with both full categories and filter categories
 */
export function useTranslateCategories<T extends Category | FilterCategory>(
  categories: T[] | undefined
): T[] {
  const locale = useLocale();

  return useMemo(() => {
    if (!categories || categories.length === 0 || locale === 'en') {
      return categories || [];
    }

    return categories.map(category => {
      const translation = category.translations?.[locale];
      
      if (!translation) {
        return category;
      }

      return {
        ...category,
        name: translation.name || category.name,
        description: 'description' in category 
          ? (translation.description || category.description) 
          : undefined,
      };
    });
  }, [categories, locale]);
}

/**
 * Translate a single category
 */
export function translateCategory<T extends Category | FilterCategory>(
  category: T | undefined, 
  locale: string
): T | undefined {
  if (!category || locale === 'en') {
    return category;
  }

  const translation = category.translations?.[locale];
  
  if (!translation) {
    return category;
  }
  
  return {
    ...category,
    name: translation.name || category.name,
    description: 'description' in category 
      ? (translation.description || category.description)
      : undefined,
  };
}