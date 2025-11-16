// app/[locale]/checkout/CheckoutClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/src/i18n/routing';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslations, useLocale } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import {
    ArrowLeft,
    CreditCard,
    Truck,
    Lock,
    Currency,
} from 'lucide-react';
import { RootState } from '@/src/store';
import { selectCartItems, selectCartSubtotal, clearCartLocal } from '@/src/store/slices/cartSlice';
import { toast } from '@/src/hooks/use-toast';
import ShippingForm from './components/ShippingForm';
import PaymentForm from './components/PaymentForm';
import OrderSummary from './components/OrderSummary';
import CheckoutSteps from './components/CheckoutSteps';
import Loader from '@/src/components/ui/Loader';


// FIX: Check if the key exists before initializing
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!stripeKey) {
    console.error('Stripe publishable key is missing! Add NEXT_PUBLIC_NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to your .env.local file');
}

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Valid Canadian province codes
const VALID_PROVINCE_CODES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NT', 'NS', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];

// Checkout form schema
const checkoutSchema = z.object({
    // Contact
    email: z.string().email('Invalid email address'),
    phone: z.string().min(10, 'Invalid phone number'),

    // Shipping address
    shipping: z.object({
        firstName: z.string().min(2, 'First name is required'),
        lastName: z.string().min(2, 'Last name is required'),
        address: z.string().min(5, 'Address is required'),
        apartment: z.string().optional(),
        city: z.string().min(2, 'City is required'),
        state: z.string()
            .min(2, 'Province is required')
            .refine((val) => VALID_PROVINCE_CODES.includes(val), {
                message: 'Please select a valid Canadian province'
            }),
        postalCode: z.string().min(5, 'Postal code is required'),
        country: z.string().min(2, 'Country is required'),
    }),

    // Billing address
    sameAsShipping: z.boolean().default(true),
    billing: z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        address: z.string().optional(),
        apartment: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postalCode: z.string().optional(),
        country: z.string().optional(),
    }).optional(),

    // Account
    createAccount: z.boolean().default(false),
    password: z.string().min(8).optional(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export default function CheckoutClient() {
    const router = useRouter();
    const dispatch = useDispatch();
    const t = useTranslations('checkout');
    const locale = useLocale();

    const items = useSelector(selectCartItems);
    const subtotal = useSelector(selectCartSubtotal);
    const { isAuth, user } = useSelector((state: RootState) => state.auth);

    const [currentStep, setCurrentStep] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [clientSecret, setClientSecret] = useState('');
    const [taxRate, setTaxRate] = useState(0);
    const [shippingCost, setShippingCost] = useState(0);
    const [isInitialized, setIsInitialized] = useState(false);

    const form = useForm<CheckoutFormData>({
        resolver: zodResolver(checkoutSchema),
        defaultValues: {
            email: user?.email || '',
            sameAsShipping: true,
            createAccount: false,
        },
    });

    // Apply translations to cart items
    const translatedItems = locale === 'en' ? items : items.map(item => {
        const productTrans = item.product_translations?.[locale] || {};
        const variantTrans = item.variant_translations?.[locale] || {};

        return {
            ...item,
            product_name: productTrans.name || item.product_name,
            variant_size: variantTrans.size || item.variant_size,
            variant_color: variantTrans.color || item.variant_color,
        };
    });

    // Calculate totals
    const calculateShipping = (total: number) => {
        return total >= 150 ? 0 : 15.99;
    };

    const tax = subtotal * taxRate;
    const shipping = calculateShipping(subtotal);
    const total = subtotal + tax + shipping;

    // Load cart and check if empty
    useEffect(() => {
        const justCompletedPayment = sessionStorage.getItem('payment_just_completed');

        if (items.length === 0 && !justCompletedPayment) {
            router.push('/cart');
            return;
        }

        // Clear the flag after checking
        if (justCompletedPayment) {
            sessionStorage.removeItem('payment_just_completed');
        }

        setIsInitialized(true);
        setShippingCost(shipping);
    }, [items, router, shipping]);

    // Calculate tax when address changes
    const handleAddressChange = async (address: any) => {
        if (address.state && address.country) {
            try {
                const response = await fetch('/api/tax/calculate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        country: address.country,
                        state: address.state,
                    }),
                });

                if (response.ok) {
                    const { rate } = await response.json();
                    setTaxRate(rate);
                }
            } catch (error) {
                console.error('Tax calculation error:', error);
            }
        }
    };

    // Create payment intent when moving to step 2
    const handleNextStep = async () => {
        const isValid = await form.trigger([
            'email',
            'phone',
            'shipping.firstName',
            'shipping.lastName',
            'shipping.address',
            'shipping.city',
            'shipping.state',
            'shipping.postalCode',
            'shipping.country',
        ]);

        if (!isValid) {
            toast({
                title: t('error'),
                description: t('pleaseCompleteAllFields'),
                variant: 'destructive',
            });
            return;
        }

        setIsProcessing(true);

        try {
            // Create payment intent
            const response = await fetch('/api/stripe/create-payment-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: Math.round(total * 100), // Convert to cents
                    email: form.getValues('email'),
                    items: translatedItems,
                    currency: 'cad',
                }),
            });

            if (!response.ok) throw new Error('Failed to create payment intent');

            const { clientSecret } = await response.json();
            setClientSecret(clientSecret);
            setCurrentStep(2);

        } catch (error) {
            toast({
                title: t('error'),
                description: t('paymentSetupFailed'),
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePreviousStep = () => {
        setCurrentStep(1);
    };

    if (!isInitialized) {
        return <Loader type="default" text={t('loading')} fullScreen />;
    }

    if (items.length === 0) {
        return null; // Will redirect to cart
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => router.push('/cart')}
                        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
                    >
                        <ArrowLeft size={20} />
                        {t('backToCart')}
                    </button>

                    <h1 className="text-3xl font-bold">{t('checkout')}</h1>
                </div>

                {/* Checkout Steps */}
                <CheckoutSteps currentStep={currentStep} />

                <div className="grid lg:grid-cols-5 gap-8 mt-8">
                    {/* Main Content */}
                    <div className="lg:col-span-3">
                        {currentStep === 1 ? (
                            <div className="space-y-6">
                                <ShippingForm
                                    form={form}
                                    onAddressChange={handleAddressChange}
                                    isAuth={isAuth}
                                />

                                {/* Continue to Payment Button */}
                                <div className="flex justify-between items-center pt-6">
                                    <button
                                        type="button"
                                        onClick={() => router.push('/cart')}
                                        className="text-primary hover:underline"
                                    >
                                        {t('returnToCart')}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleNextStep}
                                        disabled={isProcessing}
                                        className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isProcessing ? (
                                            <span className="loader" />
                                        ) : (
                                            <>
                                                {t('continueToPayment')}
                                                <CreditCard size={20} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <Elements
                                stripe={stripePromise}
                                options={{
                                    clientSecret,
                                    appearance: {
                                        theme: 'stripe',
                                        variables: {
                                            colorPrimary: '#000000',
                                        },
                                    },
                                }}
                            >
                                <PaymentForm
                                    form={form}
                                    clientSecret={clientSecret}
                                    total={total}
                                    tax={tax}
                                    shipping={shipping}
                                    items={translatedItems}
                                    onBack={handlePreviousStep}
                                />
                            </Elements>
                        )}
                    </div>

                    {/* Order Summary Sidebar */}
                    <div className="lg:col-span-2">
                        <OrderSummary
                            items={translatedItems}
                            subtotal={subtotal}
                            shipping={shipping}
                            tax={tax}
                            total={total}
                        />

                        {/* Security Badges */}
                        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <Lock size={16} />
                                <span>{t('secureCheckout')}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Truck size={16} />
                                <span>{t('freeShippingOver150')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}