// app/api/stripe/create-payment-intent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

interface CartItem {
  id: string;
  quantity: number;
}

export async function POST(req: NextRequest) {
  try {
    const { amount, email, items, currency = 'cad' } = await req.json();

    console.log('Received payment intent request: !!!!', {
      amount,
      email,
      items,
      currency,
    });

    if (!amount || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('💳 Creating Stripe payment intent:', {
      amount: `$${(amount / 100).toFixed(2)}`,
      currency: currency.toUpperCase(),
      email
    });

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Amount in cents
      currency: currency.toLowerCase(), // ✅ FIXED: Use CAD
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        email,
        items: JSON.stringify(items.map((item: CartItem) => ({
          id: item.id,
          quantity: item.quantity,
        }))),
      },
    });

    console.log('✅ Payment intent created:', paymentIntent.id);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('❌ Payment intent error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}