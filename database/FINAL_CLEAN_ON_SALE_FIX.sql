-- =============================================
-- CLEAN FIX: On-sale filter only returns products with actual discounts
-- =============================================

-- First check what discounts exist
SELECT
  code,
  description,
  is_active,
  show_on_products,
  applicable_to
FROM discount_codes
WHERE is_active = true
ORDER BY show_on_products DESC;

-- Drop existing function
DROP FUNCTION IF EXISTS get_products_enhanced(text,numeric,numeric,text[],text[],uuid[],text[],boolean,boolean,boolean,text,text,integer,integer);

-- Create fixed function
CREATE OR REPLACE FUNCTION get_products_enhanced(
  category_slug_param TEXT DEFAULT NULL,
  min_price NUMERIC DEFAULT NULL,
  max_price NUMERIC DEFAULT NULL,
  size_filter TEXT[] DEFAULT NULL,
  color_filter TEXT[] DEFAULT NULL,
  category_id_filter UUID[] DEFAULT NULL,
  badge_filter TEXT[] DEFAULT NULL,
  featured_only BOOLEAN DEFAULT false,
  in_stock_only BOOLEAN DEFAULT false,
  on_sale_only BOOLEAN DEFAULT false,
  sort_by_param TEXT DEFAULT 'created_at',
  sort_order_param TEXT DEFAULT 'DESC',
  limit_count INTEGER DEFAULT 12,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  short_description TEXT,
  base_price NUMERIC,
  badge TEXT,
  average_rating NUMERIC,
  review_count INTEGER,
  primary_image_url TEXT,
  in_stock BOOLEAN,
  has_discount BOOLEAN,
  discount_percentage INTEGER,
  discounted_price NUMERIC,
  available_colors INTEGER,
  variants JSONB,
  images JSONB,
  has_multiple_views BOOLEAN,
  product_type TEXT,
  total_count INTEGER,
  is_featured BOOLEAN,
  category_id UUID,
  description TEXT,
  meta_title TEXT,
  meta_description TEXT,
  material TEXT,
  care_instructions TEXT,
  tags TEXT[],
  translations JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_category_id UUID;
  v_total_count INTEGER;
BEGIN
  -- Get category ID if provided
  IF category_slug_param IS NOT NULL THEN
    SELECT c.id INTO v_category_id
    FROM categories c
    WHERE c.slug = category_slug_param AND c.is_active = true;
  END IF;

  -- Create temp table for filtered products
  CREATE TEMP TABLE temp_filtered_products ON COMMIT DROP AS
  SELECT DISTINCT p.*
  FROM products p
  WHERE p.is_active = true
    AND (v_category_id IS NULL OR p.category_id = v_category_id)
    AND (category_id_filter IS NULL OR p.category_id = ANY(category_id_filter))
    AND (badge_filter IS NULL OR p.badge = ANY(badge_filter))
    AND (NOT featured_only OR p.is_featured = true)
    AND (min_price IS NULL OR p.base_price >= min_price)
    AND (max_price IS NULL OR p.base_price <= max_price)
    AND (
      size_filter IS NULL
      OR EXISTS (
        SELECT 1 FROM product_variants pv
        WHERE pv.product_id = p.id
          AND pv.size = ANY(size_filter)
          AND pv.is_active = true
          AND (NOT in_stock_only OR pv.inventory_count > 0)
      )
    )
    AND (
      color_filter IS NULL
      OR EXISTS (
        SELECT 1 FROM product_variants pv
        WHERE pv.product_id = p.id
          AND pv.color = ANY(color_filter)
          AND pv.is_active = true
      )
    );

  -- If on_sale_only, filter to only products with actual discounts
  IF on_sale_only THEN
    DELETE FROM temp_filtered_products tfp
    WHERE NOT EXISTS (
      SELECT 1 FROM discount_codes dc
      WHERE dc.is_active = true
        AND dc.show_on_products = true
        AND dc.valid_from <= NOW()
        AND (dc.valid_until IS NULL OR dc.valid_until >= NOW())
        AND (dc.usage_limit IS NULL OR dc.usage_count < dc.usage_limit)
        AND (
          dc.applicable_to = 'all'
          OR (dc.applicable_to = 'product' AND tfp.id = ANY(dc.applicable_ids))
          OR (dc.applicable_to = 'category' AND tfp.category_id = ANY(dc.applicable_ids))
          OR (dc.applicable_to = 'variant' AND EXISTS (
            SELECT 1 FROM product_variants pv2
            WHERE pv2.product_id = tfp.id
              AND pv2.is_active = true
              AND pv2.id = ANY(dc.applicable_ids)
          ))
        )
    );
  END IF;

  -- Count total
  SELECT COUNT(*)::INTEGER INTO v_total_count FROM temp_filtered_products;

  -- Return results with all aggregated data
  RETURN QUERY
  WITH variant_discounts AS (
    SELECT
      pv.id as variant_id,
      pv.product_id,
      vd.*
    FROM product_variants pv
    INNER JOIN temp_filtered_products p ON p.id = pv.product_id
    CROSS JOIN LATERAL get_variant_discount(
      pv.id,
      p.id,
      p.category_id,
      p.base_price + COALESCE(pv.price_adjustment, 0)
    ) vd
    WHERE pv.is_active = true
  ),
  product_variants_agg AS (
    SELECT
      pv.product_id,
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'id', pv.id,
          'size', pv.size,
          'color', pv.color,
          'color_hex', pv.color_hex,
          'price_adjustment', pv.price_adjustment,
          'inventory_count', pv.inventory_count,
          'is_active', pv.is_active,
          'has_discount', COALESCE(vd.has_discount, false),
          'discount_percentage', COALESCE(vd.discount_percentage, 0),
          'discounted_price', COALESCE(vd.discounted_price, p.base_price + COALESCE(pv.price_adjustment, 0)),
          'final_price', COALESCE(vd.discounted_price, p.base_price + COALESCE(pv.price_adjustment, 0)),
          'translations', pv.translations
        )
        ORDER BY pv.size, pv.color
      ) AS variants,
      MAX(pv.inventory_count) AS max_inventory,
      COUNT(DISTINCT pv.color)::INTEGER AS available_colors
    FROM product_variants pv
    INNER JOIN temp_filtered_products p ON p.id = pv.product_id
    LEFT JOIN variant_discounts vd ON vd.variant_id = pv.id AND vd.product_id = pv.product_id
    WHERE pv.is_active = true
    GROUP BY pv.product_id
  ),
  product_images_agg AS (
    SELECT
      pi.product_id,
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'id', pi.id,
          'image_url', pi.image_url,
          'alt_text', pi.alt_text,
          'is_primary', pi.is_primary,
          'view_type', pi.view_type,
          'display_order', pi.display_order,
          'variant_id', pi.variant_id
        )
        ORDER BY pi.is_primary DESC, pi.display_order, pi.created_at
      ) AS images,
      MAX(CASE WHEN pi.is_primary THEN pi.image_url END) AS primary_image_url,
      (COUNT(DISTINCT pi.view_type) > 1) AS has_multiple_views
    FROM product_images pi
    INNER JOIN temp_filtered_products p ON p.id = pi.product_id
    GROUP BY pi.product_id
  ),
  product_discounts AS (
    SELECT
      p.id as product_id,
      pd.*
    FROM temp_filtered_products p
    CROSS JOIN LATERAL get_product_best_discount(
      p.id,
      p.category_id,
      p.base_price
    ) pd
  )
  SELECT
    p.id,
    p.name,
    p.slug,
    p.short_description,
    p.base_price,
    p.badge,
    p.average_rating,
    p.review_count,
    COALESCE(pi.primary_image_url, '') AS primary_image_url,
    COALESCE(pv.max_inventory, 0) > 0 AS in_stock,
    COALESCE(pd.has_discount, false) AS has_discount,
    COALESCE(pd.discount_percentage, 0)::INTEGER AS discount_percentage,
    COALESCE(pd.discounted_price, p.base_price) AS discounted_price,
    COALESCE(pv.available_colors, 0) AS available_colors,
    COALESCE(pv.variants, '[]'::JSONB) AS variants,
    COALESCE(pi.images, '[]'::JSONB) AS images,
    COALESCE(pi.has_multiple_views, false) AS has_multiple_views,
    p.product_type,
    v_total_count AS total_count,
    p.is_featured,
    p.category_id,
    p.description,
    p.meta_title,
    p.meta_description,
    p.material,
    p.care_instructions,
    p.tags,
    p.translations
  FROM temp_filtered_products p
  LEFT JOIN product_variants_agg pv ON pv.product_id = p.id
  LEFT JOIN product_images_agg pi ON pi.product_id = p.id
  LEFT JOIN product_discounts pd ON pd.product_id = p.id
  -- Final filter: when on_sale_only, must have actual discount
  WHERE NOT on_sale_only OR pd.has_discount = true
  ORDER BY
    CASE
      WHEN sort_by_param = 'price' AND sort_order_param = 'ASC' THEN p.base_price
      WHEN sort_by_param = 'price' AND sort_order_param = 'DESC' THEN -p.base_price
      WHEN sort_by_param = 'rating' THEN -p.average_rating
      WHEN sort_by_param = 'popular' THEN -p.review_count
      ELSE NULL
    END NULLS LAST,
    CASE
      WHEN sort_by_param = 'name' AND sort_order_param = 'ASC' THEN p.name
      WHEN sort_by_param = 'name' AND sort_order_param = 'DESC' THEN p.name
    END NULLS LAST,
    CASE
      WHEN sort_by_param = 'created_at' AND sort_order_param = 'DESC' THEN p.created_at
    END DESC NULLS LAST,
    CASE
      WHEN sort_by_param = 'created_at' AND sort_order_param = 'ASC' THEN p.created_at
    END ASC NULLS LAST,
    p.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_products_enhanced TO anon, authenticated;

-- Test the fix
SELECT 'Testing on_sale_only filter:' AS test;
SELECT
  p.name,
  p.has_discount,
  p.discount_percentage,
  p.base_price,
  p.discounted_price
FROM get_products_enhanced(
  on_sale_only := true,
  limit_count := 5
) p;

SELECT 'Fix complete! on_sale_only now returns only products with actual discounts.' AS result;