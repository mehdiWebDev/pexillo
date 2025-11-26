// src/app/[locale]/profile/components/PaymentMethodsSection.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { CreditCard, Plus, Trash2, Loader2, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/src/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useTranslations } from 'next-intl';

interface PaymentMethod {
  id: string;
  user_id: string;
  stripe_payment_method_id: string;
  card_brand: string;
  card_last4: string;
  card_exp_month: number;
  card_exp_year: number;
  cardholder_name: string;
  is_default: boolean;
  created_at: string;
}

interface PaymentMethodsSectionProps {
  userId: string;
}

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

// Card brand logos/colors
const CARD_BRANDS: Record<string, { color: string; displayName: string }> = {
  visa: { color: 'bg-blue-600', displayName: 'Visa' },
  mastercard: { color: 'bg-red-600', displayName: 'Mastercard' },
  amex: { color: 'bg-blue-800', displayName: 'American Express' },
  discover: { color: 'bg-orange-600', displayName: 'Discover' },
  diners: { color: 'bg-blue-700', displayName: 'Diners Club' },
  jcb: { color: 'bg-blue-900', displayName: 'JCB' },
  unionpay: { color: 'bg-red-700', displayName: 'UnionPay' },
};

function AddPaymentMethodForm({ userId, onSuccess, onCancel }: { userId: string; onSuccess: () => void; onCancel: () => void }) {
  const t = useTranslations('profile');
  const stripe = useStripe();
  const elements = useElements();
  const [isSaving, setIsSaving] = useState(false);
  const [cardholderName, setCardholderName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    if (!cardholderName.trim()) {
      toast({
        title: t('validationError'),
        description: t('enterCardholderName'),
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('Card element not found');

      // Create payment method with Stripe
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: cardholderName,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!paymentMethod) {
        throw new Error('Failed to create payment method');
      }

      // Save payment method reference to database
      const supabase = createClient();
      const { error: dbError } = await supabase
        .from('payment_methods')
        .insert([
          {
            user_id: userId,
            stripe_payment_method_id: paymentMethod.id,
            card_brand: paymentMethod.card?.brand || 'unknown',
            card_last4: paymentMethod.card?.last4 || '0000',
            card_exp_month: paymentMethod.card?.exp_month || 1,
            card_exp_year: paymentMethod.card?.exp_year || 2025,
            cardholder_name: cardholderName,
            is_default: false,
          },
        ]);

      if (dbError) throw dbError;

      toast({
        title: t('success'),
        description: t('paymentMethodAdded'),
      });

      onSuccess();
    } catch (error: unknown) {
      console.error('Failed to add payment method:', error);
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : t('errorAddingPaymentMethod'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6">
      <h3 className="font-bold text-lg text-brand-dark mb-6">{t('addNewPaymentMethod')}</h3>

      <div className="space-y-4">
        {/* Cardholder Name */}
        <div className="grid gap-2">
          <label className="font-bold text-brand-dark">{t('cardholderName')} *</label>
          <input
            type="text"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            placeholder={t('cardholderNamePlaceholder')}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl font-medium focus:border-brand-red focus:outline-none"
            required
          />
        </div>

        {/* Card Details */}
        <div className="grid gap-2">
          <label className="font-bold text-brand-dark">{t('cardDetails')} *</label>
          <div className="px-4 py-3 border-2 border-gray-200 rounded-xl">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#1a1a1a',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    '::placeholder': {
                      color: '#9ca3af',
                    },
                  },
                  invalid: {
                    color: '#e11d48',
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800 font-medium flex items-start gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{t('securityNotice')}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isSaving || !stripe}
            className="flex-1 bg-brand-dark hover:bg-brand-red text-white rounded-xl py-3 px-6 font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t('adding')}
              </>
            ) : (
              t('addCard')
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border-2 border-gray-200 rounded-xl font-bold text-brand-dark hover:border-brand-dark transition-colors"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </form>
  );
}

export default function PaymentMethodsSection({ userId }: PaymentMethodsSectionProps) {
  const t = useTranslations('profile');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchPaymentMethods = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
      toast({
        title: t('error'),
        description: t('errorLoadingPaymentMethods'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, t]);

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDeletePaymentMethod'))) return;

    try {
      const supabase = createClient();

      // Delete from database
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Note: You may want to also detach the payment method from Stripe
      // This would require a server-side API endpoint to call Stripe API

      toast({
        title: t('success'),
        description: t('paymentMethodDeleted'),
      });

      fetchPaymentMethods();
    } catch (error) {
      console.error('Failed to delete payment method:', error);
      toast({
        title: t('error'),
        description: t('errorDeletingPaymentMethod'),
        variant: 'destructive',
      });
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const supabase = createClient();

      // Unset all defaults
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', userId);

      // Set new default
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: t('success'),
        description: t('defaultPaymentMethodUpdated'),
      });

      fetchPaymentMethods();
    } catch (error) {
      console.error('Failed to set default payment method:', error);
      toast({
        title: t('error'),
        description: t('errorUpdatingDefaultPaymentMethod'),
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8">
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-12 w-12 animate-spin text-brand-red" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-black text-2xl text-brand-dark">{t('savedPaymentMethods')}</h2>
        {!isFormOpen && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="px-4 py-2 bg-brand-dark text-white rounded-xl font-bold hover:bg-brand-red transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {t('addCard')}
          </button>
        )}
      </div>

      {/* Add Payment Method Form */}
      {isFormOpen && (
        <Elements stripe={stripePromise}>
          <AddPaymentMethodForm
            userId={userId}
            onSuccess={() => {
              setIsFormOpen(false);
              fetchPaymentMethods();
            }}
            onCancel={() => setIsFormOpen(false)}
          />
        </Elements>
      )}

      {/* Payment Methods List */}
      {paymentMethods.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <CreditCard className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-lg font-bold text-brand-dark mb-2">{t('noPaymentMethods')}</p>
          <p className="text-sm text-gray-500">{t('noPaymentMethodsDescription')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paymentMethods.map((method) => {
            const brandConfig = CARD_BRANDS[method.card_brand.toLowerCase()] || {
              color: 'bg-gray-600',
              displayName: method.card_brand,
            };

            return (
              <div
                key={method.id}
                className={`bg-white border-2 rounded-2xl p-6 relative ${
                  method.is_default ? 'border-brand-red' : 'border-gray-200'
                }`}
              >
                {/* Default Badge */}
                {method.is_default && (
                  <div className="absolute top-4 right-4 bg-brand-red text-white px-3 py-1 rounded-full text-xs font-bold">
                    {t('defaultAddress')}
                  </div>
                )}

                {/* Card Visual */}
                <div className={`${brandConfig.color} rounded-xl p-4 mb-4 text-white`}>
                  <div className="flex justify-between items-start mb-8">
                    <CreditCard className="w-8 h-8" />
                    <span className="text-xs font-bold uppercase tracking-wider">{brandConfig.displayName}</span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-2xl font-black tracking-wider">
                      •••• •••• •••• {method.card_last4}
                    </p>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs opacity-75">{t('cardholder')}</p>
                        <p className="font-bold text-sm">{method.cardholder_name}</p>
                      </div>
                      <div>
                        <p className="text-xs opacity-75">{t('expires')}</p>
                        <p className="font-bold text-sm">
                          {String(method.card_exp_month).padStart(2, '0')}/{method.card_exp_year}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {!method.is_default && (
                    <button
                      onClick={() => handleSetDefault(method.id)}
                      className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg font-bold text-sm text-brand-dark hover:border-brand-dark transition-colors"
                    >
                      {t('setDefault')}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(method.id)}
                    className="px-4 py-2 border-2 border-gray-200 rounded-lg font-bold text-sm text-red-600 hover:border-red-600 transition-colors"
                    aria-label={t('delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
