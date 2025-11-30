import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface ProductRecord {
  id: string;
  name: string;
  sku: string | null;
  category_id: string | null;
  categories?: unknown;
}

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

    // Fetch all products with their categories
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        sku,
        category_id,
        categories (
          id,
          name
        )
      `)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;

    // Format the response - handle both array and object cases
    const formattedProducts = products?.map((product) => {
      const typedProduct = product as ProductRecord;
      const categoryData = typedProduct.categories;
      let categoryName = null;

      if (categoryData) {
        // Handle if categories is an array
        if (Array.isArray(categoryData) && categoryData.length > 0) {
          categoryName = (categoryData[0] as {name: string}).name;
        } else if (typeof categoryData === 'object' && categoryData !== null && 'name' in categoryData) {
          // Handle if categories is a single object
          categoryName = (categoryData as {name: string}).name;
        }
      }

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        category_id: product.category_id,
        category_name: categoryName
      };
    }) || [];

    return NextResponse.json(formattedProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}