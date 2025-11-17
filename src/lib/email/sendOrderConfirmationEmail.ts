// lib/email/sendOrderConfirmationEmail.ts
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

interface OrderConfirmationData {
  orderNumber: string;
  lookupCode?: string;
  customerName: string;
  subtotal: string;
  shippingAmount: string;
  freeShipping: boolean;
  taxAmount: string;
  totalAmount: string;
  shippingAddress: {
    firstName: string;
    lastName: string;
    address: string;
    apartment?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: Array<{
    name: string;
    variant: string;
    quantity: number;
    price: string;
    total: string;
  }>;
}

export async function sendOrderConfirmationEmail(email: string, orderData: OrderConfirmationData) {
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_ORDER_TEMPLATE_ID) {
    console.log('⚠️ SendGrid not configured, skipping confirmation email');
    return;
  }

  console.log('📧 Sending order confirmation email to:', email);

  // Detect language based on province
  const language = orderData.shippingAddress.state === 'QC' ? 'fr' : 'en';

  const emailPayload = {
    personalizations: [{
      to: [{ email }],
      dynamic_template_data: {
        language,
        orderNumber: orderData.orderNumber,
        lookupCode: orderData.lookupCode || '',
        customerName: orderData.customerName,
        subtotal: orderData.subtotal,
        shippingAmount: orderData.shippingAmount,
        freeShipping: orderData.freeShipping,
        taxAmount: orderData.taxAmount,
        totalAmount: orderData.totalAmount,
        shippingAddress: orderData.shippingAddress,
        items: orderData.items,
        trackOrderUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://pixello.ca'}/track-order`
      }
    }],
    from: {
      email: process.env.FROM_EMAIL || 'orders@pixello.ca',
      name: 'Pixello'
    },
    template_id: process.env.SENDGRID_ORDER_TEMPLATE_ID
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
    const errorText = await response.text();
    console.error('❌ SendGrid error:', errorText);
    throw new Error(`Failed to send confirmation email: ${errorText}`);
  }

  console.log('✅ Order confirmation email sent successfully');
}

// Helper function to send confirmation email by order ID
export async function sendConfirmationEmailByOrderId(orderId: string): Promise<void> {
  console.log('📧 Preparing to send confirmation email for order:', orderId);

  // Fetch order with full details
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    console.error('❌ Failed to fetch order:', orderError);
    throw new Error('Order not found');
  }

  // Parse shipping address from JSONB
  const shippingAddress = typeof order.shipping_address === 'string'
    ? JSON.parse(order.shipping_address)
    : order.shipping_address;

  // Get customer email and name
  // IMPORTANT: Always use the email from the checkout form (stored in shipping_address.email)
  // This ensures we send confirmation to the email entered during checkout,
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
      customerName = userProfile.full_name || shippingAddress?.firstName || 'Valued Customer';
    } else {
      customerName = shippingAddress?.firstName || 'Valued Customer';
    }
  } else {
    // Guest order
    customerName = shippingAddress?.firstName || 'Valued Customer';
  }

  if (!customerEmail) {
    console.error('❌ No customer email found for order:', orderId);
    throw new Error('Customer email not found');
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

  const items = (orderItems || []).map((item: any) => ({
    name: item.products?.name || 'Product',
    variant: `${item.product_variants?.size || ''} - ${item.product_variants?.color || ''}`.trim().replace(/^-\s*/, ''),
    quantity: item.quantity,
    price: item.unit_price.toFixed(2),
    total: item.total_price.toFixed(2)
  }));

  // Send confirmation email
  await sendOrderConfirmationEmail(customerEmail, {
    orderNumber: order.order_number,
    lookupCode: order.guest_lookup_code || undefined,
    customerName,
    subtotal: order.subtotal.toFixed(2),
    shippingAmount: order.shipping_amount.toFixed(2),
    freeShipping: order.shipping_amount === 0,
    taxAmount: order.tax_amount.toFixed(2),
    totalAmount: order.total_amount.toFixed(2),
    shippingAddress: {
      firstName: shippingAddress?.firstName || '',
      lastName: shippingAddress?.lastName || '',
      address: shippingAddress?.address || '',
      apartment: shippingAddress?.apartment || '',
      city: shippingAddress?.city || '',
      state: shippingAddress?.state || '',
      postalCode: shippingAddress?.postalCode || '',
      country: shippingAddress?.country === 'CA' ? 'Canada' : 'United States'
    },
    items
  });
}
