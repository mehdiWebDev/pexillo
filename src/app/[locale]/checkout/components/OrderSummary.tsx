// app/[locale]/checkout/components/OrderSummary.tsx
'use client';

import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';
import Image from 'next/image';

interface TaxBreakdown {
  gst: number;
  pst: number;
  qst: number;
  hst: number;
}

interface CartItem {
  id: string;
  product_image: string;
  product_name: string;
  variant_size: string;
  variant_color: string;
  quantity: number;
  unit_price: number;
}

interface OrderSummaryProps {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  taxBreakdown?: TaxBreakdown | null;
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

  return (
    <div className="bg-gray-50 rounded-2xl p-4 md:p-6 lg:sticky lg:top-32 border border-gray-200">
      <h3 className="font-black text-lg md:text-xl text-gray-900 mb-4 md:mb-6">{t('orderSummary')}</h3>

      {/* Items List */}
      <div className="space-y-3 md:space-y-4 mb-4 md:mb-6 max-h-[300px] overflow-y-auto pr-2">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3 md:gap-4">
            <div className="relative w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
              <Image
                src={item.product_image}
                alt={item.product_name}
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
              <span className="absolute top-0 right-0 bg-gray-900 text-white text-[10px] font-bold w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-bl-lg">
                {item.quantity}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-900 text-xs sm:text-sm truncate">{item.product_name}</h4>
              <p className="text-[10px] sm:text-xs text-gray-500">
                {t('size')}: {item.variant_size} • {t('color')}: {item.variant_color}
              </p>
            </div>
            <span className="font-bold text-xs sm:text-sm whitespace-nowrap">${(item.unit_price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Discount Code */}
      <div className="flex gap-2 mb-4 md:mb-6">
        <input
          type="text"
          placeholder={t('discountCode') || 'Gift card or discount code'}
          className="flex-1 px-3 md:px-4 py-2 md:py-3 border-2 border-gray-200 rounded-lg focus:border-gray-900 focus:outline-none transition-colors font-medium text-xs md:text-sm bg-white"
        />
        <button className="px-3 md:px-4 py-2 md:py-3 bg-gray-200 text-gray-500 font-bold rounded-lg hover:bg-gray-300 transition-colors text-xs md:text-sm whitespace-nowrap">
          {t('apply')}
        </button>
      </div>

      {/* Totals */}
      <div className="space-y-2 md:space-y-3 border-t border-gray-200 pt-4 md:pt-6">
        <div className="flex justify-between text-xs md:text-sm font-medium text-gray-500">
          <span>{t('subtotal')}</span>
          <span className="text-gray-900">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs md:text-sm font-medium text-gray-500">
          <span>{t('shipping')}</span>
          <span className="text-gray-900">
            {shipping === 0 ? t('free') : `$${shipping.toFixed(2)}`}
          </span>
        </div>
        <div className="flex justify-between text-xs md:text-sm font-medium text-gray-500">
          <span>{t('tax')}</span>
          <span className="text-gray-900">${tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center border-t border-gray-200 pt-3 md:pt-4 mt-3 md:mt-4">
          <span className="font-black text-base md:text-xl text-gray-900">{t('total')}</span>
          <div className="text-right">
            <span className="text-[10px] md:text-xs text-gray-400 font-medium mr-1 md:mr-2">CAD</span>
            <span className="font-black text-lg md:text-2xl text-gray-900">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 md:mt-6 flex items-center justify-center gap-2 md:gap-4 text-gray-300">
        <Lock className="w-4 h-4 md:w-5 md:h-5" />
        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">{t('secureCheckout')}</span>
      </div>
    </div>
  );
}