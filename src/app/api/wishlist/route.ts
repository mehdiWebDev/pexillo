// src/app/api/wishlist/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );

  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch wishlist items with full product details
    const { data: wishlistItems, error: wishlistError } = await supabase
      .from('wishlist')
      .select(`
        id,
        created_at,
        product_id,
        products!inner (
          id,
          name,
          slug,
          short_description,
          base_price,
          badge,
          primary_image_url,
          is_active,
          translations,
          product_variants!inner (
            id,
            size,
            color,
            color_hex,
            inventory_count,
            is_active,
            translations
          ),
          product_images (
            id,
            image_url,
            alt_text,
            is_primary,
            variant_id,
            view_type
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (wishlistError) {
      console.error('Error fetching wishlist:', wishlistError);
      return NextResponse.json(
        { error: 'Failed to fetch wishlist' },
        { status: 500 }
      );
    }

    // Transform the data to match the product listing format
    const products = wishlistItems?.map((item: any) => {
      const product = item.products;

      // Get unique colors
      const availableColors = product.product_variants
        ? Array.from(new Set(product.product_variants.map((v: any) => v.color))).length
        : 0;

      // Check if in stock
      const inStock = product.product_variants?.some((v: any) =>
        v.is_active && v.inventory_count > 0
      ) || false;

      // For now, set discount info to false/0 (can be enhanced later)
      const hasDiscount = false;
      const discountPercentage = 0;
      const discountedPrice = product.base_price;

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        short_description: product.short_description,
        base_price: product.base_price,
        badge: product.badge,
        primary_image_url: product.primary_image_url,
        in_stock: inStock,
        has_discount: hasDiscount,
        discount_percentage: discountPercentage,
        discounted_price: discountedPrice,
        available_colors: availableColors,
        variants: product.product_variants,
        images: product.product_images,
        translations: product.translations,
        wishlist_id: item.id,
        added_to_wishlist: item.created_at,
      };
    }) || [];

    return NextResponse.json({
      products,
      count: products.length,
    });
  } catch (error) {
    console.error('Error in wishlist API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
