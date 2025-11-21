// app/api/admin/inventory/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface InventoryTransaction {
  id: string;
  variant_id: string;
  order_id: string | null;
  transaction_type: string;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reason: string | null;
  created_at: string;
  created_by: string | null;
  product_variants?: {
    size: string;
    color: string;
    products?: {
      name: string;
    };
  };
  orders?: {
    order_number: string;
  } | null;
  profiles?: {
    full_name: string;
  } | null;
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

// GET - Fetch inventory transactions with filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const variantId = searchParams.get('variant_id');

    const offset = (page - 1) * limit;

    // Build query
    let query = supabaseAdmin
      .from('inventory_transactions')
      .select(`
        *,
        product_variants!inner(
          size,
          color,
          products!inner(
            name
          )
        ),
        orders(
          order_number
        ),
        profiles(
          full_name
        )
      `, { count: 'exact' });

    // Apply filters
    if (type && type !== 'all') {
      query = query.eq('transaction_type', type);
    }

    if (variantId) {
      query = query.eq('variant_id', variantId);
    }

    if (search) {
      query = query.ilike('product_variants.products.name', `%${search}%`);
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: transactions, error, count } = await query;

    if (error) {
      console.error('Failed to fetch transactions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      );
    }

    // Transform the data
    const transformedTransactions = transactions.map((t: InventoryTransaction) => ({
      id: t.id,
      variant_id: t.variant_id,
      order_id: t.order_id,
      transaction_type: t.transaction_type,
      quantity_change: t.quantity_change,
      quantity_before: t.quantity_before,
      quantity_after: t.quantity_after,
      reason: t.reason,
      created_at: t.created_at,
      created_by: t.created_by,
      product_name: t.product_variants?.products?.name || 'Unknown',
      variant_size: t.product_variants?.size || 'N/A',
      variant_color: t.product_variants?.color || 'N/A',
      order_number: t.orders?.order_number || null,
      admin_name: t.profiles?.full_name || null,
    }));

    return NextResponse.json({
      transactions: transformedTransactions,
      totalCount: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error('Error fetching inventory transactions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new inventory transaction (for manual adjustments)
export async function POST(req: NextRequest) {
  try {
    const {
      variant_id,
      transaction_type,
      quantity_change,
      reason,
      created_by
    } = await req.json();

    if (!variant_id || !transaction_type || quantity_change === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get current inventory
    const { data: variant, error: variantError } = await supabaseAdmin
      .from('product_variants')
      .select('inventory_count')
      .eq('id', variant_id)
      .single();

    if (variantError || !variant) {
      return NextResponse.json(
        { error: 'Variant not found' },
        { status: 404 }
      );
    }

    const quantity_before = variant.inventory_count;
    const quantity_after = quantity_before + quantity_change;

    // Validate quantity_after is not negative
    if (quantity_after < 0) {
      return NextResponse.json(
        { error: 'Resulting inventory cannot be negative' },
        { status: 400 }
      );
    }

    // Create transaction
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('inventory_transactions')
      .insert({
        variant_id,
        transaction_type,
        quantity_change,
        quantity_before,
        quantity_after,
        reason,
        created_by,
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Failed to create transaction:', transactionError);
      return NextResponse.json(
        { error: 'Failed to create transaction' },
        { status: 500 }
      );
    }

    // Update inventory count
    const { error: updateError } = await supabaseAdmin
      .from('product_variants')
      .update({ inventory_count: quantity_after })
      .eq('id', variant_id);

    if (updateError) {
      console.error('Failed to update inventory:', updateError);
      // Rollback transaction
      await supabaseAdmin
        .from('inventory_transactions')
        .delete()
        .eq('id', transaction.id);

      return NextResponse.json(
        { error: 'Failed to update inventory' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error('Error creating inventory transaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
