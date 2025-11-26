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
    <div className="flex items-center gap-2.5">
      <label htmlFor="sort-select" className="flex items-center gap-1.5 text-sm text-gray-600 font-medium">
        <ArrowUpDown size={16} />
        {t('sortBy')}
      </label>
      <select
        id="sort-select"
        value={currentValue}
        onChange={(e) => handleChange(e.target.value)}
        className="px-3.5 py-2 pr-8 border border-gray-300 rounded-md text-sm bg-white cursor-pointer hover:border-black focus:outline-none focus:border-black transition-colors appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMiIgdmlld0JveD0iMCAwIDEyIDEyIj48cGF0aCBmaWxsPSIjNmI3MjgwIiBkPSJNNiA5TDEgNGgxMHoiLz48L3N2Zz4=')] bg-no-repeat bg-[right_0.625rem_center]"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}