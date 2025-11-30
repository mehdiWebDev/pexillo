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
    const result = await discountService.validateDiscountCode(
      code,
      subtotal || 0,
      cartItems,
      user?.id
    );

    if (!result.isValid) {
      return NextResponse.json(
        {
          isValid: false,
          message: result.reason,
        },
        { status: 200 } // Return 200 with validation result
      );
    }

    // Get auto-apply discounts if no code was applied
    let autoApplyDiscount = null;
    if (!result.discountId) {
      autoApplyDiscount = await discountService.getAutoApplyDiscounts(
        user?.id || null,
        subtotal || 0,
        cartItems
      );
    }

    return NextResponse.json({
      isValid: true,
      discountId: result.discountId,
      discountType: result.discountType,
      discountValue: result.discountValue,
      maximumDiscount: result.maximumDiscount,
      amountOff: result.amountOff || 0,
      message: result.reason,
      display: discountService.formatDiscountDisplay(result),
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