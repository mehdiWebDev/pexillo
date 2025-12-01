// API route for getting auto-apply discounts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    // User and items might be needed for future enhancements
    // const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { subtotal } = body;
    // Items might be needed for product-specific auto-apply
    // const { items } = body;

    // Directly query for auto-apply discounts
    const { data: autoApplyDiscounts, error } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('auto_apply', true)
      .eq('is_active', true)
      .or(`valid_from.is.null,valid_from.lte.${new Date().toISOString()}`)
      .or(`valid_until.is.null,valid_until.gte.${new Date().toISOString()}`)
      .or(`minimum_purchase.is.null,minimum_purchase.lte.${subtotal}`)
      .order('priority', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching auto-apply discounts:', error);
      return NextResponse.json({ hasAutoApply: false, discount: null });
    }

    console.log('🤖 Auto-apply discounts found:', autoApplyDiscounts);

    const autoApplyDiscount = autoApplyDiscounts?.[0] || null;

    if (autoApplyDiscount) {
      // Use the discount returned
      const bestDiscount = autoApplyDiscount;

      // Calculate the actual discount amount
      const amountOff = bestDiscount.discount_type === 'percentage'
        ? (subtotal * bestDiscount.discount_value / 100)
        : bestDiscount.discount_value;

      const display = bestDiscount.discount_type === 'percentage'
        ? `${bestDiscount.discount_value}% off`
        : `$${bestDiscount.discount_value} off`;

      console.log('💰 Calculated auto-apply discount:', {
        code: bestDiscount.code,
        amountOff,
        display
      });

      console.log('✅ Returning auto-apply discount:', {
        code: bestDiscount.code,
        amountOff,
        display
      });

      return NextResponse.json({
        hasAutoApply: true,
        discount: {
          discountId: bestDiscount.id,
          code: bestDiscount.code,
          discountType: bestDiscount.discount_type,
          discountValue: bestDiscount.discount_value,
          amountOff: amountOff,
          display: display,
          stackable: bestDiscount.stackable || false,
          isAutoApply: true,
        }
      });
    }

    console.log('❌ No auto-apply discount found');
    return NextResponse.json({
      hasAutoApply: false,
      discount: null
    });

  } catch (error) {
    console.error('Error getting auto-apply discounts:', error);
    return NextResponse.json(
      { error: 'Failed to get auto-apply discounts' },
      { status: 500 }
    );
  }
}