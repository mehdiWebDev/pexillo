// app/api/orders/update-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { sendConfirmationEmailByOrderId } from '@/src/lib/email/sendOrderConfirmationEmail';

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
    const {
      orderId,
      status,
      paymentStatus,
      stripePaymentIntentId,
      paymentMethod,
      shipping_carrier,
      tracking_number,
      estimated_delivery_date
    } = await req.json();

    console.log('🔄 Updating order status:', {
      orderId,
      status,
      paymentStatus,
      stripePaymentIntentId,
      paymentMethod,
      shipping_carrier,
      tracking_number,
      estimated_delivery_date
    });

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Get current order to check previous status
    const { data: currentOrder } = await supabaseAdmin
      .from('orders')
      .select('status, tracking_number, shipping_carrier')
      .eq('id', orderId)
      .single();

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

    if (shipping_carrier !== undefined) {
      updateData.shipping_carrier = shipping_carrier;
    }

    if (tracking_number !== undefined) {
      updateData.tracking_number = tracking_number;
    }

    if (estimated_delivery_date !== undefined) {
      updateData.estimated_delivery_date = estimated_delivery_date;
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

    // ✅ Send order confirmation email when payment is confirmed
    if (paymentStatus === 'completed') {
      console.log('📧 Payment confirmed - sending order confirmation email...');
      try {
        await sendConfirmationEmailByOrderId(orderId);
        console.log('✅ Order confirmation email sent successfully');
      } catch (emailError) {
        console.error('⚠️ Failed to send confirmation email:', emailError);
        // Don't fail the order update if email fails
      }
    }

    // Auto-send tracking email if status changed to 'shipped' and tracking exists
    if (
      status === 'shipped' &&
      currentOrder?.status !== 'shipped' &&
      order.tracking_number &&
      order.shipping_carrier
    ) {
      console.log('📧 Auto-sending tracking email...');
      try {
        // Call send tracking email API internally
        await sendTrackingEmail(orderId);
        console.log('✅ Tracking email sent automatically');
      } catch (emailError) {
        console.error('⚠️ Failed to send tracking email:', emailError);
        // Don't fail the order update if email fails
      }
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

// Helper function to send tracking email
async function sendTrackingEmail(orderId: string) {
  const CARRIERS = {
    canada_post: {
      trackingUrl: (trackingNumber: string) =>
        `https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${trackingNumber}`
    },
    purolator: {
      trackingUrl: (trackingNumber: string) =>
        `https://www.purolator.com/en/shipping/tracker?pin=${trackingNumber}`
    },
    ups: {
      trackingUrl: (trackingNumber: string) =>
        `https://www.ups.com/track?loc=en_CA&tracknum=${trackingNumber}`
    },
    fedex: {
      trackingUrl: (trackingNumber: string) =>
        `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`
    }
  };

  // Fetch order with full details
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (!order || !order.tracking_number || !order.shipping_carrier) {
    throw new Error('Tracking information not available');
  }

  // Parse shipping address from JSONB
  const shippingAddress = typeof order.shipping_address === 'string'
    ? JSON.parse(order.shipping_address)
    : order.shipping_address;

  // Get customer email
  // IMPORTANT: Always use the email from the checkout form (stored in shipping_address.email)
  // This ensures we send tracking info to the email entered during checkout,
  // not the profile email which might be different
  let customerEmail = shippingAddress?.email || order.guest_email || '';
  let customerName = '';

  if (order.user_id) {
    // Registered user - get name from profile
    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', order.user_id)
      .single();

    if (userProfile) {
      customerName = userProfile.full_name || 'Valued Customer';
    } else {
      customerName = shippingAddress?.firstName || 'Valued Customer';
    }
  } else {
    // Guest order
    customerName = shippingAddress?.firstName || 'Valued Customer';
  }

  if (!customerEmail) {
    throw new Error('Customer email not found');
  }

  // Get order items
  const { data: orderItems } = await supabaseAdmin
    .from('order_items')
    .select(`
      quantity,
      total_price,
      products (name),
      product_variants (size, color)
    `)
    .eq('order_id', orderId);

  const items = (orderItems || []).map((item: any) => ({
    name: item.products?.name || 'Product',
    variant: `${item.product_variants?.size || ''} - ${item.product_variants?.color || ''}`.trim(),
    quantity: item.quantity,
    total: item.total_price.toFixed(2)
  }));

  // Language detection from parsed address
  const language = shippingAddress?.state === 'QC' ? 'fr' : 'en';
  const carrier = CARRIERS[order.shipping_carrier as keyof typeof CARRIERS];
  const trackingUrl = carrier.trackingUrl(order.tracking_number);

  let estimatedDelivery = '';
  if (order.estimated_delivery_date) {
    const date = new Date(order.estimated_delivery_date);
    estimatedDelivery = date.toLocaleDateString(
      language === 'fr' ? 'fr-CA' : 'en-CA',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );
  }

  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_TRACKING_TEMPLATE_ID) {
    console.log('SendGrid not configured, skipping tracking email');
    return;
  }

  const emailPayload = {
    personalizations: [{
      to: [{ email: customerEmail }],
      dynamic_template_data: {
        language,
        customerName,
        orderNumber: order.order_number,
        trackingNumber: order.tracking_number,
        carrier: order.shipping_carrier,
        trackingUrl,
        estimatedDelivery,
        totalAmount: order.total_amount.toFixed(2),
        items,
        shippingAddress: {
          firstName: shippingAddress?.firstName || '',
          lastName: shippingAddress?.lastName || '',
          address: shippingAddress?.address || '',
          apartment: shippingAddress?.apartment || '',
          city: shippingAddress?.city || '',
          state: shippingAddress?.state || '',
          postalCode: shippingAddress?.postalCode || '',
          country: shippingAddress?.country === 'CA' ? 'Canada' : 'United States'
        }
      }
    }],
    from: {
      email: process.env.FROM_EMAIL || 'orders@pixello.ca',
      name: 'Pixello'
    },
    template_id: process.env.SENDGRID_TRACKING_TEMPLATE_ID,
    subject: language === 'fr'
      ? 'Votre commande Pixello a été expédiée! 📦'
      : 'Your Pixello Order Has Shipped! 📦'
  };

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailPayload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SendGrid error: ${error}`);
  }
}
