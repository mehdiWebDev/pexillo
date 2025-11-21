// lib/email/sendAdminOrderNotification.ts
import { createClient } from '@supabase/supabase-js';

interface SettingValue {
  email?: string;
}

interface OrderItem {
  quantity: number;
  unit_price: number;
  total_price: number;
  products?: {
    name: string;
  };
  product_variants?: {
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

/**
 * Get admin notification email from admin_settings table
 * Falls back to MAIL_TO_ME environment variable if not set in database
 */
async function getAdminNotificationEmail(): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'admin_notification_email')
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.log('⚠️ Admin notification email not set in database, using MAIL_TO_ME env variable');
      return process.env.MAIL_TO_ME || null;
    }

    // setting_value is JSONB, extract the email
    const email = typeof data.setting_value === 'object'
      ? (data.setting_value as SettingValue).email
      : data.setting_value;

    return email || process.env.MAIL_TO_ME || null;
  } catch (error) {
    console.error('❌ Error fetching admin notification email:', error);
    return process.env.MAIL_TO_ME || null;
  }
}

/**
 * Send admin notification email when a new order is received
 */
export async function sendAdminOrderNotification(orderId: string): Promise<void> {
  console.log('📧 Preparing admin notification for order:', orderId);

  // Get admin notification email
  const adminEmail = await getAdminNotificationEmail();

  if (!adminEmail) {
    console.log('⚠️ Admin notification email not configured, skipping notification');
    return;
  }

  if (!process.env.SENDGRID_API_KEY) {
    console.log('⚠️ SendGrid not configured, skipping admin notification');
    return;
  }

  // Fetch order with full details
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    console.error('❌ Failed to fetch order for admin notification:', orderError);
    throw new Error('Order not found');
  }

  // Parse shipping address from JSONB
  const shippingAddress = typeof order.shipping_address === 'string'
    ? JSON.parse(order.shipping_address)
    : order.shipping_address;

  // Get customer info
  const customerEmail = shippingAddress?.email || order.guest_email || 'N/A';
  let customerName = '';

  if (order.user_id) {
    // Registered user
    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', order.user_id)
      .single();

    if (userProfile) {
      customerName = userProfile.full_name || shippingAddress?.firstName || 'N/A';
    } else {
      customerName = `${shippingAddress?.firstName || ''} ${shippingAddress?.lastName || ''}`.trim() || 'N/A';
    }
  } else {
    // Guest order
    customerName = `${shippingAddress?.firstName || ''} ${shippingAddress?.lastName || ''}`.trim() || 'N/A';
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

  const items = (orderItems || []).map((item: OrderItem) => ({
    name: item.products?.name || 'Product',
    variant: `${item.product_variants?.size || ''} - ${item.product_variants?.color || ''}`.trim().replace(/^-\s*/, ''),
    quantity: item.quantity,
    price: item.unit_price.toFixed(2),
    total: item.total_price.toFixed(2)
  }));

  // Simple HTML email (no template needed for admin notifications)
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #000; color: #fff; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; }
          .section { margin-bottom: 20px; }
          .section h2 { color: #000; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .info-row { margin: 10px 0; }
          .info-label { font-weight: bold; display: inline-block; width: 150px; }
          .items-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .items-table th { background-color: #000; color: #fff; padding: 10px; text-align: left; }
          .items-table td { padding: 10px; border-bottom: 1px solid #ddd; }
          .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 New Order Received!</h1>
          </div>

          <div class="content">
            <div class="section">
              <h2>Order Details</h2>
              <div class="info-row">
                <span class="info-label">Order Number:</span>
                <span>${order.order_number}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Order Date:</span>
                <span>${new Date(order.created_at).toLocaleString('en-CA', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Status:</span>
                <span style="text-transform: capitalize;">${order.status}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Payment Status:</span>
                <span style="text-transform: capitalize;">${order.payment_status}</span>
              </div>
            </div>

            <div class="section">
              <h2>Customer Information</h2>
              <div class="info-row">
                <span class="info-label">Name:</span>
                <span>${customerName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Email:</span>
                <span>${customerEmail}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Phone:</span>
                <span>${shippingAddress?.phone || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Customer Type:</span>
                <span>${order.user_id ? 'Registered User' : 'Guest'}</span>
              </div>
            </div>

            <div class="section">
              <h2>Shipping Address</h2>
              <div class="info-row">
                ${shippingAddress?.firstName || ''} ${shippingAddress?.lastName || ''}<br>
                ${shippingAddress?.address || ''}<br>
                ${shippingAddress?.apartment ? `${shippingAddress.apartment}<br>` : ''}
                ${shippingAddress?.city || ''}, ${shippingAddress?.state || ''} ${shippingAddress?.postalCode || ''}<br>
                ${shippingAddress?.country === 'CA' ? 'Canada' : 'United States'}
              </div>
            </div>

            <div class="section">
              <h2>Order Items</h2>
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Variant</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map(item => `
                    <tr>
                      <td>${item.name}</td>
                      <td>${item.variant || '-'}</td>
                      <td>${item.quantity}</td>
                      <td>$${item.price}</td>
                      <td>$${item.total}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div class="section">
              <div class="info-row">
                <span class="info-label">Subtotal:</span>
                <span>$${order.subtotal.toFixed(2)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Shipping:</span>
                <span>${order.shipping_amount === 0 ? 'FREE' : `$${order.shipping_amount.toFixed(2)}`}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Tax:</span>
                <span>$${order.tax_amount.toFixed(2)}</span>
              </div>
              <div class="total">
                Total: $${order.total_amount.toFixed(2)} CAD
              </div>
            </div>
          </div>

          <div class="footer">
            <p>This is an automated notification from your Pixello store.</p>
            <p>View order in admin dashboard: <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://pixello.ca'}/admin/orders/${order.id}">View Order</a></p>
          </div>
        </div>
      </body>
    </html>
  `;

  // Send email using SendGrid
  const emailPayload = {
    personalizations: [{
      to: [{ email: adminEmail }],
    }],
    from: {
      email: process.env.FROM_EMAIL || 'orders@pixello.ca',
      name: 'Pixello Store'
    },
    subject: `🛍️ New Order #${order.order_number} - $${order.total_amount.toFixed(2)}`,
    content: [{
      type: 'text/html',
      value: htmlContent
    }]
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
    console.error('❌ SendGrid error for admin notification:', errorText);
    throw new Error(`Failed to send admin notification email: ${errorText}`);
  }

  console.log('✅ Admin notification email sent successfully to:', adminEmail);
}
