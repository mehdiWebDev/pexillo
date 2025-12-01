// API route for checking first-order discount eligibility
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Only check for authenticated users
    if (!user) {
      return NextResponse.json({
        hasFirstOrderDiscount: false,
        message: 'User not authenticated'
      });
    }

    // Check if it's user's first order
    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .eq('user_id', user.id)
      .eq('payment_status', 'completed')
      .limit(1);

    const isFirstOrder = !orders || orders.length === 0;

    if (!isFirstOrder) {
      return NextResponse.json({
        hasFirstOrderDiscount: false,
        message: 'User has already placed orders'
      });
    }

    // Get the WELCOME30 discount details
    const { data: discount } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('code', 'WELCOME30')
      .eq('is_active', true)
      .eq('first_purchase_only', true)
      .single();

    if (!discount) {
      return NextResponse.json({
        hasFirstOrderDiscount: false,
        message: 'First-order discount not available'
      });
    }

    // Calculate discount amount based on cart total if provided
    const searchParams = request.nextUrl.searchParams;
    const cartTotal = parseFloat(searchParams.get('total') || '0');
    const amountOff = discount.discount_type === 'percentage'
      ? (cartTotal * discount.discount_value / 100)
      : discount.discount_value;

    return NextResponse.json({
      hasFirstOrderDiscount: true,
      discount: {
        discountId: discount.id,
        code: discount.code,
        discountType: discount.discount_type,
        discountValue: discount.discount_value,
        amountOff: amountOff,
        display: `${discount.discount_value}% off - Welcome discount!`,
        stackable: discount.stackable || false,
        isFirstOrder: true
      }
    });

  } catch (error) {
    console.error('Error checking first-order discount:', error);
    return NextResponse.json(
      { error: 'Failed to check first-order discount' },
      { status: 500 }
    );
  }
}