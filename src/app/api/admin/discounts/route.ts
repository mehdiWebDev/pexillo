// Admin API routes for discount management
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
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

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const filters = {
      isActive: searchParams.get('active') === 'true' ? true :
                searchParams.get('active') === 'false' ? false : undefined,
      category: searchParams.get('category') || undefined,
      campaign: searchParams.get('campaign') || undefined,
      search: searchParams.get('search') || undefined,
    };

    // Get discounts directly with server client
    let query = supabase
      .from('discount_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    if (filters.category) {
      query = query.eq('discount_category', filters.category);
    }

    if (filters.campaign) {
      query = query.eq('campaign_name', filters.campaign);
    }

    if (filters.search) {
      query = query.or(
        `code.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
      );
    }

    const { data: discounts, error } = await query;

    if (error) {
      console.error('Error fetching discounts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch discounts' },
        { status: 500 }
      );
    }

    return NextResponse.json({ discounts });
  } catch (error) {
    console.error('Error fetching discounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch discounts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();

    // Validate required fields
    if (!body.code || !body.discount_type || !body.discount_value) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if code is available
    const { data: existingCode } = await supabase
      .from('discount_codes')
      .select('id')
      .eq('code', body.code.toUpperCase())
      .single();

    if (existingCode) {
      return NextResponse.json(
        { error: 'Discount code already exists' },
        { status: 400 }
      );
    }

    // Prepare the insert data
    const insertData = { ...body };

    // Handle applicable_ids based on applicable_to
    if (insertData.applicable_to === 'all') {
      // If applicable_to is 'all', set applicable_ids to null
      insertData.applicable_ids = null;
    } else if (!insertData.applicable_ids || insertData.applicable_ids.length === 0) {
      // If no IDs provided for product/category, default to 'all'
      insertData.applicable_to = 'all';
      insertData.applicable_ids = null;
    }

    // Create discount directly with server client
    const { data: discount, error: createError } = await supabase
      .from('discount_codes')
      .insert({
        ...insertData,
        code: insertData.code?.toUpperCase() || '',
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating discount:', createError);
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ discount });
  } catch (error) {
    console.error('Error creating discount:', error);
    return NextResponse.json(
      { error: 'Failed to create discount' },
      { status: 500 }
    );
  }
}