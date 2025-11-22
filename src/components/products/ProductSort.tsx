// src/components/products/ProductSort.tsx
'use client';

import { useTranslations } from 'next-intl';
import { ArrowUpDown } from 'lucide-react';

type SortBy = 'created_at' | 'price' | 'rating' | 'popular' | 'name';
type SortOrder = 'ASC' | 'DESC';

interface ProductSortProps {
  sortBy: SortBy;
  sortOrder: SortOrder;
  onSortChange: (sortBy: SortBy, sortOrder: SortOrder) => void;
}

export default function ProductSort({ sortBy, sortOrder, onSortChange }: ProductSortProps) {
  const t = useTranslations('sort');

  const currentValue = `${sortBy}-${sortOrder.toLowerCase()}`;

  const sortOptions = [
    { value: 'created_at-desc', label: t('newestFirst') },
    { value: 'created_at-asc', label: t('oldestFirst') },
    { value: 'price-asc', label: t('priceLowToHigh') },
    { value: 'price-desc', label: t('priceHighToLow') },
    { value: 'rating-desc', label: t('bestRated') },
    { value: 'popular-desc', label: t('mostPopular') },
    { value: 'name-asc', label: t('nameAZ') },
    { value: 'name-desc', label: t('nameZA') },
  ];

  const handleChange = (value: string) => {
    const [newSortBy, newSortOrder] = value.split('-');
    onSortChange(newSortBy as SortBy, newSortOrder.toUpperCase() as SortOrder);
  };

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="sort-select" className="flex items-center gap-2 text-zinc-500 font-mono text-xs uppercase">
        <ArrowUpDown size={14} className="text-acid-lime" />
        {t('sortBy')}
      </label>
      <select
        id="sort-select"
        value={currentValue}
        onChange={(e) => handleChange(e.target.value)}
        className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-white font-mono text-sm focus:border-acid-lime focus:outline-none cursor-pointer hover:border-zinc-700 transition-colors"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value} className="bg-zinc-900">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}