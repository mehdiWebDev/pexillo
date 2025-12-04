// src/app/[locale]/checkout/components/PaymentMethodSelector.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Check, CreditCard } from 'lucide-react';
import { paymentMethodService, type PaymentMethod } from '@/src/services/paymentMethodService';
import { toast } from '@/src/hooks/use-toast';
import Loader from '@/src/components/ui/Loader';

interface PaymentMethodSelectorProps {
  userId: string;
  onSelectPaymentMethod: (paymentMethod: PaymentMethod | null) => void;
  onAddNewPaymentMethod: () => void;
  selectedPaymentMethodId?: string | null;
}

// Brand icons mapping
const CARD_BRAND_ICONS: Record<string, string> = {
  visa: '💳',
  mastercard: '💳',
  amex: '💳',
  discover: '💳',
  diners: '💳',
  jcb: '💳',
  unionpay: '💳',
  unknown: '💳',
};

export default function PaymentMethodSelector({
  userId,
  onSelectPaymentMethod,
  onAddNewPaymentMethod,
  selectedPaymentMethodId,
}: PaymentMethodSelectorProps) {
  const t = useTranslations('checkout');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(selectedPaymentMethodId || null);

  useEffect(() => {
    loadPaymentMethods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadPaymentMethods = async () => {
    try {
      setIsLoading(true);
      const methods = await paymentMethodService.getUserPaymentMethods(userId);
      setPaymentMethods(methods);

      // Auto-select default payment method if no selection
      if (!selectedId && methods.length > 0) {
        const defaultMethod = methods.find(m => m.is_default) || methods[0];
        setSelectedId(defaultMethod.id);
        onSelectPaymentMethod(defaultMethod);
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
      toast({
        title: t('error'),
        description: t('errorLoadingPaymentMethods'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPaymentMethod = (method: PaymentMethod) => {
    setSelectedId(method.id);
    onSelectPaymentMethod(method);
  };

  const formatCardBrand = (brand: string): string => {
    return brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader />
      </div>
    );
  }

  if (paymentMethods.length === 0) {
    return (
      <div className="text-center py-8">
        <CreditCard className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-600 mb-4">{t('noSavedPaymentMethods')}</p>
        <button
          type="button"
          onClick={onAddNewPaymentMethod}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-bold"
        >
          <Plus className="w-4 h-4" />
          {t('addPaymentMethod')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {paymentMethods.map((method) => {
          const isSelected = selectedId === method.id;
          const expiryDate = paymentMethodService.formatExpiryDate(
            method.card_exp_month,
            method.card_exp_year
          );

          return (
            <div
              key={method.id}
              onClick={() => handleSelectPaymentMethod(method)}
              className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all ${
                isSelected
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">
                    {CARD_BRAND_ICONS[method.card_brand.toLowerCase()] || '💳'}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900">
                      {formatCardBrand(method.card_brand)}
                    </span>
                    <span className="text-gray-600">•••• {method.card_last4}</span>
                    {method.is_default && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-900 text-white">
                        {t('default')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{method.cardholder_name}</span>
                    <span>{t('expires')} {expiryDate}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add new payment method button */}
        <div
          onClick={onAddNewPaymentMethod}
          className="relative p-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-gray-400 transition-all flex items-center justify-center"
        >
          <div className="flex items-center gap-3">
            <Plus className="w-5 h-5 text-gray-400" />
            <span className="font-bold text-gray-600">{t('addNewPaymentMethod')}</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <p className="text-xs text-gray-500 text-center">
        {t('selectPaymentMethodInstruction')}
      </p>
    </div>
  );
}