// Customer API route for validating discount codes
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { discountService } from '@/src/services/discountService';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { code, subtotal, items } = body;

    console.log('🔍 Discount validation request:', {
      code,
      userId: user?.id || 'GUEST',
      userEmail: user?.email || 'NO EMAIL',
      subtotal,
      itemsCount: items?.length
    });

    if (!code) {
      return NextResponse.json(
        { error: 'Discount code is required' },
        { status: 400 }
      );
    }

    // Transform items to match the expected format for discountService
    const cartItems = items?.map((item: {
      product_id?: string;
      productId?: string;
      variant_id?: string;
      variantId?: string;
      category_id?: string;
      categoryId?: string;
      quantity: number;
      unit_price?: number;
      price?: number;
    }) => ({
      productId: item.product_id || item.productId,
      variantId: item.variant_id || item.variantId,
      categoryId: item.category_id || item.categoryId,
      quantity: item.quantity,
      price: item.unit_price || item.price || 0,
      total: (item.unit_price || item.price || 0) * item.quantity,
    }));

    // Validate the discount code
    console.log('🚀 Calling validateDiscountCode with userId:', user?.id || 'NULL');
    const result = await discountService.validateDiscountCode(
      code,
      subtotal || 0,
      cartItems,
      user?.id
    );

    console.log('📊 Validation result:', {
      isValid: result.isValid,
      reason: result.reason,
      discountId: result.discountId
    });

    if (!result.isValid) {
      console.log('❌ Discount validation failed:', result.reason);
      return NextResponse.json(
        {
          isValid: false,
          message: result.reason,
        },
        { status: 200 } // Return 200 with validation result
      );
    }

    // Auto-apply functionality removed - handled separately
    const autoApplyDiscount = null;

    console.log('🎯 Discount validation result:', {
      discountId: result.discountId,
      discountType: result.discountType,
      amountOff: result.amountOff,
    });

    return NextResponse.json({
      isValid: true,
      discountId: result.discountId,
      discountType: result.discountType,
      discountValue: result.discountValue,
      maximumDiscount: result.maximumDiscount,
      amountOff: result.amountOff || 0,
      message: result.reason,
      display: discountService.formatDiscountDisplay(result),
      stackable: result.stackable || false,
      autoApplyDiscount,
    });
  } catch (error) {
    console.error('Error validating discount:', error);
    return NextResponse.json(
      { error: 'Failed to validate discount code' },
      { status: 500 }
    );
  }
}