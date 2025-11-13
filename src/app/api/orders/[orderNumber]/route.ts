// app/api/orders/[orderNumber]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;
    
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
    
    if (error || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    
    // Format response
    const formattedOrder = {
      order_number: order.order_number,
      guest_lookup_code: order.guest_lookup_code,
      email: order.guest_email || order.shipping_address?.email,
      total: order.total_amount,
      items: order.order_items?.map((item: any) => ({
        name: item.products?.name,
        quantity: item.quantity,
        size: item.product_variants?.size,
        color: item.product_variants?.color,
        price: item.unit_price,
        total: item.total_price
      })) || [],
      estimated_delivery: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    };
    
    return NextResponse.json(formattedOrder);
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}