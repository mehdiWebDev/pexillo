// src/components/search/SearchDropdown.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from '@/src/i18n/routing';
import { Link } from '@/src/i18n/routing';
import Image from 'next/image';
import {
  Search,
  Clock,
  TrendingUp,
  ArrowRight,
  Package,
  Tag,
  Loader2,
  Sparkles,
  Store
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { SearchResult, QuerySuggestion, BrandSuggestion } from '@/src/services/searchService';
import { highlightSearchTerms } from '@/src/lib/search-utils';
import { cn } from '@/lib/utils';

interface SearchDropdownProps {
  query: string;
  quickResults: SearchResult[];
  suggestions?: {
    recent: string[];
    trending: string[];
    categories: Array<{ id: string; name: string; slug: string }>;
  };
  queryCompletions?: QuerySuggestion[];
  brandSuggestions?: BrandSuggestion[];
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSearchSubmit: (query: string) => void;
  onClearHistory?: () => void;
}

export default function SearchDropdown({
  query,
  quickResults,
  suggestions,
  queryCompletions,
  brandSuggestions,
  isLoading,
  isOpen,
  onClose,
  onSearchSubmit,
  onClearHistory
}: SearchDropdownProps) {
  const t = useTranslations('search');
  const locale = useLocale();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Handle clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      const totalItems = quickResults.length + (suggestions?.recent.length || 0) + (suggestions?.trending.length || 0);

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev < totalItems - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : totalItems - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0) {
            // Handle selection based on index
            if (selectedIndex < quickResults.length) {
              router.push(`/products/${quickResults[selectedIndex].slug}`);
            } else {
              // Handle recent/trending selection
              const recentLength = suggestions?.recent.length || 0;
              const adjustedIndex = selectedIndex - quickResults.length;

              if (adjustedIndex < recentLength) {
                onSearchSubmit(suggestions!.recent[adjustedIndex]);
              } else {
                const trendingIndex = adjustedIndex - recentLength;
                if (trendingIndex < (suggestions?.trending.length || 0)) {
                  onSearchSubmit(suggestions!.trending[trendingIndex]);
                }
              }
            }
          } else {
            onSearchSubmit(query);
          }
          onClose();
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, quickResults, suggestions, query, router, onSearchSubmit, onClose]);

  if (!isOpen) return null;

  const hasResults = quickResults.length > 0;
  const hasRecentSearches = suggestions?.recent && suggestions.recent.length > 0;
  const hasTrending = suggestions?.trending && suggestions.trending.length > 0;
  const hasCategories = suggestions?.categories && suggestions.categories.length > 0;
  const hasCompletions = queryCompletions && queryCompletions.length > 0;
  const hasBrands = brandSuggestions && brandSuggestions.length > 0;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50 max-h-[70vh] max-w-2xl overflow-y-auto"
    >
      {/* Query Completions - Autocomplete Suggestions */}
      {query && hasCompletions && (
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 mb-3">
            <Sparkles size={14} />
            {t('suggestions') || 'Suggestions'}
          </h3>
          <div className="space-y-1">
            {queryCompletions!.slice(0, 5).map((completion, index) => (
              <button
                key={`${completion.suggestion}-${index}`}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left hover:bg-gray-50 transition-colors group"
                onClick={() => {
                  onSearchSubmit(completion.suggestion);
                  onClose();
                }}
              >
                <span className="text-gray-400 text-sm">
                  {completion.type === 'category' && <Tag size={14} />}
                  {completion.type === 'brand' && <Store size={14} />}
                  {completion.type === 'popular' && <TrendingUp size={14} />}
                  {completion.type === 'product' && <Package size={14} />}
                </span>
                <span className="text-sm text-gray-700 group-hover:text-brand-red flex-1">
                  {highlightSearchTerms(completion.suggestion, query)}
                </span>
                <span className="text-xs text-gray-400 capitalize">
                  {completion.type}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Brand Suggestions */}
      {query && hasBrands && (
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 mb-3">
            <Store size={14} />
            {t('brands') || 'Brands'}
          </h3>
          <div className="flex flex-wrap gap-2">
            {brandSuggestions!.slice(0, 5).map((brand) => (
              <button
                key={brand.brand_name}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 font-medium transition-colors flex items-center gap-1"
                onClick={() => {
                  onSearchSubmit(brand.brand_name);
                  onClose();
                }}
              >
                <span>{highlightSearchTerms(brand.brand_name, query)}</span>
                <span className="text-xs text-gray-500">({brand.product_count})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Results - Product Previews */}
      {query && hasResults && (
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              {t('products') || 'Products'}
            </h3>
            <Link
              href={`/search?q=${encodeURIComponent(query)}`}
              className="text-xs text-brand-dark hover:text-brand-red font-medium flex items-center gap-1"
              onClick={onClose}
            >
              {t('viewAll') || 'View all'}
              <ArrowRight size={12} />
            </Link>
          </div>

          <div className="space-y-2">
            {quickResults.slice(0, 5).map((product, index) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group",
                  selectedIndex === index && "bg-gray-50"
                )}
                onClick={onClose}
              >
                {/* Product Image */}
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  {product.primary_image_url ? (
                    <Image
                      src={product.primary_image_url}
                      alt={locale === 'fr' && product.translations?.fr?.name
                        ? product.translations.fr.name
                        : product.name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={20} className="text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate group-hover:text-brand-red transition-colors">
                    {highlightSearchTerms(
                      locale === 'fr' && product.translations?.fr?.name
                        ? product.translations.fr.name
                        : product.name,
                      query
                    )}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">
                      ${product.discounted_price.toFixed(2)}
                    </span>
                    {product.has_discount && product.base_price > product.discounted_price && (
                      <span className="text-xs text-gray-400 line-through">
                        ${product.base_price.toFixed(2)}
                      </span>
                    )}
                    {product.badge && (
                      <span className="text-xs font-bold text-brand-red uppercase">
                        {locale === 'fr' && product.translations?.fr?.badge
                          ? product.translations.fr.badge
                          : product.badge}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stock Status */}
                {!product.in_stock && (
                  <span className="text-xs text-gray-400 font-medium">
                    {t('outOfStock') || 'Out of Stock'}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Searches */}
      {!query && hasRecentSearches && (
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Clock size={14} />
              {t('recentSearches') || 'Recent Searches'}
            </h3>
            {onClearHistory && (
              <button
                onClick={onClearHistory}
                className="text-xs text-gray-400 hover:text-gray-600 font-medium"
              >
                {t('clear') || 'Clear'}
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {suggestions!.recent.map((term, index) => (
              <button
                key={term}
                className={cn(
                  "px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 font-medium transition-colors",
                  selectedIndex === quickResults.length + index && "bg-gray-200"
                )}
                onClick={() => {
                  onSearchSubmit(term);
                  onClose();
                }}
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Trending Searches */}
      {!query && hasTrending && (
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 mb-3">
            <TrendingUp size={14} />
            {t('trending') || 'Trending'}
          </h3>

          <div className="flex flex-wrap gap-2">
            {suggestions!.trending.map((term, index) => (
              <button
                key={term}
                className={cn(
                  "px-3 py-1.5 bg-brand-red/10 hover:bg-brand-red/20 rounded-full text-sm text-brand-dark font-medium transition-colors",
                  selectedIndex === quickResults.length + (suggestions?.recent.length || 0) + index && "bg-brand-red/20"
                )}
                onClick={() => {
                  onSearchSubmit(term);
                  onClose();
                }}
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category Suggestions */}
      {!query && hasCategories && (
        <div className="p-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 mb-3">
            <Tag size={14} />
            {t('browseCategories') || 'Browse Categories'}
          </h3>

          <div className="grid grid-cols-2 gap-2">
            {suggestions!.categories.slice(0, 6).map((category) => (
              <Link
                key={category.id}
                href={`/products/${category.slug}`}
                className="px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 font-medium transition-colors text-center"
                onClick={onClose}
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {query && isLoading && (
        <div className="p-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">{t('searching') || 'Searching...'}</p>
        </div>
      )}

      {/* No Results */}
      {query && !isLoading && !hasResults && (
        <div className="p-8 text-center">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900 mb-1">
            {t('noResultsFor') || 'No results for'} &quot;{query}&quot;
          </p>
          <p className="text-xs text-gray-500">
            {t('tryDifferentKeywords') || 'Try different keywords'}
          </p>
        </div>
      )}

      {/* View All Results Button */}
      {query && (
        <div className="p-3 bg-gray-50 border-t border-gray-100">
          <button
            onClick={() => {
              onSearchSubmit(query);
              onClose();
            }}
            className="w-full py-2 bg-brand-dark text-white rounded-lg font-medium text-sm hover:bg-brand-red transition-colors"
          >
            {t('viewAllResults') || 'View All Results'}
          </button>
        </div>
      )}
    </div>
  );
}