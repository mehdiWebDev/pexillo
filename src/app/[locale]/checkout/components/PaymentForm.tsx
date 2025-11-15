// app/[locale]/checkout/components/PaymentForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from '@/src/i18n/routing';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/src/store/hooks';
import { useTranslations } from 'next-intl';
import { UseFormReturn } from 'react-hook-form';
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { ArrowLeft, Lock, Check } from 'lucide-react';
import { toast } from '@/src/hooks/use-toast';
import { clearCartLocal, clearCartDB } from '@/src/store/slices/cartSlice';
import { RootState } from '@/src/store';

interface PaymentFormProps {
  form: UseFormReturn<any>;
  clientSecret: string;
  total: number;
  items: any[];
  onBack: () => void;
}

export default function PaymentForm({
  form,
  clientSecret,
  total,
  items,
  onBack
}: PaymentFormProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const t = useTranslations('checkout');
  const stripe = useStripe();
  const elements = useElements();

  const { isAuth, user } = useSelector((state: RootState) => state.auth);
  const [isProcessing, setIsProcessing] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    if (!agreedToTerms) {
      toast({
        title: t('error'),
        description: t('pleaseAgreeToTerms'),
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Prepare order data
      const formData = form.getValues();
      const orderData = {
        email: formData.email,
        phone: formData.phone,
        shipping_address: formData.shipping,
        billing_address: formData.sameAsShipping ? formData.shipping : formData.billing,
        items: items.map(item => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        })),
        subtotal: items.reduce((sum, item) => sum + item.total_price, 0),
        tax_amount: form.getValues('taxAmount') || 0,
        shipping_amount: form.getValues('shippingAmount') || 0,
        total_amount: total,
        create_account: formData.createAccount,
        password: formData.password,
        currency: 'CAD',
      };

      // Create order in database (includes inventory validation)
      const orderResponse = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();

        // Handle inventory errors with detailed information
        if (errorData.error === 'Insufficient inventory' && errorData.details) {
          const itemsList = errorData.details
            .map((item: any) => `• ${item.productName} (${item.variant}): ${item.message}`)
            .join('\n');

          toast({
            title: t('outOfStock') || 'Items Out of Stock',
            description: `The following items are no longer available:\n\n${itemsList}\n\nPlease update your cart and try again.`,
            variant: 'destructive',
            duration: 10000, // Show longer for multiple items
          });

          setIsProcessing(false);
          return; // Stop here - don't proceed to payment
        }

        throw new Error(errorData.error || 'Failed to create order');
      }

      const { orderId, orderNumber } = await orderResponse.json();

      // Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success?order=${orderNumber}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        // Show error to customer
        toast({
          title: t('paymentFailed'),
          description: error.message,
          variant: 'destructive',
        });

        // Update order status to failed
        await fetch('/api/orders/update-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            status: 'payment_failed',
          }),
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment successful
        console.log('✅ Payment succeeded!', paymentIntent.id);

        try {
          const updateResponse = await fetch('/api/orders/update-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId,
              status: 'confirmed',  // ✅ This triggers inventory reduction!
              paymentStatus: 'completed',
              stripePaymentIntentId: paymentIntent.id,
            }),
          });

          if (!updateResponse.ok) {
            console.error('Failed to update order status');
            // Don't fail the order, but log it for admin review
          } else {
            const updateResult = await updateResponse.json();
            console.log('✅ Order confirmed:', updateResult);
            console.log('🔔 Inventory should be reduced now!');
          }
        } catch (error) {
          console.error('Error updating order status:', error);
          // Don't fail the order, but log it
        }

        // Clear cart
        if (isAuth && user?.id) {
          await dispatch(clearCartDB(user.id));
        } else {
          sessionStorage.setItem('payment_just_completed', 'true');
          dispatch(clearCartLocal());
        }
        // Redirect to success page
        router.push(`/checkout/success?order=${orderNumber}`);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: t('error'),
        description: t('somethingWentWrong'),
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Method */}
      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Lock size={20} />
          {t('paymentMethod')}
        </h2>

        <PaymentElement
          options={{
            layout: 'tabs',
            paymentMethodOrder: ['card', 'apple_pay', 'google_pay'],
          }}
        />
      </div>

      {/* Order Review */}
      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">
          {t('reviewOrder')}
        </h2>

        <div className="space-y-4">
          {/* Shipping Address Summary */}
          <div>
            <h3 className="font-medium mb-2">{t('shippingTo')}</h3>
            <div className="text-sm text-muted-foreground">
              <p>{form.getValues('shipping.firstName')} {form.getValues('shipping.lastName')}</p>
              <p>{form.getValues('shipping.address')}</p>
              {form.getValues('shipping.apartment') && (
                <p>{form.getValues('shipping.apartment')}</p>
              )}
              <p>
                {form.getValues('shipping.city')}, {form.getValues('shipping.state')} {form.getValues('shipping.postalCode')}
              </p>
              <p>{form.getValues('shipping.country')}</p>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-medium mb-2">{t('contactInfo')}</h3>
            <div className="text-sm text-muted-foreground">
              <p>{form.getValues('email')}</p>
              <p>{form.getValues('phone')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="bg-card border rounded-lg p-6">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="terms"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-1 rounded"
          />
          <label htmlFor="terms" className="text-sm">
            {t('agreeToTerms')}
            <a href="/terms" target="_blank" className="text-primary hover:underline ml-1">
              {t('termsAndConditions')}
            </a>
            {' '}{t('and')}{' '}
            <a href="/privacy" target="_blank" className="text-primary hover:underline">
              {t('privacyPolicy')}
            </a>
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={20} />
          {t('backToShipping')}
        </button>

        <button
          type="submit"
          disabled={!stripe || isProcessing || !agreedToTerms}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
        >
          {isProcessing ? (
            <>
              <span className="loader" />
              {t('processing')}
            </>
          ) : (
            <>
              <Check size={20} />
              {t('placeOrder')} • ${total.toFixed(2)}
            </>
          )}
        </button>
      </div>
    </form>
  );
}