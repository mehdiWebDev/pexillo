// src/app/api/admin/orders/route.ts
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

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const paymentStatus = searchParams.get('payment_status') || '';
    const dateFrom = searchParams.get('date_from') || '';
    const dateTo = searchParams.get('date_to') || '';

    const offset = (page - 1) * limit;

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
      `, { count: 'exact' });

    // Apply filters
    if (search) {
      // Search in order number, email, or name
      ordersQuery = ordersQuery.or(
        `order_number.ilike.%${search}%,guest_email.ilike.%${search}%,shipping_address->>firstName.ilike.%${search}%,shipping_address->>lastName.ilike.%${search}%`
      );
    }

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
      // Add one day to include the end date
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      ordersQuery = ordersQuery.lt('created_at', endDate.toISOString());
    }

    // Execute query with pagination
    const { data: orders, error: ordersError, count } = await ordersQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    // Get order items count for each order
    const ordersWithDetails = await Promise.all(
      (orders || []).map(async (order: any) => {
        // Get items count
        const { count: itemsCount } = await supabaseAdmin
          .from('order_items')
          .select('*', { count: 'exact', head: true })
          .eq('order_id', order.id);

        // Get customer name and email
        let customerName = '';
        let customerEmail = '';

        if (order.user_id) {
          // Registered user
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
          // Guest order
          customerEmail = order.guest_email || '';
          const shippingAddress = order.shipping_address || {};
          customerName = `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim();
        }

        return {
          id: order.id,
          order_number: order.order_number,
          created_at: order.created_at,
          customer_name: customerName || 'N/A',
          customer_email: customerEmail,
          total_amount: order.total_amount,
          status: order.status,
          payment_status: order.payment_status,
          items_count: itemsCount || 0,
          tracking_number: order.tracking_number
        };
      })
    );

    // Get stats
    const statsPromises = [
      // Total orders
      supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }),
      // Pending orders
      supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      // Processing orders
      supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'processing'),
      // Shipped orders
      supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'shipped'),
      // Total revenue this month
      supabaseAdmin.from('orders')
        .select('total_amount')
        .eq('payment_status', 'completed')
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
    ];

    const [
      { count: totalOrders },
      { count: pendingOrders },
      { count: processingOrders },
      { count: shippedOrders },
      { data: revenueData }
    ] = await Promise.all(statsPromises);

    const totalRevenue = (revenueData || []).reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0);

    return NextResponse.json({
      orders: ordersWithDetails,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      },
      stats: {
        totalOrders: totalOrders || 0,
        pendingOrders: pendingOrders || 0,
        processingOrders: processingOrders || 0,
        shippedOrders: shippedOrders || 0,
        totalRevenue: totalRevenue
      }
    });
  } catch (error: any) {
    console.error('Error in admin orders API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
