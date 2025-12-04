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
import { toast } from '@/src/hooks/use-toast';
import { clearCartLocal, clearCartDB } from '@/src/store/slices/cartSlice';
import { RootState } from '@/src/store';
import { addressService } from '@/src/services/addressService';
import { paymentMethodService, type PaymentMethod } from '@/src/services/paymentMethodService';
import PaymentMethodSelector from './PaymentMethodSelector';

interface CartItem {
  product_id: string;
  variant_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_name: string;
  variant_size: string;
  variant_color: string;
}

interface CheckoutFormData {
  email: string;
  phone: string;
  shipping: {
    firstName: string;
    lastName: string;
    address: string;
    apartment?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  sameAsShipping: boolean;
  billing?: {
    firstName?: string;
    lastName?: string;
    address?: string;
    apartment?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  createAccount: boolean;
  password?: string;
}

interface InventoryError {
  productName: string;
  variant: string;
  message: string;
}

interface DiscountInfo {
  discountId: string;
  code: string;
  discountType: 'percentage' | 'fixed_amount' | 'free_shipping';
  discountValue: number;
  amountOff: number;
  display: string;
}

interface PaymentFormProps {
  form: UseFormReturn<CheckoutFormData>;
  clientSecret: string;
  total: number;
  tax: number;
  shipping: number;
  items: CartItem[];
  onBack: () => void;
  createdUserId: string | null;
  appliedDiscounts?: DiscountInfo[];
}

export default function PaymentForm({
  form,
  clientSecret,
  total,
  tax,
  shipping,
  items,
  onBack,
  createdUserId,
  appliedDiscounts = []
}: PaymentFormProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const t = useTranslations('checkout');
  const stripe = useStripe();
  const elements = useElements();

  const { isAuth, user } = useSelector((state: RootState) => state.auth);
  const [isProcessing, setIsProcessing] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [saveAddress, setSaveAddress] = useState(true);
  const [savePaymentMethod, setSavePaymentMethod] = useState(true);
  const [showSavedPayments] = useState(true);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [useNewPayment, setUseNewPayment] = useState(false);

  // Debug logging for discounts
  console.log('🎁 PaymentForm received appliedDiscounts:', appliedDiscounts);

  // Check if user should see saved payment methods
  const currentUserId = user?.id || createdUserId;
  const shouldShowSavedPayments = (isAuth || createdUserId) && currentUserId && showSavedPayments && !useNewPayment;

  const handleSelectPaymentMethod = (paymentMethod: PaymentMethod | null) => {
    setSelectedPaymentMethod(paymentMethod);
    if (paymentMethod) {
      setUseNewPayment(false);
    }
  };

  const handleAddNewPaymentMethod = () => {
    setUseNewPayment(true);
    setSelectedPaymentMethod(null);
  };

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
      // Get form data for billing details
      const formData = form.getValues();
      const billingAddress = formData.sameAsShipping ? formData.shipping : formData.billing;

      // ✅ STEP 1: Confirm payment with Stripe FIRST (before creating order)
      console.log('💳 Step 1: Confirming payment with Stripe...');

      let paymentError, paymentIntent;

      // Check if using a saved payment method
      if (selectedPaymentMethod && selectedPaymentMethod.stripe_payment_method_id) {
        console.log('Using saved payment method:', selectedPaymentMethod.stripe_payment_method_id);

        // Confirm payment with saved payment method
        const result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: selectedPaymentMethod.stripe_payment_method_id,
        });

        paymentError = result.error;
        paymentIntent = result.paymentIntent;
      } else {
        // Use new payment method from PaymentElement
        console.log('Using new payment method from form');

        const result = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/checkout/success`,
            payment_method_data: {
              billing_details: {
                name: `${billingAddress?.firstName || formData.shipping.firstName} ${billingAddress?.lastName || formData.shipping.lastName}`,
                email: formData.email,
                phone: formData.phone,
                address: {
                  line1: billingAddress?.address || formData.shipping.address,
                  line2: billingAddress?.apartment || formData.shipping.apartment || undefined,
                  city: billingAddress?.city || formData.shipping.city,
                  state: billingAddress?.state || formData.shipping.state,
                  postal_code: billingAddress?.postalCode || formData.shipping.postalCode,
                  country: billingAddress?.country || formData.shipping.country,
                }
              }
            }
          },
          redirect: 'if_required',
        });

        paymentError = result.error;
        paymentIntent = result.paymentIntent;
      }

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

      const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);

      // Determine userId: use authenticated user's ID, or createdUserId from checkout
      const orderUserId = user?.id || createdUserId || null;

      // Log discount info for debugging
      console.log('💰 Applied discounts:', appliedDiscounts);

      // Calculate total discount amount
      const totalDiscountAmount = appliedDiscounts.reduce((sum, discount) => sum + (discount.amountOff || 0), 0);

      const orderData = {
        user_id: orderUserId, // Use the orderUserId directly
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
        currency: 'CAD',
        // Include discount information if applicable
        // For now, we'll use the first discount for backward compatibility
        // TODO: Update database to support multiple discount codes per order
        discount_code_id: appliedDiscounts[0]?.discountId || null,
        discount_amount: totalDiscountAmount,
        // Store all discount codes as metadata
        discount_codes: appliedDiscounts.map(d => ({
          id: d.discountId,
          code: d.code,
          amount: d.amountOff
        })),
        // Include payment details since payment already succeeded
        stripe_payment_intent_id: paymentIntent.id,
        payment_method: paymentIntent.payment_method,
        // ⚠️ IMPORTANT: Create with 'pending' status first
        // Then update to 'confirmed' to trigger inventory reduction
        payment_status: 'pending',
        status: 'pending',
      };

      console.log('📦 Order data being sent:', {
        discount_code_id: orderData.discount_code_id,
        discount_amount: orderData.discount_amount,
        discount_codes: orderData.discount_codes
      });

      const orderResponse = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();

        // Note: Account creation errors are now handled earlier in the checkout flow
        // This section only handles order creation errors

        // Invalid cart data
        if (errorData.error === 'Invalid cart data') {
          toast({
            title: t('invalidCartData') || 'Invalid Cart Data',
            description: errorData.message || 'Some items in your cart are invalid. Please refresh and try again.',
            variant: 'destructive',
            duration: 8000,
          });
          console.error('⚠️ Payment succeeded but cart validation failed');
          setIsProcessing(false);
          return;
        }

        // Inventory errors
        if (errorData.error === 'Insufficient inventory' && errorData.details) {
          const itemsList = errorData.details
            .map((item: InventoryError) => `• ${item.productName} (${item.variant}): ${item.message}`)
            .join('\n');

          toast({
            title: t('outOfStock'),
            description: `${t('itemsNoLongerAvailable')}:\n\n${itemsList}\n\n${t('updateCartAndTryAgain')}`,
            variant: 'destructive',
            duration: 10000,
          });

          // Payment already succeeded but order creation failed
          // User needs to contact support for refund
          console.error('⚠️ Payment succeeded but order creation failed - inventory issue');
          setIsProcessing(false);
          return;
        }

        // Generic error
        throw new Error(errorData.message || errorData.error || 'Failed to create order');
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

      // Save address and payment method for authenticated users
      const currentUserId = user?.id || createdUserId;
      if ((isAuth || createdUserId) && currentUserId) {
        try {
          // Save shipping address if user opted to
          if (saveAddress) {
            const shippingAddress = formData.shipping;
            // Check if address already exists (from selector) or is new
            const existingAddresses = await addressService.getUserAddresses(currentUserId);
            const addressExists = existingAddresses.some(addr =>
              addr.address_line_1 === shippingAddress.address &&
              addr.city === shippingAddress.city &&
              addr.postal_code === shippingAddress.postalCode
            );

            if (!addressExists) {
              await addressService.createAddressFromCheckout(
                currentUserId,
                {
                  firstName: shippingAddress.firstName,
                  lastName: shippingAddress.lastName,
                  address: shippingAddress.address,
                  apartment: shippingAddress.apartment,
                  city: shippingAddress.city,
                  state: shippingAddress.state,
                  postalCode: shippingAddress.postalCode,
                  country: shippingAddress.country,
                },
                'shipping',
                true // Set as default
              );
              console.log('✅ Shipping address saved to profile');
            }

            // Save billing address if different
            if (!formData.sameAsShipping && formData.billing) {
              const billingAddress = formData.billing;
              const billingExists = existingAddresses.some(addr =>
                addr.address_line_1 === billingAddress.address &&
                addr.city === billingAddress.city &&
                addr.postal_code === billingAddress.postalCode &&
                addr.type === 'billing'
              );

              if (!billingExists && billingAddress.address) {
                await addressService.createAddressFromCheckout(
                  currentUserId,
                  {
                    firstName: billingAddress.firstName || '',
                    lastName: billingAddress.lastName || '',
                    address: billingAddress.address || '',
                    apartment: billingAddress.apartment,
                    city: billingAddress.city || '',
                    state: billingAddress.state || '',
                    postalCode: billingAddress.postalCode || '',
                    country: billingAddress.country || 'CA',
                  },
                  'billing',
                  true // Set as default
                );
                console.log('✅ Billing address saved to profile');
              }
            }
          }

          // Save payment method if user opted to and used a new payment method
          if (savePaymentMethod && paymentIntent.payment_method && !selectedPaymentMethod) {
            try {
              // Get payment method details from Stripe
              const paymentMethodResponse = await fetch('/api/stripe/get-payment-method', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  paymentMethodId: paymentIntent.payment_method,
                }),
              });

              if (paymentMethodResponse.ok) {
                const { paymentMethod } = await paymentMethodResponse.json();

                // Check if payment method already exists
                const exists = await paymentMethodService.checkPaymentMethodExists(
                  currentUserId,
                  paymentMethod.id
                );

                if (!exists && paymentMethod.card) {
                  // Save to database
                  await paymentMethodService.savePaymentMethod(
                    currentUserId,
                    paymentMethod.id,
                    {
                      brand: paymentMethod.card.brand,
                      last4: paymentMethod.card.last4,
                      exp_month: paymentMethod.card.exp_month,
                      exp_year: paymentMethod.card.exp_year,
                    },
                    `${formData.shipping.firstName} ${formData.shipping.lastName}`,
                    undefined, // billing address ID if needed
                    true // Set as default
                  );
                  console.log('✅ Payment method saved to profile');
                }
              }
            } catch (error) {
              console.error('Error saving payment method:', error);
              // Don't fail the order, just log the error
            }
          }
        } catch (error) {
          console.error('Error saving address/payment method:', error);
          // Don't fail the order, just log the error
        }
      }

      // Clear cart
      if (isAuth && user?.id) {
        await dispatch(clearCartDB(user.id));
      } else {
        sessionStorage.setItem('payment_just_completed', 'true');
        dispatch(clearCartLocal());
      }

      // Clear discount from session (use correct key)
      sessionStorage.removeItem('checkout_discounts');

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
    <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
      {/* Payment Section */}
      <div>
        <h2 className="text-lg md:text-xl font-black text-gray-900 mb-3 md:mb-4">{t('payment')}</h2>

        {/* Show saved payment methods for authenticated users */}
        {shouldShowSavedPayments && currentUserId && (
          <div className="mb-6">
            <PaymentMethodSelector
              userId={currentUserId}
              onSelectPaymentMethod={handleSelectPaymentMethod}
              onAddNewPaymentMethod={handleAddNewPaymentMethod}
              selectedPaymentMethodId={selectedPaymentMethod?.id}
            />
          </div>
        )}

        {/* Show new payment form if no saved methods or user chose to add new */}
        {(!shouldShowSavedPayments || useNewPayment) && (
          <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <input type="radio" name="payment" className="w-5 h-5 accent-gray-900" defaultChecked />
                  <span className="font-bold text-gray-900">{t('paymentMethod')}</span>
                </div>
                <div className="flex gap-1">
                  <div className="w-8 h-5 bg-white border border-gray-200 rounded"></div>
                  <div className="w-8 h-5 bg-white border border-gray-200 rounded"></div>
                </div>
              </label>
            </div>
            <div className="p-4 md:p-6 bg-white">
              <PaymentElement
                options={{
                  layout: 'tabs',
                  fields: {
                    billingDetails: 'never'
                  }
                }}
              />

              {/* Option to save payment method */}
              {currentUserId && (
                <div className="mt-4">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={savePaymentMethod}
                      onChange={(e) => setSavePaymentMethod(e.target.checked)}
                      className="w-5 h-5 border-2 border-gray-300 rounded accent-gray-900"
                    />
                    <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900">
                      {t('savePaymentMethodToProfile')}
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Save Address Option for Authenticated Users */}
      {currentUserId && (
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={saveAddress}
              onChange={(e) => setSaveAddress(e.target.checked)}
              className="w-5 h-5 border-2 border-gray-300 rounded accent-gray-900"
            />
            <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900">
              {t('saveAddressToProfile')}
            </span>
          </label>
        </div>
      )}

      {/* Terms Checkbox */}
      <label className="flex items-center gap-3 cursor-pointer group">
        <input
          type="checkbox"
          id="terms"
          checked={agreedToTerms}
          onChange={(e) => setAgreedToTerms(e.target.checked)}
          className="w-5 h-5 border-2 border-gray-300 rounded accent-gray-900"
        />
        <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900">
          {t('agreeToTerms')}{' '}
          <a href="/terms" target="_blank" className="text-gray-900 hover:underline">
            {t('termsAndConditions')}
          </a>
          {' '}{t('and')}{' '}
          <a href="/privacy" target="_blank" className="text-gray-900 hover:underline">
            {t('privacyPolicy')}
          </a>
        </span>
      </label>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || isProcessing || !agreedToTerms}
        className="w-full py-4 md:py-5 bg-gray-900 text-white font-black text-base md:text-lg rounded-xl hover:bg-gray-800 transition-all shadow-lg hover:-translate-y-1 disabled:opacity-50 disabled:transform-none"
      >
        {isProcessing ? (
          <>
            <span className="loader" />
            {t('processing')}
          </>
        ) : (
          `${t('payNow')} $${total.toFixed(2)}`
        )}
      </button>

      {/* Back Button */}
      <button
        type="button"
        onClick={onBack}
        className="w-full text-center text-gray-500 hover:text-gray-900 text-xs md:text-sm font-medium"
      >
        ← {t('backToShipping')}
      </button>
    </form>
  );
}