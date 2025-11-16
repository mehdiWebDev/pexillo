// src/app/api/admin/orders/[orderId]/route.ts
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
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

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

    // Get order details
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

    // Get customer information
    let customer = {
      name: '',
      email: '',
      phone: '',
      accountType: 'guest',
      lookupCode: order.guest_lookup_code
    };

    if (order.user_id) {
      const { data: userProfile } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name, phone')
        .eq('id', order.user_id)
        .single();

      if (userProfile) {
        // Parse JSONB for registered users too (for phone)
        const shippingAddress = typeof order.shipping_address === 'string'
          ? JSON.parse(order.shipping_address)
          : order.shipping_address;

        customer = {
          name: userProfile.full_name || '',
          email: userProfile.email || '',
          phone: userProfile.phone || shippingAddress?.phone || '',
          accountType: 'registered',
          lookupCode: null
        };
      }
    } else {
      // Guest order - Parse JSONB address
      const shippingAddress = typeof order.shipping_address === 'string'
        ? JSON.parse(order.shipping_address)
        : order.shipping_address;

      customer = {
        name: `${shippingAddress?.firstName || ''} ${shippingAddress?.lastName || ''}`.trim() || order.guest_email?.split('@')[0] || 'Guest',
        email: order.guest_email || '',
        phone: shippingAddress?.phone || '',
        accountType: 'guest',
        lookupCode: order.guest_lookup_code
      };
    }

    // Get order items with product and variant details
    const { data: orderItems, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .select(`
        id,
        quantity,
        unit_price,
        total_price,
        production_status,
        product_id,
        variant_id,
        products (
          id,
          name,
          slug
        ),
        product_variants (
          id,
          size,
          color,
          sku
        )
      `)
      .eq('order_id', orderId);

    if (itemsError) {
      console.error('Error fetching order items:', itemsError);
    }

    // Format items with image URLs
    const itemsWithImages = await Promise.all(
      (orderItems || []).map(async (item: any) => {
        // Get product images
        const { data: images } = await supabaseAdmin
          .from('product_images')
          .select('image_url, is_primary')
          .eq('product_id', item.product_id)
          .order('is_primary', { ascending: false })
          .limit(1);

        const imageUrl = images && images.length > 0 ? images[0].image_url : null;

        return {
          id: item.id,
          product_name: item.products?.name || 'Unknown Product',
          variant_size: item.product_variants?.size || '',
          variant_color: item.product_variants?.color || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          production_status: item.production_status || 'pending',
          image_url: imageUrl
        };
      })
    );

    // Get order notes
    const { data: notes, error: notesError } = await supabaseAdmin
      .from('order_notes')
      .select(`
        id,
        note,
        created_at,
        created_by,
        profiles (
          email,
          full_name
        )
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (notesError) {
      console.error('Error fetching order notes:', notesError);
    }

    // Format notes
    const formattedNotes = (notes || []).map((note: any) => ({
      id: note.id,
      note: note.note,
      created_at: note.created_at,
      created_by: note.profiles
        ? note.profiles.full_name || note.profiles.email
        : 'System'
    }));

    // Get order timeline/history from audit logs (if exists)
    // For now, we'll create a simple timeline from order data
    const timeline = [
      {
        event: 'Order Created',
        timestamp: order.created_at,
        by: 'System'
      }
    ];

    if (order.payment_status === 'completed' && order.updated_at !== order.created_at) {
      timeline.push({
        event: 'Payment Confirmed',
        timestamp: order.updated_at,
        by: 'Stripe'
      });
    }

    if (order.status !== 'pending') {
      timeline.push({
        event: `Status changed to ${order.status}`,
        timestamp: order.updated_at,
        by: 'Admin'
      });
    }

    if (order.tracking_number) {
      timeline.push({
        event: `Tracking added: ${order.tracking_number}`,
        timestamp: order.updated_at,
        by: 'Admin'
      });
    }

    // Return complete order data
    return NextResponse.json({
      order: {
        id: order.id,
        order_number: order.order_number,
        created_at: order.created_at,
        updated_at: order.updated_at,
        status: order.status,
        payment_status: order.payment_status,
        subtotal: order.subtotal,
        tax_amount: order.tax_amount,
        shipping_amount: order.shipping_amount,
        total_amount: order.total_amount,
        currency: order.currency || 'CAD',
        shipping_address: order.shipping_address,
        billing_address: order.billing_address,
        shipping_carrier: order.shipping_carrier,
        tracking_number: order.tracking_number,
        estimated_delivery_date: order.estimated_delivery_date,
        stripe_payment_intent_id: order.stripe_payment_intent_id
      },
      customer,
      items: itemsWithImages,
      notes: formattedNotes,
      timeline
    });
  } catch (error: any) {
    console.error('Error in admin order detail API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const body = await req.json();

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

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Allow updating specific fields
    if (body.status !== undefined) updateData.status = body.status;
    if (body.payment_status !== undefined) updateData.payment_status = body.payment_status;
    if (body.shipping_carrier !== undefined) updateData.shipping_carrier = body.shipping_carrier;
    if (body.tracking_number !== undefined) updateData.tracking_number = body.tracking_number;
    if (body.estimated_delivery_date !== undefined) updateData.estimated_delivery_date = body.estimated_delivery_date;

    // Update order
    const { data: order, error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating order:', updateError);
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      order
    });
  } catch (error: any) {
    console.error('Error in admin order update API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
