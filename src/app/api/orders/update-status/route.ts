// app/api/orders/update-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export async function POST(req: NextRequest) {
  try {
    const { orderId, status, paymentStatus, stripePaymentIntentId, paymentMethod } = await req.json();

    console.log('🔄 Updating order status:', {
      orderId,
      status,
      paymentStatus,
      stripePaymentIntentId,
      paymentMethod
    });

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updateData.status = status;
    }

    if (paymentStatus) {
      updateData.payment_status = paymentStatus;
    }

    if (stripePaymentIntentId) {
      updateData.stripe_payment_intent_id = stripePaymentIntentId;
    }

    // Fetch payment method type from Stripe if payment method ID is provided
    if (paymentMethod) {
      try {
        const paymentMethodDetails = await stripe.paymentMethods.retrieve(paymentMethod);
        updateData.payment_method = paymentMethodDetails.type; // e.g., "card", "apple_pay", "google_pay"
        console.log('💳 Payment method type:', paymentMethodDetails.type);
      } catch (error) {
        console.error('Failed to fetch payment method details:', error);
        // Fallback to storing the ID if fetch fails
        updateData.payment_method = paymentMethod;
      }
    }

    console.log('📝 Update data:', updateData);

    // Update order using admin client (bypasses RLS)
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error('❌ Order update error:', error);
      return NextResponse.json(
        { error: 'Failed to update order: ' + error.message },
        { status: 500 }
      );
    }

    console.log('✅ Order updated successfully:', order.order_number);
    console.log('   Status:', order.status);
    console.log('   Payment Status:', order.payment_status);

    // Check if this update should trigger inventory reduction
    if (order.status === 'confirmed' || order.status === 'processing') {
      console.log('🔔 Inventory reduction trigger should fire now!');
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        payment_status: order.payment_status,
      },
    });
  } catch (error: any) {
    console.error('💥 Order update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update order' },
      { status: 500 }
    );
  }
}