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

    // Get variant discounts
    const variantsWithDiscounts = await Promise.all(
      (variants || []).map(async (variant) => {
        const basePrice = product.base_price + (variant.price_adjustment || 0);

        // Call the discount function
        const { data: discountData } = await supabaseAdmin.rpc('get_variant_discount', {
          p_variant_id: variant.id,
          p_product_id: product.id,
          p_category_id: product.category_id,
          p_base_price: basePrice
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
