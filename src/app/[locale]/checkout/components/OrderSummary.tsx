// app/[locale]/checkout/components/OrderSummary.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Lock, Tag, X } from 'lucide-react';
import Image from 'next/image';
import { toast } from '@/src/hooks/use-toast';
import { getDiscountErrorKey, formatDiscountMessage } from '@/src/lib/discount-translations';

interface TaxBreakdown {
  gst: number;
  pst: number;
  qst: number;
  hst: number;
}

interface CartItem {
  id: string;
  product_id?: string;
  variant_id?: string;
  category_id?: string;
  product_image: string;
  product_name: string;
  variant_size: string;
  variant_color: string;
  quantity: number;
  unit_price: number;
  original_price?: number;
  discount_percentage?: number;
  discount_amount?: number;
}

interface DiscountInfo {
  discountId: string;
  code: string;
  discountType: 'percentage' | 'fixed_amount' | 'free_shipping';
  discountValue: number;
  amountOff: number;
  display: string;
  stackable?: boolean;
}

interface OrderSummaryProps {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  taxBreakdown?: TaxBreakdown | null;
  total: number;
  onDiscountApplied?: (discounts: DiscountInfo[]) => void;
  appliedDiscounts?: DiscountInfo[];
}

export default function OrderSummary({
  items,
  subtotal,
  shipping,
  tax,
  total,
  onDiscountApplied,
  appliedDiscounts = []
}: OrderSummaryProps) {
  const t = useTranslations('checkout');
  const [discountCode, setDiscountCode] = useState('');
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      toast({
        title: t('error'),
        description: t('discountErrors.enterDiscountCode'),
        variant: 'destructive',
      });
      return;
    }

    setIsApplyingDiscount(true);

    try {
      const response = await fetch('/api/discounts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: discountCode.trim(),
          subtotal,
          items: items.map(item => ({
            product_id: item.product_id,
            variant_id: item.variant_id || item.id, // Use item.id as variant_id
            category_id: item.category_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })),
        }),
      });

      const data = await response.json();
      console.log('📥 Discount validation response:', data);

      if (data.isValid) {
        const newDiscount: DiscountInfo = {
          discountId: data.discountId,
          code: discountCode.trim().toUpperCase(),
          discountType: data.discountType,
          discountValue: data.discountValue,
          amountOff: data.amountOff,
          display: data.display,
          stackable: data.stackable || false,
        };

        // Check if discount already exists
        if (appliedDiscounts.some(d => d.discountId === newDiscount.discountId)) {
          toast({
            title: t('info'),
            description: t('discountErrors.alreadyApplied'),
            variant: 'default',
          });
          return;
        }

        // Check if we can add this discount
        const nonStackableDiscount = appliedDiscounts.find(d => !d.stackable);
        if (nonStackableDiscount) {
          toast({
            title: t('info'),
            description: t('discountErrors.cannotCombine', { code: nonStackableDiscount.code }),
            variant: 'default',
          });
          return;
        }

        // If new discount is not stackable but we have existing discounts
        if (!newDiscount.stackable && appliedDiscounts.length > 0) {
          toast({
            title: t('info'),
            description: t('discountErrors.notStackable'),
            variant: 'default',
          });
          return;
        }

        // Add the new discount to the array
        console.log('✅ OrderSummary - Adding discount:', newDiscount);
        console.log('📞 Calling onDiscountApplied with:', [...appliedDiscounts, newDiscount]);
        if (onDiscountApplied) {
          onDiscountApplied([...appliedDiscounts, newDiscount]);
        } else {
          console.error('❌ onDiscountApplied callback is not defined!');
        }
        setDiscountCode(''); // Clear the input

        // Translate the success message if it's a known message
        let successMessage = data.message;
        const errorTranslation = getDiscountErrorKey(data.message);
        if (errorTranslation) {
          const translatedTemplate = t(`discountErrors.${errorTranslation.key}` as const);
          successMessage = formatDiscountMessage(String(translatedTemplate), errorTranslation.params);
        }

        toast({
          title: t('success'),
          description: successMessage,
        });
      } else {
        // Translate error message
        let errorMessage = data.message || 'Invalid discount code';
        const errorTranslation = getDiscountErrorKey(data.message);
        if (errorTranslation) {
          const translatedTemplate = t(`discountErrors.${errorTranslation.key}` as const);
          errorMessage = formatDiscountMessage(String(translatedTemplate), errorTranslation.params);
        }

        toast({
          title: t('error'),
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error applying discount:', error);
      toast({
        title: t('error'),
        description: t('discountErrors.failedToValidate'),
        variant: 'destructive',
      });
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  const handleRemoveDiscount = (discountId: string) => {
    const updatedDiscounts = appliedDiscounts.filter(d => d.discountId !== discountId);
    console.log('🗑️ Removing discount, updated list:', updatedDiscounts);
    if (onDiscountApplied) {
      onDiscountApplied(updatedDiscounts);
    } else {
      console.error('❌ onDiscountApplied callback is not defined for removal!');
    }
    setDiscountCode('');
    toast({
      title: t('info'),
      description: t('discountErrors.discountRemoved'),
    });
  };

  // Calculate total savings from product discounts (already reflected in prices)
  const totalProductSavings = items.reduce((sum, item) => {
    if (item.original_price && item.discount_percentage) {
      const savings = (item.original_price - item.unit_price) * item.quantity;
      return sum + savings;
    }
    return sum;
  }, 0);

  // Calculate total cumulative discount amount
  const totalDiscountAmount = appliedDiscounts.reduce((sum, discount) => sum + (discount.amountOff || 0), 0);
  const finalTotal = total - totalDiscountAmount;

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
              {item.discount_percentage && (
                <p className="text-[10px] sm:text-xs text-green-600 font-bold">
                  -{Math.round(item.discount_percentage)}% OFF
                </p>
              )}
            </div>
            <div className="text-right">
              <span className="font-bold text-xs sm:text-sm whitespace-nowrap block">
                ${(item.unit_price * item.quantity).toFixed(2)}
              </span>
              {item.original_price && item.original_price > item.unit_price && (
                <span className="text-[10px] sm:text-xs text-gray-500 line-through">
                  ${(item.original_price * item.quantity).toFixed(2)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Discount Code Section */}
      <div className="space-y-3">
        {/* Show all applied discounts */}
        {appliedDiscounts.length > 0 && (
          <div className="space-y-2">
            {appliedDiscounts.map((discount) => (
              <div key={discount.discountId} className="p-3 bg-green-50 border-2 border-green-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-green-600" />
                  <div>
                    <span className="font-bold text-xs md:text-sm text-green-800">
                      {discount.code}
                    </span>
                    <span className="text-xs text-green-600 ml-2">
                      {discount.display}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveDiscount(discount.discountId)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                  title={t('removeDiscount') || 'Remove discount'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Show input field if no discounts OR if all current discounts are stackable */}
        {(appliedDiscounts.length === 0 || appliedDiscounts.every(d => d.stackable)) && (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyDiscount()}
                placeholder={appliedDiscounts.some(d => d.stackable)
                  ? (t('addAnotherCode') || 'Add another stackable discount code')
                  : (t('discountCode') || 'Gift card or discount code')
                }
                className="flex-1 px-3 md:px-4 py-2 md:py-3 border-2 border-gray-200 rounded-lg focus:border-gray-900 focus:outline-none transition-colors font-medium text-xs md:text-sm bg-white"
                disabled={isApplyingDiscount}
              />
              <button
                onClick={handleApplyDiscount}
                disabled={isApplyingDiscount}
                className="px-3 md:px-4 py-2 md:py-3 bg-gray-900 text-white font-bold rounded-lg hover:bg-gray-800 disabled:bg-gray-400 transition-colors text-xs md:text-sm whitespace-nowrap"
              >
                {isApplyingDiscount ? '...' : t('apply')}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Totals */}
      <div className="space-y-2 md:space-y-3 border-t border-gray-200 pt-4 md:pt-6">
        <div className="flex justify-between text-xs md:text-sm font-medium text-gray-500">
          <span>{t('subtotal')}</span>
          <span className="text-gray-900">${subtotal.toFixed(2)}</span>
        </div>
        {totalProductSavings > 0 && (
          <div className="flex justify-between text-xs md:text-sm font-medium">
            <span className="text-green-600 font-bold">{t('productDiscounts') || 'Product Discounts'}</span>
            <span className="text-green-600 font-bold">-${totalProductSavings.toFixed(2)}</span>
          </div>
        )}
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
        {appliedDiscounts.length > 0 && totalDiscountAmount > 0 && (
          <div className="flex justify-between text-xs md:text-sm font-medium text-green-600">
            <span>{t('discounts') || 'Discounts'} ({appliedDiscounts.length})</span>
            <span>-${totalDiscountAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between items-center border-t border-gray-200 pt-3 md:pt-4 mt-3 md:mt-4">
          <span className="font-black text-base md:text-xl text-gray-900">{t('total')}</span>
          <div className="text-right">
            <span className="text-[10px] md:text-xs text-gray-400 font-medium mr-1 md:mr-2">CAD</span>
            <span className="font-black text-lg md:text-2xl text-gray-900">${finalTotal.toFixed(2)}</span>
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