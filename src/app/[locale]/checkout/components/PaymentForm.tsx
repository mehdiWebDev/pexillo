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
  tax: number;
  shipping: number;
  items: any[];
  onBack: () => void;
}

export default function PaymentForm({
  form,
  clientSecret,
  total,
  tax,
  shipping,
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
      // ✅ STEP 1: Confirm payment with Stripe FIRST (before creating order)
      console.log('💳 Step 1: Confirming payment with Stripe...');
      const { error: paymentError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`,
        },
        redirect: 'if_required',
      });

      // If payment fails, stop here - don't create order
      if (paymentError) {
        console.error('❌ Payment failed:', paymentError);
        toast({
          title: t('paymentFailed'),
          description: paymentError.message,
          variant: 'destructive',
        });
        setIsProcessing(false);
        return;
      }

      // If payment didn't succeed, stop here
      if (!paymentIntent || paymentIntent.status !== 'succeeded') {
        console.error('❌ Payment not completed:', paymentIntent?.status);
        toast({
          title: t('paymentFailed'),
          description: t('somethingWentWrong'),
          variant: 'destructive',
        });
        setIsProcessing(false);
        return;
      }

      // ✅ STEP 2: Payment succeeded! Now create order in database
      console.log('✅ Payment succeeded!', paymentIntent.id);
      console.log('📝 Step 2: Creating order in database...');

      const formData = form.getValues();
      const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);

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
          product_name: item.product_name,
          variant_size: item.variant_size,
          variant_color: item.variant_color,
        })),
        subtotal,
        tax_amount: tax,
        shipping_amount: shipping,
        total_amount: total,
        create_account: formData.createAccount,
        password: formData.password,
        currency: 'CAD',
        // Include payment details since payment already succeeded
        stripe_payment_intent_id: paymentIntent.id,
        payment_method: paymentIntent.payment_method,
        payment_status: 'completed',
        status: 'confirmed',
      };

      const orderResponse = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();

        // Handle inventory errors
        if (errorData.error === 'Insufficient inventory' && errorData.details) {
          const itemsList = errorData.details
            .map((item: any) => `• ${item.productName} (${item.variant}): ${item.message}`)
            .join('\n');

          toast({
            title: t('outOfStock'),
            description: `${t('itemsNoLongerAvailable')}:\n\n${itemsList}\n\n${t('updateCartAndTryAgain')}`,
            variant: 'destructive',
            duration: 10000,
          });

          // Payment already succeeded but order creation failed
          // User needs to contact support for refund
          console.error('⚠️ Payment succeeded but order creation failed - refund needed');
          setIsProcessing(false);
          return;
        }

        throw new Error(errorData.error || 'Failed to create order');
      }

      const { orderId, orderNumber } = await orderResponse.json();
      console.log('✅ Order created:', orderNumber);

      // ✅ STEP 3: Update order with payment confirmation (triggers email)
      console.log('📧 Step 3: Updating order status and sending confirmation email...');
      try {
        const updateResponse = await fetch('/api/orders/update-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            status: 'confirmed',
            paymentStatus: 'completed',
            stripePaymentIntentId: paymentIntent.id,
            paymentMethod: paymentIntent.payment_method,
          }),
        });

        if (updateResponse.ok) {
          console.log('✅ Order confirmed and email sent');
        } else {
          console.error('⚠️ Failed to update order status');
        }
      } catch (error) {
        console.error('Error updating order status:', error);
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

    } catch (error) {
      console.error('💥 Payment error:', error);
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