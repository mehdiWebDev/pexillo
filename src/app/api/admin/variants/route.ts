import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // First fetch variants with basic product info
    const { data: variants, error: variantsError } = await supabase
      .from('product_variants')
      .select(`
        *,
        products (
          id,
          name,
          base_price,
          category_id
        )
      `)
      .eq('is_active', true)
      .order('product_id', { ascending: true })
      .order('size', { ascending: true })
      .order('color', { ascending: true });

    if (variantsError) {
      console.error('Error fetching variants:', variantsError);
      return NextResponse.json(
        { error: 'Failed to fetch variants', details: variantsError.message },
        { status: 500 }
      );
    }

    // Then fetch categories separately if needed
    const categoryIds = [...new Set(variants?.map(v => v.products?.category_id).filter(Boolean))];
    const categoriesMap = new Map();

    if (categoryIds.length > 0) {
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
        .in('id', categoryIds);

      categories?.forEach(cat => {
        categoriesMap.set(cat.id, cat.name);
      });
    }

    // Format the response to make it easier to display
    const formattedVariants = variants?.map(variant => {
      const product = variant.products as { base_price?: number; category_id?: string; name?: string; slug?: string };
      const basePrice = typeof product?.base_price === 'number' ? product.base_price : 0;
      const adjustment = typeof variant.price_adjustment === 'number' ? variant.price_adjustment : 0;
      const categoryName = product?.category_id ? categoriesMap.get(product.category_id) : null;

      return {
        id: variant.id,
        sku: variant.sku || '',
        size: variant.size,
        color: variant.color,
        color_hex: variant.color_hex || '#000000',
        price: basePrice + adjustment, // Calculate actual price
        stock_quantity: variant.inventory_count || 0,
        product_id: variant.product_id,
        product_name: product?.name || 'Unknown Product',
        category_id: product?.category_id || null,
        category_name: categoryName,
        display_name: `${product?.name || 'Unknown'} - ${variant.size} / ${variant.color}`
      };
    }) || [];

    return NextResponse.json(formattedVariants);
  } catch (error) {
    console.error('Error fetching variants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch variants' },
      { status: 500 }
    );
  }
}