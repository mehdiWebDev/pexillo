// src/services/variant-images.ts
import { createClient } from '@/lib/supabase/client';

interface VariantImage {
  id: string;
  image_url: string;
  alt_text: string;
  is_primary: boolean;
  variant_id: string;
  view_type?: 'front' | 'back' | 'side' | 'detail';
}

/**
 * Get images for a specific variant
 */
export async function getVariantImages(variantId: string): Promise<VariantImage[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('product_images')
    .select('*')
    .eq('variant_id', variantId)
    .order('is_primary', { ascending: false })
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching variant images:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all images for a product grouped by variant
 */
export async function getProductImagesGroupedByVariant(productId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('product_images')
    .select(`
      *,
      product_variants!variant_id (
        id,
        color,
        size,
        color_hex
      )
    `)
    .eq('product_id', productId)
    .order('is_primary', { ascending: false })
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching product images:', error);
    return {};
  }

  // Group images by variant_id
  const grouped = (data || []).reduce((acc, img) => {
    const key = img.variant_id || 'general';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(img);
    return acc;
  }, {} as Record<string, typeof data>);

  return grouped;
}

/**
 * Preload images for better UX when switching variants
 */
export function preloadImages(imageUrls: string[]) {
  imageUrls.forEach(url => {
    const img = new Image();
    img.src = url;
  });
}

/**
 * Upload images for a variant
 */
export async function uploadVariantImages(
  productId: string,
  variantId: string,
  files: File[]
): Promise<{ success: boolean; urls: string[] }> {
  const supabase = createClient();
  const urls: string[] = [];

  try {
    for (const file of files) {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${productId}/${variantId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      urls.push(publicUrl);

      // Save to database
      const { error: dbError } = await supabase
        .from('product_images')
        .insert({
          product_id: productId,
          variant_id: variantId,
          image_url: publicUrl,
          alt_text: `${file.name} image`,
          is_primary: urls.length === 1, // First image is primary
          display_order: urls.length
        });

      if (dbError) throw dbError;
    }

    return { success: true, urls };
  } catch (error) {
    console.error('Error uploading variant images:', error);
    return { success: false, urls: [] };
  }
}