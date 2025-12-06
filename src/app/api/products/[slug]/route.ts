// src/app/api/products/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: 'Product slug is required' },
        { status: 400 }
      );
    }

    // Get product with all details
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select(`
        *,
        categories (
          id,
          name,
          slug,
          translations
        )
      `)
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Get product variants
    const { data: variants } = await supabaseAdmin
      .from('product_variants')
      .select('*')
      .eq('product_id', product.id)
      .eq('is_active', true)
      .order('size', { ascending: true });

    // Get product images
    const { data: images } = await supabaseAdmin
      .from('product_images')
      .select('*')
      .eq('product_id', product.id)
      .order('display_order', { ascending: true });

    // Get product-level discount (excluding variant-specific discounts)
    const { data: productDiscountData } = await supabaseAdmin
      .from('discount_codes')
      .select('*')
      .eq('is_active', true)
      .eq('show_on_products', true)
      .lte('valid_from', new Date().toISOString())
      .or(`valid_until.is.null,valid_until.gte.${new Date().toISOString()}`)
      .or(`applicable_to.eq.all,and(applicable_to.eq.product,applicable_ids.cs.{${product.id}}),and(applicable_to.eq.category,applicable_ids.cs.{${product.category_id}})`)
      .neq('applicable_to', 'variant') // Exclude variant-specific discounts
      .order('priority', { ascending: false })
      .order('discount_value', { ascending: false })
      .limit(1)
      .single();

    let productDiscount;
    if (productDiscountData) {
      const discountPercentage = productDiscountData.discount_type === 'percentage'
        ? productDiscountData.discount_value
        : Math.round((productDiscountData.discount_value / product.base_price) * 100);
      const discountedPrice = productDiscountData.discount_type === 'percentage'
        ? product.base_price * (1 - productDiscountData.discount_value / 100)
        : Math.max(product.base_price - productDiscountData.discount_value, 0);

      productDiscount = {
        has_discount: true,
        discount_percentage: discountPercentage,
        discounted_price: discountedPrice,
        discount_type: productDiscountData.discount_type,
        discount_value: productDiscountData.discount_value
      };
    } else {
      productDiscount = {
        has_discount: false,
        discount_percentage: 0,
        discounted_price: product.base_price,
        discount_type: null,
        discount_value: null
      };
    }

    // Get variant discounts
    const variantsWithDiscounts = await Promise.all(
      (variants || []).map(async (variant) => {
        const basePrice = product.base_price + (variant.price_adjustment || 0);

        // Call the discount function (only shows if show_on_products = true)
        const { data: discountData } = await supabaseAdmin.rpc('get_variant_discount', {
          p_variant_id: variant.id,
          p_product_id: product.id,
          p_category_id: product.category_id,
          p_variant_price: basePrice
        });

        const discount = discountData?.[0] || {
          has_discount: false,
          discount_percentage: 0,
          discounted_price: basePrice,
          discount_type: null,
          discount_value: null
        };

        return {
          ...variant,
          has_discount: discount.has_discount,
          discount_percentage: discount.discount_percentage,
          discounted_price: discount.discounted_price,
          final_price: basePrice
        };
      })
    );

    // Return product with all related data
    return NextResponse.json({
      product: {
        ...product,
        variants: variantsWithDiscounts || [],
        images: images || [],
        // Add product-level discount info
        has_discount: productDiscount.has_discount,
        discount_percentage: productDiscount.discount_percentage,
        discounted_price: productDiscount.discounted_price,
      }
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
