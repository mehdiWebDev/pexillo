// src/lib/email/sendTrackingEmail.ts
import { createClient } from '@supabase/supabase-js';

interface OrderItem {
  quantity: number;
  total_price: number;
  products: {
    name: string;
  };
  product_variants: {
    size: string;
    color: string;
  };
}

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

/**
 * Send tracking notification email to customer
 * @param orderId - The order ID to send tracking email for
 * @throws Error if order not found, tracking info missing, or email fails to send
 */
export async function sendTrackingEmail(orderId: string): Promise<void> {
  // Fetch order with full details
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    throw new Error('Order not found');
  }

  // Validate tracking information
  if (!order.tracking_number || !order.shipping_carrier) {
    throw new Error('Tracking information not available');
  }

  // Parse shipping address from JSONB
  const shippingAddress = typeof order.shipping_address === 'string'
    ? JSON.parse(order.shipping_address)
    : order.shipping_address;

  console.log('📍 Shipping address for language detection:', {
    state: shippingAddress?.state,
    country: shippingAddress?.country,
    fullAddress: shippingAddress
  });

  // Get customer email and name
  // IMPORTANT: Always use email from shipping_address (checkout form) instead of profile email
  // This ensures we send to the email entered during checkout
  const customerEmail = shippingAddress?.email || order.guest_email || '';
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

  // Format items for email
  const items = (orderItems || []).map((item: OrderItem) => ({
    name: item.products.name || 'Product',
    variant: `${item.product_variants.size || ''} - ${item.product_variants.color || ''}`.trim(),
    quantity: item.quantity,
    total: item.total_price.toFixed(2)
  }));

  // Detect language from parsed shipping address
  const language = shippingAddress?.state === 'QC' ? 'fr' : 'en';

  console.log('🌍 Language detection:', {
    state: shippingAddress?.state,
    detectedLanguage: language,
    isQuebec: shippingAddress?.state === 'QC'
  });

  // Generate tracking URL
  const carrier = CARRIERS[order.shipping_carrier as keyof typeof CARRIERS];
  if (!carrier) {
    throw new Error('Invalid shipping carrier');
  }

  const trackingUrl = carrier.trackingUrl(order.tracking_number);

  // Format estimated delivery date
  let estimatedDelivery = '';
  if (order.estimated_delivery_date) {
    // Parse date as local date to avoid timezone shift
    const dateStr = order.estimated_delivery_date;
    const [year, month, day] = dateStr.includes('T')
      ? dateStr.split('T')[0].split('-')
      : dateStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    estimatedDelivery = date.toLocaleDateString(
      language === 'fr' ? 'fr-CA' : 'en-CA',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );
  }

  // Send email via SendGrid
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_TRACKING_TEMPLATE_ID) {
    console.error('SendGrid not configured');
    throw new Error('Email service not configured');
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
    template_id: process.env.SENDGRID_TRACKING_TEMPLATE_ID
  };

  console.log('📧 SendGrid payload being sent:', JSON.stringify(emailPayload, null, 2));

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
    throw new Error('Failed to send email');
  }

  console.log('✅ Tracking email sent to:', customerEmail);
}
