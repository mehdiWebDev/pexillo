// app/api/orders/[orderNumber]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface OrderItemData {
  quantity: number;
  unit_price: number;
  total_price: number;
  products?: {
    name: string;
    slug: string;
    primary_image_url: string | null;
  } | null;
  product_variants?: {
    size: string;
    color: string;
    color_hex: string | null;
  } | null;
}

// Check for service role key
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;

console.log('🔑 Service Role Key exists:', !!serviceRoleKey);
console.log('🔑 Anon Key exists:', !!anonKey);
console.log('🔑 Using key type:', serviceRoleKey ? 'SERVICE_ROLE' : 'ANON');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  serviceRoleKey || anonKey!
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  console.log('========== ORDER FETCH START ==========');

  try {
    const { orderNumber } = await params;
    console.log('📦 Looking for order:', orderNumber);
    console.log('🔐 Auth type:', serviceRoleKey ? 'SERVICE_ROLE (bypasses RLS)' : 'ANON (subject to RLS)');

    // Fetch order details
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            name,
            slug,
            primary_image_url
          ),
          product_variants (
            size,
            color,
            color_hex
          )
        )
      `)
      .eq('order_number', orderNumber)
      .single();

    // Debug the query result
    if (error) {
      console.error('❌ Supabase error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
    }

    console.log('✅ Order found:', !!order);
    if (order) {
      console.log('Order ID:', order.id);
      console.log('Order user_id:', order.user_id);
      console.log('Guest order:', !order.user_id);
      console.log('Guest email:', order.guest_email);
      console.log('Guest lookup code:', order.guest_lookup_code);
      console.log('Order status:', order.status);
      console.log('Payment status:', order.payment_status);
    }

    if (error || !order) {
      console.log('🚫 Returning 404 - Order not found');
      return NextResponse.json(
        { error: 'Order not found', details: error?.message },
        { status: 404 }
      );
    }

    // Format response
    const formattedOrder = {
      order_number: order.order_number,
      guest_lookup_code: order.guest_lookup_code,
      email: order.guest_email || order.shipping_address?.email,
      total: order.total_amount,
      items: order.order_items?.map((item: OrderItemData) => ({
        name: item.products?.name,
        quantity: item.quantity,
        size: item.product_variants?.size,
        color: item.product_variants?.color,
        price: item.unit_price,
        total: item.total_price
      })) || [],
      estimated_delivery: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    };

    console.log('✅ Returning formatted order');
    console.log('========== ORDER FETCH END ==========');
    return NextResponse.json(formattedOrder);

  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}
// ```

// ## **What to Look For in the Logs:**

// 1. **Key Type** - Is it using SERVICE_ROLE or ANON?
// 2. **Supabase Error** - What specific error is returned?
// 3. **Order Details** - If found, is it a guest order?

// ## **Common Issues You'll See:**

// ### **If using ANON key:**
// ```
// Error code: PGRST116
// Error message: JWT expired
//   ```
// or
// ```
// Error message: Row level security violation
//   ```

// ### **If order doesn't exist:**
// ```
// Error code: PGRST116  
// Error message: JSON object requested, multiple(or no) rows returned