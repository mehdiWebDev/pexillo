// src/components/product-detail/ProductTabs.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Minus, Plus } from 'lucide-react';

interface ProductTabsProps {
  description?: string;
  material?: string;
  careInstructions?: string;
}

export default function ProductTabs({ description, material, careInstructions }: ProductTabsProps) {
  const t = useTranslations('productDetail');
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['description']));

  const toggleSection = (section: string) => {
    const newOpenSections = new Set(openSections);
    if (newOpenSections.has(section)) {
      newOpenSections.delete(section);
    } else {
      newOpenSections.add(section);
    }
    setOpenSections(newOpenSections);
  };

  return (
    <div className="border-t border-gray-200 space-y-3 pt-4">
      {/* Description Section */}
      <div className="group cursor-pointer">
        <div
          className="flex justify-between items-center mb-1.5"
          onClick={() => toggleSection('description')}
        >
          <span className="font-bold text-gray-900 text-sm">{t('tabs.description') || 'Description'}</span>
          {openSections.has('description') ? (
            <Minus className="w-3.5 h-3.5 text-gray-400" />
          ) : (
            <Plus className="w-3.5 h-3.5 text-gray-400" />
          )}
        </div>
        {openSections.has('description') && description && (
          <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-line">
            {description}
          </p>
        )}
      </div>

      {/* Shipping & Returns Section */}
      <div className="border-t border-gray-100 pt-3 group cursor-pointer">
        <div
          className="flex justify-between items-center"
          onClick={() => toggleSection('shipping')}
        >
          <span className="font-bold text-gray-900 text-sm">{t('tabs.shipping') || 'Shipping & Returns'}</span>
          {openSections.has('shipping') ? (
            <Minus className="w-3.5 h-3.5 text-gray-400" />
          ) : (
            <Plus className="w-3.5 h-3.5 text-gray-400" />
          )}
        </div>
        {openSections.has('shipping') && (
          <div className="mt-2 text-xs text-gray-500 space-y-2">
            <div>
              <p className="font-bold text-gray-900 mb-0.5 text-xs">Delivery Times</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Standard Shipping: 5-7 business days</li>
                <li>Express Shipping: 2-3 business days</li>
                <li>Free Shipping on orders over $150</li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-gray-900 mb-0.5 text-xs">Returns & Exchanges</p>
              <p>We offer a 30-day return policy on all items. Items must be unworn, unwashed, and in original condition with tags attached.</p>
            </div>
          </div>
        )}
      </div>

      {/* Materials & Care Section */}
      <div className="border-t border-gray-100 pt-3 group cursor-pointer">
        <div
          className="flex justify-between items-center"
          onClick={() => toggleSection('materials')}
        >
          <span className="font-bold text-gray-900 text-sm">{t('tabs.materials') || 'Materials & Care'}</span>
          {openSections.has('materials') ? (
            <Minus className="w-3.5 h-3.5 text-gray-400" />
          ) : (
            <Plus className="w-3.5 h-3.5 text-gray-400" />
          )}
        </div>
        {openSections.has('materials') && (
          <div className="mt-2 text-xs text-gray-500 space-y-2">
            {material && (
              <div>
                <p className="font-bold text-gray-900 mb-0.5 text-xs">Material Composition</p>
                <p>{material}</p>
              </div>
            )}
            {careInstructions && (
              <div>
                <p className="font-bold text-gray-900 mb-0.5 text-xs">Care Instructions</p>
                <p className="whitespace-pre-line">{careInstructions}</p>
              </div>
            )}
            {!material && !careInstructions && (
              <p>No material information available.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
