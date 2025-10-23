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
    <div className="product-sort">
      <label htmlFor="sort-select" className="product-sort__label">
        <ArrowUpDown size={16} />
        {t('sortBy')}
      </label>
      <select
        id="sort-select"
        value={currentValue}
        onChange={(e) => handleChange(e.target.value)}
        className="product-sort__select"
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