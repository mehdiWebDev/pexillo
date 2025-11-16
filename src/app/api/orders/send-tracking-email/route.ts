// src/app/api/orders/send-tracking-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

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

// Shipping carriers configuration
const CARRIERS = {
  canada_post: {
    name: 'Postes Canada / Canada Post',
    trackingUrl: (trackingNumber: string) =>
      `https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${trackingNumber}`
  },
  purolator: {
    name: 'Purolator',
    trackingUrl: (trackingNumber: string) =>
      `https://www.purolator.com/en/shipping/tracker?pin=${trackingNumber}`
  },
  ups: {
    name: 'UPS',
    trackingUrl: (trackingNumber: string) =>
      `https://www.ups.com/track?loc=en_CA&tracknum=${trackingNumber}`
  },
  fedex: {
    name: 'FedEx',
    trackingUrl: (trackingNumber: string) =>
      `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`
  }
};

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Check if user is authenticated and is admin
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Fetch order with full details
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if tracking information exists
    if (!order.tracking_number || !order.shipping_carrier) {
      return NextResponse.json(
        { error: 'Tracking information not set' },
        { status: 400 }
      );
    }

    // Parse shipping address from JSONB
    const shippingAddress = typeof order.shipping_address === 'string'
      ? JSON.parse(order.shipping_address)
      : order.shipping_address;

    // Get customer email - Handle guest vs registered users
    let customerEmail = '';
    let customerName = '';

    if (order.user_id) {
      const { data: userProfile } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .eq('id', order.user_id)
        .single();

      if (userProfile) {
        customerEmail = userProfile.email || '';
        customerName = userProfile.full_name || 'Valued Customer';
      }
    } else {
      // Guest order
      customerEmail = order.guest_email || '';
      customerName = shippingAddress?.firstName || 'Valued Customer';
    }

    if (!customerEmail) {
      return NextResponse.json(
        { error: 'Customer email not found' },
        { status: 400 }
      );
    }

    // Get order items
    const { data: orderItems } = await supabaseAdmin
      .from('order_items')
      .select(`
        quantity,
        unit_price,
        total_price,
        products (name),
        product_variants (size, color)
      `)
      .eq('order_id', orderId);

    // Format items for email
    const items = (orderItems || []).map((item: any) => ({
      name: item.products?.name || 'Product',
      variant: `${item.product_variants?.size || ''} - ${item.product_variants?.color || ''}`.trim(),
      quantity: item.quantity,
      total: item.total_price.toFixed(2)
    }));

    // Detect language from parsed shipping address
    const language = shippingAddress?.state === 'QC' ? 'fr' : 'en';

    // Generate tracking URL
    const carrier = CARRIERS[order.shipping_carrier as keyof typeof CARRIERS];
    if (!carrier) {
      return NextResponse.json(
        { error: 'Invalid shipping carrier' },
        { status: 400 }
      );
    }

    const trackingUrl = carrier.trackingUrl(order.tracking_number);

    // Format estimated delivery date
    let estimatedDelivery = '';
    if (order.estimated_delivery_date) {
      const date = new Date(order.estimated_delivery_date);
      estimatedDelivery = date.toLocaleDateString(
        language === 'fr' ? 'fr-CA' : 'en-CA',
        { year: 'numeric', month: 'long', day: 'numeric' }
      );
    }

    // Send email via SendGrid
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_TRACKING_TEMPLATE_ID) {
      console.error('SendGrid not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
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
      console.error('SendGrid error:', error);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    console.log('✅ Tracking email sent to:', customerEmail);

    return NextResponse.json({
      success: true,
      message: 'Tracking email sent successfully'
    });
  } catch (error: any) {
    console.error('Error in send tracking email API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
