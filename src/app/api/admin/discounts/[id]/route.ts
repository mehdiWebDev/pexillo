// Admin API routes for individual discount management
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { data: discount, error: fetchError } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !discount) {
      return NextResponse.json(
        { error: 'Discount not found' },
        { status: 404 }
      );
    }

    // Get statistics for this discount
    const { data: statistics } = await supabase
      .rpc('get_discount_statistics', { p_discount_id: id })
      .single();

    return NextResponse.json({ discount, statistics });
  } catch (error) {
    console.error('Error fetching discount:', error);
    return NextResponse.json(
      { error: 'Failed to fetch discount' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error in PUT /api/admin/discounts/[id]:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - Please login again' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // If updating code, check availability
    if (body.code) {
      const { data: existingCode } = await supabase
        .from('discount_codes')
        .select('id')
        .eq('code', body.code.toUpperCase())
        .neq('id', id)
        .single();

      if (existingCode) {
        return NextResponse.json(
          { error: 'Discount code already exists' },
          { status: 400 }
        );
      }
    }

    // Prepare the update data
    const updateData = { ...body };

    // Handle applicable_ids based on applicable_to
    if (updateData.applicable_to === 'all') {
      // If applicable_to is 'all', set applicable_ids to null
      updateData.applicable_ids = null;
    } else if (!updateData.applicable_ids || updateData.applicable_ids.length === 0) {
      // If no IDs provided for product/category, default to 'all'
      updateData.applicable_to = 'all';
      updateData.applicable_ids = null;
    }

    // Ensure code is uppercase
    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase();
    }

    const { data: discount, error: updateError } = await supabase
      .from('discount_codes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating discount:', updateError);
      return NextResponse.json(
        { error: 'Failed to update discount' },
        { status: 500 }
      );
    }

    return NextResponse.json({ discount });
  } catch (error) {
    console.error('Error updating discount:', error);
    return NextResponse.json(
      { error: 'Failed to update discount' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { error: deleteError } = await supabase
      .from('discount_codes')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting discount:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete discount' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting discount:', error);
    return NextResponse.json(
      { error: 'Failed to delete discount' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get current status
    const { data: currentDiscount } = await supabase
      .from('discount_codes')
      .select('is_active')
      .eq('id', id)
      .single();

    if (!currentDiscount) {
      return NextResponse.json(
        { error: 'Discount not found' },
        { status: 404 }
      );
    }

    // Toggle active status
    const { data: discount, error: toggleError } = await supabase
      .from('discount_codes')
      .update({ is_active: !currentDiscount.is_active })
      .eq('id', id)
      .select()
      .single();

    if (toggleError) {
      console.error('Error toggling discount status:', toggleError);
      return NextResponse.json(
        { error: 'Failed to toggle discount status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ discount });
  } catch (error) {
    console.error('Error toggling discount status:', error);
    return NextResponse.json(
      { error: 'Failed to toggle discount status' },
      { status: 500 }
    );
  }
}