// src/app/api/admin/customers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

interface CustomerRevenueData {
  total_spent: number;
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
    const dateFrom = searchParams.get('date_from') || '';
    const dateTo = searchParams.get('date_to') || '';
    const isAdmin = searchParams.get('is_admin') || '';

    const offset = (page - 1) * limit;

    // Build query for customers
    let customersQuery = supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact' });

    // Apply filters
    if (search) {
      // Search in name, email, or phone
      customersQuery = customersQuery.or(
        `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }

    if (isAdmin === 'true') {
      customersQuery = customersQuery.eq('is_admin', true);
    } else if (isAdmin === 'false') {
      customersQuery = customersQuery.eq('is_admin', false);
    }

    if (dateFrom) {
      customersQuery = customersQuery.gte('created_at', dateFrom);
    }

    if (dateTo) {
      // Add one day to include the end date
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      customersQuery = customersQuery.lt('created_at', endDate.toISOString());
    }

    // Execute query with pagination
    const { data: customers, error: customersError, count } = await customersQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (customersError) {
      console.error('Error fetching customers:', customersError);
      return NextResponse.json(
        { error: 'Failed to fetch customers' },
        { status: 500 }
      );
    }

    // Get stats
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const statsPromises = [
      // Total customers
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      // New customers this month
      supabaseAdmin.from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDayOfMonth),
      // Customers with orders
      supabaseAdmin.from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('total_orders', 0),
      // Total revenue
      supabaseAdmin.from('profiles')
        .select('total_spent')
    ];

    const [
      { count: totalCustomers },
      { count: newCustomersThisMonth },
      { count: activeCustomers },
      { data: revenueData }
    ] = await Promise.all(statsPromises);

    const totalRevenue = (revenueData || []).reduce((sum: number, customer: CustomerRevenueData) =>
      sum + (parseFloat(String(customer.total_spent)) || 0), 0
    );

    return NextResponse.json({
      customers: customers || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      },
      stats: {
        totalCustomers: totalCustomers || 0,
        newCustomersThisMonth: newCustomersThisMonth || 0,
        activeCustomers: activeCustomers || 0,
        totalRevenue: totalRevenue
      }
    });
  } catch (error) {
    console.error('Error in admin customers API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
