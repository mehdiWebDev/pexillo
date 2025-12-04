// src/app/api/stripe/get-payment-method/route.ts
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

    // Retrieve the payment method from Stripe
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    return NextResponse.json({ paymentMethod });
  } catch (error) {
    console.error('Error retrieving payment method:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve payment method';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}