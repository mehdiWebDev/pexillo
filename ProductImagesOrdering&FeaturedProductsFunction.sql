-- Drop existing function
DROP FUNCTION IF EXISTS get_featured_products(integer, integer);

-- Create function that perfectly matches your schema
CREATE OR REPLACE FUNCTION get_featured_products(
  limit_count INT DEFAULT 6,
  offset_count INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  slug VARCHAR,
  short_description TEXT,
  base_price DECIMAL,
  badge VARCHAR,
  average_rating DECIMAL,
  review_count INT,
  primary_image_url TEXT,
  in_stock BOOLEAN,
  has_discount BOOLEAN,
  discount_percentage INT,
  discounted_price DECIMAL,
  available_colors INT,
  variants JSONB,
  images JSONB,
  product_type VARCHAR,
  has_multiple_views BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name::VARCHAR,
    p.slug::VARCHAR,
    p.short_description,
    p.base_price,
    p.badge::VARCHAR,
    COALESCE(p.average_rating, 0::NUMERIC) AS average_rating,
    COALESCE(p.review_count, 0) AS review_count,
    
    -- Get primary image from product_images table
    COALESCE(
      (
        SELECT pi.image_url
        FROM product_images pi
        WHERE pi.product_id = p.id
        AND pi.is_primary = true
        LIMIT 1
      ),
      (
        SELECT pi.image_url
        FROM product_images pi
        WHERE pi.product_id = p.id
        ORDER BY 
          CASE WHEN pi.display_order IS NOT NULL THEN pi.display_order ELSE 999 END,
          pi.created_at ASC
        LIMIT 1
      ),
      '/api/placeholder/400/500'
    ) AS primary_image_url,
    
    -- Calculate in_stock from product_variants inventory
    COALESCE(
      (
        SELECT SUM(pv.inventory_count) > 0
        FROM product_variants pv
        WHERE pv.product_id = p.id
        AND pv.is_active = true
      ),
      true -- Default to true if no variants exist
    ) AS in_stock,
    
    -- Since you don't have sale_price column, we'll default these
    false AS has_discount,
    0 AS discount_percentage,
    p.base_price AS discounted_price,
    
    -- Count available colors from variants
    COALESCE(
      (
        SELECT COUNT(DISTINCT pv.color)::INT
        FROM product_variants pv
        WHERE pv.product_id = p.id
        AND pv.is_active = true
      ),
      0
    ) AS available_colors,
    
    -- Get all variants with their details
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', pv.id,
            'size', pv.size,
            'color', pv.color,
            'color_hex', pv.color_hex,
            'inventory_count', pv.inventory_count
          )
          ORDER BY pv.color, pv.size
        )
        FROM product_variants pv
        WHERE pv.product_id = p.id
        AND pv.is_active = true
      ),
      '[]'::jsonb
    ) AS variants,
    
    -- Get all images including variant-specific ones
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', pi.id,
            'image_url', pi.image_url,
            'alt_text', COALESCE(pi.alt_text, ''),
            'is_primary', COALESCE(pi.is_primary, false),
            'variant_id', pi.variant_id,
            'view_type', pi.view_type
          )
          ORDER BY 
            CASE WHEN pi.is_primary = true THEN 0 ELSE 1 END,
            CASE WHEN pi.display_order IS NOT NULL THEN pi.display_order ELSE 999 END,
            pi.created_at ASC
        )
        FROM product_images pi
        WHERE pi.product_id = p.id
      ),
      '[]'::jsonb
    ) AS images,
    
    -- Get product type from category if needed (for now defaulting to 'apparel')
    'apparel'::VARCHAR AS product_type,
    
    -- Check if product has multiple view types (front, back, etc.)
    EXISTS (
      SELECT 1 
      FROM product_images pi2 
      WHERE pi2.product_id = p.id 
      AND pi2.view_type IS NOT NULL
      GROUP BY pi2.product_id
      HAVING COUNT(DISTINCT pi2.view_type) > 1
    ) AS has_multiple_views
    
  FROM products p
  WHERE p.is_featured = true
    AND p.is_active = true
  ORDER BY 
    p.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_featured_products(INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_featured_products(INT, INT) TO anon;

-- Add helpful comment
COMMENT ON FUNCTION get_featured_products(INT, INT) IS 
'Fetches featured products with variants and images for dynamic image switching when variants are selected';

-- Test the function
SELECT id, name, slug, primary_image_url, badge, average_rating, in_stock, available_colors 
FROM get_featured_products(6, 0);