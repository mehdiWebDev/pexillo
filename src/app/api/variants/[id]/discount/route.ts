// API route to get discount information for a specific variant
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: variantId } = await params;
    const supabase = await createClient();

    // Get variant with product and category info
    const { data: variant, error: variantError } = await supabase
      .from('product_variants')
      .select(`
        id,
        price_adjustment,
        product_id,
        products (
          id,
          base_price,
          category_id
        )
      `)
      .eq('id', variantId)
      .single();

    if (variantError || !variant) {
      return NextResponse.json(
        { error: 'Variant not found' },
        { status: 404 }
      );
    }

    const product = variant.products as { base_price?: number; category_id?: string };
    const basePrice = (product?.base_price || 0) + (variant.price_adjustment || 0);
    const productId = variant.product_id;
    const categoryId = product?.category_id;

    // Find the best active discount
    const query = supabase
      .from('discount_codes')
      .select('*')
      .eq('is_active', true)
      .lte('valid_from', new Date().toISOString())
      .or(`valid_until.is.null,valid_until.gt.${new Date().toISOString()}`)
      .or(`usage_limit.is.null,usage_count.lt.usage_limit`);

    const { data: allDiscounts, error: discountError } = await query;

    if (discountError) {
      console.error('Error fetching discounts:', discountError);
      return NextResponse.json({
        has_discount: false,
        discount_percentage: 0,
        discounted_price: basePrice,
      });
    }

    // Filter and prioritize discounts
    const applicableDiscounts = (allDiscounts || []).filter((discount) => {
      if (discount.applicable_to === 'variant' && discount.applicable_ids) {
        return discount.applicable_ids.includes(variantId);
      }
      if (discount.applicable_to === 'product' && discount.applicable_ids) {
        return discount.applicable_ids.includes(productId);
      }
      if (discount.applicable_to === 'category' && discount.applicable_ids && categoryId) {
        return discount.applicable_ids.includes(categoryId);
      }
      if (discount.applicable_to === 'all') {
        return true;
      }
      return false;
    });

    if (applicableDiscounts.length === 0) {
      return NextResponse.json({
        has_discount: false,
        discount_percentage: 0,
        discounted_price: basePrice,
      });
    }

    // Sort by priority: variant > product > category > all, then by discount value
    const sortedDiscounts = applicableDiscounts.sort((a, b) => {
      const priorityOrder = { variant: 1, product: 2, category: 3, all: 4 };
      const aPriority = priorityOrder[a.applicable_to as keyof typeof priorityOrder] || 99;
      const bPriority = priorityOrder[b.applicable_to as keyof typeof priorityOrder] || 99;

      if (aPriority !== bPriority) return aPriority - bPriority;
      return (b.priority || 0) - (a.priority || 0);
    });

    const bestDiscount = sortedDiscounts[0];

    // Calculate discount amount
    let amountOff = 0;
    let finalPrice = basePrice;

    if (bestDiscount.discount_type === 'percentage') {
      amountOff = basePrice * (bestDiscount.discount_value / 100);
      if (bestDiscount.maximum_discount && amountOff > bestDiscount.maximum_discount) {
        amountOff = bestDiscount.maximum_discount;
      }
      finalPrice = basePrice - amountOff;
    } else if (bestDiscount.discount_type === 'fixed_amount') {
      amountOff = bestDiscount.discount_value;
      if (amountOff > basePrice) amountOff = basePrice;
      finalPrice = basePrice - amountOff;
    }

    const discountPercentage = basePrice > 0 ? Math.round((amountOff / basePrice) * 100) : 0;

    return NextResponse.json({
      has_discount: true,
      discount_percentage: discountPercentage,
      discounted_price: Math.round(finalPrice * 100) / 100,
      discount_type: bestDiscount.discount_type,
      discount_value: bestDiscount.discount_value,
      discount_code: bestDiscount.code,
    });
  } catch (error) {
    console.error('Error getting variant discount:', error);
    return NextResponse.json(
      { error: 'Failed to get variant discount' },
      { status: 500 }
    );
  }
}
