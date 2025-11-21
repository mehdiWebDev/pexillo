// src/app/api/admin/orders/items/[itemId]/route.ts
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const { production_status } = await req.json();

    if (!production_status) {
      return NextResponse.json(
        { error: 'Production status is required' },
        { status: 400 }
      );
    }

    // Validate production status
    const validStatuses = ['pending', 'design_review', 'approved', 'printing', 'completed'];
    if (!validStatuses.includes(production_status)) {
      return NextResponse.json(
        { error: 'Invalid production status' },
        { status: 400 }
      );
    }

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

    // Update order item
    const { data: item, error: updateError } = await supabaseAdmin
      .from('order_items')
      .update({ production_status })
      .eq('id', itemId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating order item:', updateError);
      return NextResponse.json(
        { error: 'Failed to update item' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      item
    });
  } catch (error) {
    console.error('Error in update item status API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
