// app/api/orders/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

interface Address {
  firstName: string;
  lastName: string;
  address: string;
  apartment?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  email?: string;
  phone?: string;
}

interface CartItem {
  product_id: string;
  variant_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_name: string;
  variant_size: string;
  variant_color: string;
}

interface OrderInsertData {
  user_id: string | null;
  guest_email: string | null;
  guest_lookup_code: string | null;
  order_number: string;
  status: string;
  payment_status: string;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  total_amount: number;
  shipping_address: Address;
  billing_address?: Address;
  currency: string;
  stripe_payment_intent_id?: string;
  payment_method?: string;
  discount_code_id?: string;
  discount_amount?: number;
  notes?: string;
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
    const {
      user_id, // User ID if account was created during checkout
      email,
      phone,
      shipping_address,
      billing_address,
      items,
      subtotal,
      tax_amount,
      shipping_amount,
      total_amount,
      currency,
      // Discount details
      discount_code_id,
      discount_amount,
      discount_codes, // Array of discount codes with details
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
      discount_code_id,
      discount_amount,
    });

    // ✅ VALIDATE: Ensure all items have variant_id
    const itemsWithoutVariant = items.filter((item: CartItem) => !item.variant_id || !item.product_id);
    if (itemsWithoutVariant.length > 0) {
      console.error('❌ Invalid cart data - items missing variant_id or product_id:', itemsWithoutVariant);
      return NextResponse.json(
        {
          error: 'Invalid cart data',
          message: 'Some items in your cart are missing required information. Please clear your cart and try again.',
          details: itemsWithoutVariant.map((item: CartItem) => ({
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
      items.map(async (item: CartItem) => {
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

        // Safely extract product name regardless of relation typing (array vs object)
        const productName = (() => {
          const rel = (variant as unknown as { products?: { name?: string } | { name?: string }[] }).products;
          return Array.isArray(rel) ? rel[0]?.name : rel?.name;
        })();

        if (variant.inventory_count < item.quantity) {
          return {
            valid: false,
            variantId: item.variant_id,
            productName,
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

    // Determine userId: use provided user_id (from checkout account creation),
    // or fall back to authenticated user
    let userId = user_id || null;

    // If no user_id provided, check if user is authenticated
    if (!userId) {
      const supabase = await createServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    console.log('🔍 User authentication check:', {
      isAuthenticated: !!userId,
      userId: userId || 'guest',
      source: user_id ? 'checkout_created' : 'authenticated'
    });

    // Note: Account creation now happens earlier in checkout flow (before payment)
    // The user_id is passed from the checkout flow if an account was created

    // Generate order details
    const orderNumber = generateOrderNumber();
    const lookupCode = userId ? null : generateLookupCode();

    // Create order using admin client (bypasses RLS)
    const orderInsertData: OrderInsertData = {
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

    // Add discount information if provided
    if (discount_codes && discount_codes.length > 0) {
      // Store all discount codes in metadata/notes
      interface DiscountCode {
        id: string;
        code: string;
        amount: number;
      }
      const discountNotes = discount_codes.map((d: DiscountCode) => `${d.code}: -$${d.amount}`).join(', ');
      orderInsertData.notes = `Applied discounts: ${discountNotes}`;

      // For backward compatibility, use the first discount code for the main discount fields
      orderInsertData.discount_code_id = discount_codes[0].id;
      orderInsertData.discount_amount = discount_amount || discount_codes.reduce((sum: number, d: DiscountCode) => sum + d.amount, 0);

      console.log('📊 Adding multiple discounts to order:', {
        discount_codes,
        total_discount_amount: orderInsertData.discount_amount
      });
    } else if (discount_code_id) {
      // Fallback to single discount for backward compatibility
      console.log('📊 Adding single discount to order:', {
        discount_code_id,
        discount_amount: discount_amount || 0
      });
      orderInsertData.discount_code_id = discount_code_id;
      orderInsertData.discount_amount = discount_amount || 0;
    } else {
      console.log('⚠️ No discount_code_id provided');
    }

    // Add payment details if payment was confirmed before order creation
    if (stripe_payment_intent_id) {
      orderInsertData.stripe_payment_intent_id = stripe_payment_intent_id;
      console.log('✅ Order created with confirmed payment:', stripe_payment_intent_id);
    }

    if (payment_method) {
      orderInsertData.payment_method = payment_method;
    }

    console.log('📝 Order insert data:', {
      order_number: orderInsertData.order_number,
      discount_code_id: orderInsertData.discount_code_id,
      discount_amount: orderInsertData.discount_amount,
    });

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

    console.log('✅ Order created with:', {
      id: order.id,
      discount_code_id: order.discount_code_id,
      discount_amount: order.discount_amount,
    });

    // Create order items using admin client
    const orderItems = items.map((item: CartItem) => ({
      order_id: order.id,
      product_id: item.product_id,
      variant_id: item.variant_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      // Store product details at time of purchase
      product_name: item.product_name,
      variant_size: item.variant_size,
      variant_color: item.variant_color,
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

    // ✅ Discount code usage is tracked automatically by the database trigger
    // The track_discount_on_order trigger will increment times_used when discount_code_id is set
    if (discount_code_id) {
      console.log('✅ Discount code applied to order (usage will be tracked by database trigger)');
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
  } catch (error) {
    console.error('Order creation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create order';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}