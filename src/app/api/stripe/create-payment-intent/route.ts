// app/api/stripe/create-payment-intent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

interface CartItem {
  id: string;
  quantity: number;
}


export async function POST(req: NextRequest) {
  try {
    const { amount, email, items, currency = 'cad', discount } = await req.json();

    console.log('Received payment intent request:', {
      amount,
      email,
      items: items?.length,
      currency,
      discount: discount ? discount.code : 'none',
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
      email,
      discount: discount ? `${discount.code} (-$${discount.amountOff})` : 'none'
    });

    // Build metadata object including discount info
    const metadata: Record<string, string> = {
      email,
      items: JSON.stringify(items.map((item: CartItem) => ({
        id: item.id,
        quantity: item.quantity,
      }))),
    };

    // Add discount metadata if applicable
    if (discount) {
      metadata.discountCode = discount.code;
      metadata.discountId = discount.discountId;
      metadata.discountAmount = discount.amountOff.toString();
      metadata.discountType = discount.type;
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Amount in cents (already includes discount)
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata,
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