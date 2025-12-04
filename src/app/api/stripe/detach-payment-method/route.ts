// src/app/api/stripe/detach-payment-method/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

export async function POST(request: Request) {
  try {
    const { paymentMethodId } = await request.json();

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    // Detach the payment method
    const paymentMethod = await stripe.paymentMethods.detach(paymentMethodId);

    return NextResponse.json({ paymentMethod });
  } catch (error) {
    console.error('Error detaching payment method:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to detach payment method';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}