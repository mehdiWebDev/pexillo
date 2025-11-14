// app/[locale]/checkout/components/OrderSummary.tsx
'use client';

import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronUp, Tag, Truck } from 'lucide-react';
import { useState } from 'react';

interface OrderSummaryProps {
  items: any[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

export default function OrderSummary({
  items,
  subtotal,
  shipping,
  tax,
  total
}: OrderSummaryProps) {
  const t = useTranslations('checkout');
  const [showItems, setShowItems] = useState(true);

  return (
    <div className="bg-card border rounded-lg p-6 sticky top-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {t('orderSummary')}
        </h2>
        <button
          type="button"
          onClick={() => setShowItems(!showItems)}
          className="text-primary hover:underline text-sm flex items-center gap-1"
        >
          {showItems ? (
            <>
              {t('hide')}
              <ChevronUp size={16} />
            </>
          ) : (
            <>
              {t('show')} ({items.length})
              <ChevronDown size={16} />
            </>
          )}
        </button>
      </div>

      {/* Cart Items */}
      {showItems && (
        <div className="space-y-4 pb-4 mb-4 border-b max-h-96">
          {items.map((item) => (
            <div key={item.id} className="flex gap-3">
              <div className="relative">
                <img
                  src={item.product_image}
                  alt={item.product_name}
                  className="w-16 h-20 object-cover rounded"
                />
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                  {item.quantity}
                </span>
              </div>

              <div className="flex-1">
                <h4 className="font-medium text-sm">
                  {item.product_name}
                </h4>
                <div className="text-xs text-muted-foreground mt-1">
                  {t('size')}: {item.variant_size} • {t('color')}: {item.variant_color}
                </div>
                <div className="text-sm font-medium mt-1">
                  ${(item.unit_price * item.quantity).toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Totals */}
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span>{t('subtotal')}</span>
          <span className="font-medium">${subtotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="flex items-center gap-1">
            <Truck size={14} />
            {t('shipping')}
          </span>
          <span className="font-medium">
            {shipping === 0 ? (
              <span className="text-green-600">{t('free')}</span>
            ) : (
              `$${shipping.toFixed(2)}`
            )}
          </span>
        </div>

        {shipping > 0 && (
          <div className="p-2 bg-amber-50 dark:bg-amber-950/20 rounded text-xs text-amber-800 dark:text-amber-200">
            {t('freeShippingAt', { amount: (150 - subtotal).toFixed(2) })}
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span>{t('tax')}</span>
          <span className="font-medium">
            {tax > 0 ? `$${tax.toFixed(2)}` : t('calculated')}
          </span>
        </div>

        {/* Discount Code Input */}
        <div className="pt-3 border-t">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={t('discountCode')}
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              className="px-4 py-2 border rounded-lg text-sm hover:bg-muted"
            >
              {t('apply')}
            </button>
          </div>
        </div>

        <div className="pt-3 border-t">
          <div className="flex justify-between text-lg font-bold">
            <span>{t('total')}</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1 text-right">
            {t('includingTax')}
          </div>
        </div>
      </div>

      {/* Free Shipping Badge */}
      {shipping === 0 && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
          <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
            <Truck size={16} />
            <span className="text-sm font-medium">{t('qualifiedForFreeShipping')}</span>
          </div>
        </div>
      )}
    </div>
  );
}