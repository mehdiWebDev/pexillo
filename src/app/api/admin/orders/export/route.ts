// src/app/api/admin/orders/export/route.ts
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

export async function GET(req: NextRequest) {
  try {
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

    // Get query parameters for filtering
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status') || '';
    const paymentStatus = searchParams.get('payment_status') || '';
    const dateFrom = searchParams.get('date_from') || '';
    const dateTo = searchParams.get('date_to') || '';

    // Build query for orders
    let ordersQuery = supabaseAdmin
      .from('orders')
      .select(`
        id,
        order_number,
        created_at,
        status,
        payment_status,
        total_amount,
        user_id,
        guest_email,
        shipping_address,
        tracking_number
      `);

    // Apply filters
    if (status) {
      ordersQuery = ordersQuery.eq('status', status);
    }

    if (paymentStatus) {
      ordersQuery = ordersQuery.eq('payment_status', paymentStatus);
    }

    if (dateFrom) {
      ordersQuery = ordersQuery.gte('created_at', dateFrom);
    }

    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      ordersQuery = ordersQuery.lt('created_at', endDate.toISOString());
    }

    // Execute query
    const { data: orders, error: ordersError } = await ordersQuery
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    // Get customer details for each order
    const ordersWithDetails = await Promise.all(
      (orders || []).map(async (order: any) => {
        let customerName = '';
        let customerEmail = '';

        if (order.user_id) {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('email, first_name, last_name')
            .eq('id', order.user_id)
            .single();

          if (profile) {
            customerEmail = profile.email || '';
            customerName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
          }
        } else {
          customerEmail = order.guest_email || '';
          const shippingAddress = order.shipping_address || {};
          customerName = `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim();
        }

        return {
          orderNumber: order.order_number,
          date: new Date(order.created_at).toLocaleDateString('en-CA'),
          customerName: customerName || 'N/A',
          customerEmail: customerEmail,
          total: order.total_amount.toFixed(2),
          status: order.status,
          paymentStatus: order.payment_status,
          trackingNumber: order.tracking_number || ''
        };
      })
    );

    // Generate CSV
    const headers = [
      'Order Number',
      'Date',
      'Customer Name',
      'Customer Email',
      'Total',
      'Status',
      'Payment Status',
      'Tracking Number'
    ];

    const csvRows = [
      headers.join(','),
      ...ordersWithDetails.map(order =>
        [
          order.orderNumber,
          order.date,
          `"${order.customerName}"`,
          order.customerEmail,
          order.total,
          order.status,
          order.paymentStatus,
          order.trackingNumber
        ].join(',')
      )
    ];

    const csv = csvRows.join('\n');

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="orders-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error: any) {
    console.error('Error in export orders API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
