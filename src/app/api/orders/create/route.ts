// app/api/orders/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

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

// Generate order number
function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${year}${month}-${random}`;
}

// Generate guest lookup code
function generateLookupCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();

    const {
      email,
      phone,
      shipping_address,
      billing_address,
      items,
      subtotal,
      tax_amount,
      shipping_amount,
      total_amount,
      create_account,
      password,
      currency,
    } = await req.json();

    console.log('Received order request: !!!!', {
      email,
      phone,
      shipping_address,
      billing_address,
      items,
      subtotal,
      tax_amount,
      shipping_amount,
      total_amount,
      create_account,
      password,
      currency,
    });

    // ✅ CRITICAL: Check inventory availability BEFORE creating order
    console.log('🔍 Checking inventory availability...');
    const inventoryChecks = await Promise.all(
      items.map(async (item: any) => {
        const { data: variant, error } = await supabaseAdmin
          .from('product_variants')
          .select('id, inventory_count, size, color, products!inner(name)')
          .eq('id', item.variant_id)
          .single();

        if (error || !variant) {
          return {
            valid: false,
            variantId: item.variant_id,
            error: 'Variant not found',
          };
        }

        if (variant.inventory_count < item.quantity) {
          return {
            valid: false,
            variantId: item.variant_id,
            productName: variant.products.name,
            variantDetails: `${variant.size} - ${variant.color}`,
            requested: item.quantity,
            available: variant.inventory_count,
            error: variant.inventory_count === 0
              ? 'Out of stock'
              : `Only ${variant.inventory_count} available`,
          };
        }

        return { valid: true, variantId: item.variant_id };
      })
    );

    // Check if any items failed inventory validation
    const invalidItems = inventoryChecks.filter(check => !check.valid);
    if (invalidItems.length > 0) {
      console.error('❌ Inventory validation failed:', invalidItems);
      return NextResponse.json(
        {
          error: 'Insufficient inventory',
          details: invalidItems.map(item => ({
            productName: item.productName,
            variant: item.variantDetails,
            message: item.error,
            requested: item.requested,
            available: item.available,
          })),
        },
        { status: 400 }
      );
    }

    console.log('✅ Inventory check passed for all items');

    // Check if user is logged in
    let userId = null;
    const accessToken = cookieStore.get('sb-access-token')?.value;

    if (accessToken) {
      // Create a regular client for auth check
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!
      );
      const { data: { user } } = await supabase.auth.getUser(accessToken);
      userId = user?.id || null;
    }

    // Create account if requested (guest checkout)
    if (create_account && !userId && password) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
      });

      if (authData?.user) {
        userId = authData.user.id;

        // Create profile using admin client
        await supabaseAdmin.from('profiles').insert({
          id: userId,
          email,
          first_name: shipping_address.firstName,
          last_name: shipping_address.lastName,
          phone,
        });
      }
    }

    // Generate order details
    const orderNumber = generateOrderNumber();
    const lookupCode = userId ? null : generateLookupCode();

    // Create order using admin client (bypasses RLS)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: userId,
        guest_email: userId ? null : email,
        guest_lookup_code: lookupCode,
        order_number: orderNumber,
        status: 'pending',
        payment_status: 'pending',
        subtotal,
        tax_amount,
        shipping_amount,
        total_amount,
        shipping_address: {
          ...shipping_address,
          email,
          phone,
        },
        billing_address,
        currency,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      return NextResponse.json(
        { error: 'Failed to create order: ' + orderError.message },
        { status: 500 }
      );
    }

    // Create order items using admin client
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      variant_id: item.variant_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Order items error:', itemsError);
      // Delete order if items fail
      await supabaseAdmin.from('orders').delete().eq('id', order.id);
      return NextResponse.json(
        { error: 'Failed to create order items: ' + itemsError.message },
        { status: 500 }
      );
    }

    // Send confirmation email with enhanced data for template
    if (email) {
      await sendOrderConfirmationEmail(email, {
        // Basic order info
        orderNumber,
        lookupCode,

        // Customer info
        customerName: shipping_address.firstName || 'Valued Customer',

        // All amounts
        subtotal: subtotal.toFixed(2),
        shippingAmount: shipping_amount.toFixed(2),
        freeShipping: shipping_amount === 0,
        taxAmount: tax_amount.toFixed(2),
        totalAmount: total_amount.toFixed(2),

        // Shipping address for template
        shippingAddress: {
          firstName: shipping_address.firstName,
          lastName: shipping_address.lastName,
          address: shipping_address.address,
          apartment: shipping_address.apartment || '',
          city: shipping_address.city,
          state: shipping_address.state,
          postalCode: shipping_address.postalCode,
          country: shipping_address.country === 'CA' ? 'Canada' : 'United States'
        },

        // Items formatted for template
        items: items.map((item: any) => ({
          name: item.product_name || 'Product',
          variant: `${item.variant_size || ''} - ${item.variant_color || ''}`.trim(),
          quantity: item.quantity,
          price: item.unit_price.toFixed(2),
          total: (item.unit_price * item.quantity).toFixed(2)
        }))
      });
    }

    return NextResponse.json({
      orderId: order.id,
      orderNumber,
      lookupCode,
      success: true,
    });
  } catch (error: any) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}

// SendGrid email function with template support
async function sendOrderConfirmationEmail(email: string, orderData: any) {
  if (!process.env.SENDGRID_API_KEY) {
    console.log('SendGrid not configured, skipping email');
    return;
  }

  try {
    // Check if template is configured
    const useTemplate = !!process.env.SENDGRID_ORDER_TEMPLATE_ID;

    const emailPayload: any = {
      personalizations: [{
        to: [{ email }],
      }],
      from: {
        email: process.env.FROM_EMAIL || 'orders@pixello.ca',
        name: 'Pixello',
      },
    };

    if (useTemplate) {
      // Use template
      emailPayload.personalizations[0].dynamic_template_data = orderData;
      emailPayload.template_id = process.env.SENDGRID_ORDER_TEMPLATE_ID;
    } else {
      // Fallback to inline content if no template
      emailPayload.personalizations[0].subject = `Order Confirmation - ${orderData.orderNumber}`;
      emailPayload.content = [
        {
          type: 'text/html',
          value: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">Thank you for your order!</h1>
              <p>Order Number: <strong>${orderData.orderNumber}</strong></p>
              ${orderData.lookupCode ? `<p>Guest Lookup Code: <strong>${orderData.lookupCode}</strong></p>` : ''}
              <p>Total: <strong>$${orderData.totalAmount}</strong></p>
              <p>We'll send you another email when your order ships.</p>
            </div>
          `
        }
      ];
    }

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
      console.error('Email send failed:', error);
    } else {
      console.log('✅ Order confirmation email sent to:', email);
    }
  } catch (error) {
    console.error('Email error:', error);
    // Don't fail the order if email fails
  }
}