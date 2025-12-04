// src/app/api/stripe/attach-payment-method/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

export async function POST(request: Request) {
  try {
    const { paymentMethodId, customerId } = await request.json();

    if (!paymentMethodId || !customerId) {
      return NextResponse.json(
        { error: 'Payment method ID and customer ID are required' },
        { status: 400 }
      );
    }

    // Attach the payment method to the customer
    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    return NextResponse.json({ paymentMethod });
  } catch (error) {
    console.error('Error attaching payment method:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to attach payment method';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}