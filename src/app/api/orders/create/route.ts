// app/api/orders/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
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
      // Payment details (if payment confirmed before order creation)
      stripe_payment_intent_id,
      payment_method,
      payment_status,
      status,
    } = await req.json();

    console.log('Received order request:', {
      email,
      phone,
      hasPayment: !!stripe_payment_intent_id,
      payment_status,
      status,
      total_amount,
      itemsCount: items.length,
    });

    // ✅ VALIDATE: Ensure all items have variant_id
    const itemsWithoutVariant = items.filter((item: any) => !item.variant_id || !item.product_id);
    if (itemsWithoutVariant.length > 0) {
      console.error('❌ Invalid cart data - items missing variant_id or product_id:', itemsWithoutVariant);
      return NextResponse.json(
        {
          error: 'Invalid cart data',
          message: 'Some items in your cart are missing required information. Please clear your cart and try again.',
          details: itemsWithoutVariant.map((item: any) => ({
            product_id: item.product_id || 'missing',
            variant_id: item.variant_id || 'missing',
            product_name: item.product_name || 'unknown',
          }))
        },
        { status: 400 }
      );
    }

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

    // Check if user is logged in using server-side client
    let userId = null;
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;

    console.log('🔍 User authentication check:', {
      isAuthenticated: !!userId,
      userId: userId || 'guest'
    });

    // ✅ Create account if requested (guest checkout)
    if (create_account && !userId && password) {
      console.log('🔐 Creating new account for:', email);

      // Check if email already exists
      const { data: existingUser, error: checkError } = await supabaseAdmin.auth.admin.listUsers();

      const emailExists = existingUser?.users?.some(user => user.email?.toLowerCase() === email.toLowerCase());

      if (emailExists) {
        console.error('❌ Email already exists:', email);
        return NextResponse.json(
          {
            error: 'Email already in use',
            message: 'An account with this email already exists. Please sign in or use a different email address.',
          },
          { status: 409 } // 409 Conflict
        );
      }

      // Validate password
      if (!password || password.length < 8) {
        return NextResponse.json(
          {
            error: 'Invalid password',
            message: 'Password must be at least 8 characters long.',
          },
          { status: 400 }
        );
      }

      // Create user account
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
      });

      if (authError) {
        console.error('❌ Failed to create user account:', authError);
        return NextResponse.json(
          {
            error: 'Account creation failed',
            message: authError.message || 'Failed to create account. Please try again.',
          },
          { status: 500 }
        );
      }

      if (authData?.user) {
        userId = authData.user.id;
        console.log('✅ User account created:', userId);

        // Create profile using admin client
        const { error: profileError } = await supabaseAdmin.from('profiles').insert({
          id: userId,
          email,
          full_name: `${shipping_address.firstName} ${shipping_address.lastName}`.trim(),
          phone,
        });

        if (profileError) {
          console.error('❌ Failed to create profile:', profileError);
          // Delete the auth user if profile creation fails
          await supabaseAdmin.auth.admin.deleteUser(userId);
          return NextResponse.json(
            {
              error: 'Profile creation failed',
              message: 'Failed to create user profile. Please try again.',
            },
            { status: 500 }
          );
        }

        console.log('✅ User profile created successfully');
      }
    }

    // Generate order details
    const orderNumber = generateOrderNumber();
    const lookupCode = userId ? null : generateLookupCode();

    // Create order using admin client (bypasses RLS)
    const orderInsertData: any = {
      user_id: userId,
      guest_email: userId ? null : email,
      guest_lookup_code: lookupCode,
      order_number: orderNumber,
      status: status || 'pending', // Use provided status or default to pending
      payment_status: payment_status || 'pending', // Use provided payment_status or default to pending
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
    };

    // Add payment details if payment was confirmed before order creation
    if (stripe_payment_intent_id) {
      orderInsertData.stripe_payment_intent_id = stripe_payment_intent_id;
      console.log('✅ Order created with confirmed payment:', stripe_payment_intent_id);
    }

    if (payment_method) {
      orderInsertData.payment_method = payment_method;
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert(orderInsertData)
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

    // ✅ IMPORTANT: Confirmation email is sent ONLY when payment is confirmed
    // This happens in /api/orders/update-status when paymentStatus === 'completed'
    // This prevents sending confirmation emails for failed/abandoned payments
    console.log('✅ Order created successfully, awaiting payment confirmation');

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