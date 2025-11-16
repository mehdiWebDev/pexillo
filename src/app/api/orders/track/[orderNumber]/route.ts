// src/app/api/orders/track/[orderNumber]/route.ts
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;
    const searchParams = req.nextUrl.searchParams;
    const lookupCode = searchParams.get('lookupCode');

    if (!orderNumber) {
      return NextResponse.json(
        { error: 'Order number is required' },
        { status: 400 }
      );
    }

    // Get order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Security check
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check if user is admin
    let isAdmin = false;
    if (user) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      isAdmin = profile?.is_admin || false;
    }

    // Authorization logic
    if (order.user_id) {
      // Registered user order - must be logged in as that user or be admin
      if (!user || (user.id !== order.user_id && !isAdmin)) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    } else {
      // Guest order - must provide correct lookup code or be admin
      if (!isAdmin && (!lookupCode || lookupCode !== order.guest_lookup_code)) {
        return NextResponse.json(
          { error: 'Invalid lookup code' },
          { status: 401 }
        );
      }
    }

    // Check if order is cancelled
    if (order.status === 'cancelled') {
      return NextResponse.json({
        error: 'order_cancelled',
        message: 'This order has been cancelled'
      }, { status: 200 }); // Return 200 so UI can display the message
    }

    // Get order items
    const { data: orderItems, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .select(`
        id,
        quantity,
        unit_price,
        total_price,
        image_url,
        products (
          name
        ),
        product_variants (
          size,
          color
        )
      `)
      .eq('order_id', order.id);

    if (itemsError) {
      console.error('Error fetching order items:', itemsError);
    }

    // Format items
    const items = (orderItems || []).map((item: any) => ({
      product_name: item.products?.name || 'Unknown Product',
      variant_size: item.product_variants?.size || '',
      variant_color: item.product_variants?.color || '',
      quantity: item.quantity
    }));

    // Return tracking information
    return NextResponse.json({
      order: {
        id: order.id,
        order_number: order.order_number,
        created_at: order.created_at,
        status: order.status,
        payment_status: order.payment_status,
        total_amount: order.total_amount,
        currency: order.currency || 'CAD',
        shipping_address: order.shipping_address,
        shipping_carrier: order.shipping_carrier,
        tracking_number: order.tracking_number,
        estimated_delivery_date: order.estimated_delivery_date
      },
      items: (orderItems || []).map((item: any) => ({
        product_name: item.products?.name || 'Unknown Product',
        variant_size: item.product_variants?.size || '',
        variant_color: item.product_variants?.color || '',
        quantity: item.quantity,
        unit_price: item.unit_price || 0,
        total_price: item.total_price || 0,
        image_url: item.image_url || null
      }))
    });
  } catch (error: any) {
    console.error('Error in track order API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
