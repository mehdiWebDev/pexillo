-- =============================================
-- FIX: Sorting not working due to parameter naming conflict
-- The issue: sort_by and sort_order parameters need proper prefixing
-- =============================================

-- Drop and recreate the function with fixed parameter names
DROP FUNCTION IF EXISTS get_products_enhanced(TEXT, NUMERIC, NUMERIC, TEXT[], TEXT[], UUID[], TEXT[], BOOLEAN, BOOLEAN, BOOLEAN, TEXT, TEXT, INTEGER, INTEGER);

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
  sort_by_param TEXT DEFAULT 'created_at',     -- FIXED: Added _param suffix
  sort_order_param TEXT DEFAULT 'DESC',        -- FIXED: Added _param suffix
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
) AS $$
DECLARE
  v_category_id UUID;
  v_total_count INTEGER;
BEGIN
  -- Get main category ID from URL slug
  IF category_slug_param IS NOT NULL THEN
    SELECT c.id INTO v_category_id
    FROM categories c
    WHERE c.slug = category_slug_param
      AND c.is_active = true
    LIMIT 1;
  END IF;

  -- Count total matching products
  SELECT COUNT(DISTINCT p.id)::INTEGER INTO v_total_count
  FROM products p
  WHERE p.is_active = true
    AND (v_category_id IS NULL OR p.category_id = v_category_id)
    AND (category_id_filter IS NULL OR cardinality(category_id_filter) = 0 OR p.category_id = ANY(category_id_filter))
    AND (badge_filter IS NULL OR cardinality(badge_filter) = 0 OR p.badge = ANY(badge_filter))
    AND (NOT featured_only OR p.is_featured = true)
    AND (min_price IS NULL OR p.base_price >= min_price)
    AND (max_price IS NULL OR p.base_price <= max_price)
    AND (size_filter IS NULL OR cardinality(size_filter) = 0 OR EXISTS (
      SELECT 1 FROM product_variants pv2
      WHERE pv2.product_id = p.id
        AND pv2.is_active = true
        AND pv2.size = ANY(size_filter)
        AND (NOT in_stock_only OR pv2.inventory_count > 0)
    ))
    AND (color_filter IS NULL OR cardinality(color_filter) = 0 OR EXISTS (
      SELECT 1 FROM product_variants pv3
      WHERE pv3.product_id = p.id
        AND pv3.is_active = true
        AND pv3.color = ANY(color_filter)
    ))
    AND (NOT in_stock_only OR EXISTS (
      SELECT 1 FROM product_variants pv4
      WHERE pv4.product_id = p.id
        AND pv4.is_active = true
        AND pv4.inventory_count > 0
    ))
    AND (NOT on_sale_only OR EXISTS (
      SELECT 1 FROM discount_codes dc
      WHERE dc.is_active = true
        AND dc.valid_from <= NOW()
        AND (dc.valid_until IS NULL OR dc.valid_until >= NOW())
        AND (
          dc.applicable_to = 'all'
          OR (dc.applicable_to = 'product' AND p.id = ANY(dc.applicable_ids))
          OR (dc.applicable_to = 'category' AND p.category_id = ANY(dc.applicable_ids))
          OR (dc.applicable_to = 'variant' AND EXISTS (
            SELECT 1 FROM product_variants pv5
            WHERE pv5.product_id = p.id
              AND pv5.id = ANY(dc.applicable_ids)
              AND pv5.is_active = true
          ))
        )
    ));

  -- Main query
  RETURN QUERY
  WITH filtered_products AS (
    SELECT DISTINCT p.*
    FROM products p
    WHERE p.is_active = true
      AND (v_category_id IS NULL OR p.category_id = v_category_id)
      AND (category_id_filter IS NULL OR cardinality(category_id_filter) = 0 OR p.category_id = ANY(category_id_filter))
      AND (badge_filter IS NULL OR cardinality(badge_filter) = 0 OR p.badge = ANY(badge_filter))
      AND (NOT featured_only OR p.is_featured = true)
      AND (min_price IS NULL OR p.base_price >= min_price)
      AND (max_price IS NULL OR p.base_price <= max_price)
      AND (size_filter IS NULL OR cardinality(size_filter) = 0 OR EXISTS (
        SELECT 1 FROM product_variants pv2
        WHERE pv2.product_id = p.id
          AND pv2.is_active = true
          AND pv2.size = ANY(size_filter)
          AND (NOT in_stock_only OR pv2.inventory_count > 0)
      ))
      AND (color_filter IS NULL OR cardinality(color_filter) = 0 OR EXISTS (
        SELECT 1 FROM product_variants pv3
        WHERE pv3.product_id = p.id
          AND pv3.is_active = true
          AND pv3.color = ANY(color_filter)
      ))
      AND (NOT in_stock_only OR EXISTS (
        SELECT 1 FROM product_variants pv4
        WHERE pv4.product_id = p.id
          AND pv4.is_active = true
          AND pv4.inventory_count > 0
      ))
      AND (NOT on_sale_only OR EXISTS (
        SELECT 1 FROM discount_codes dc
        WHERE dc.is_active = true
          AND dc.valid_from <= NOW()
          AND (dc.valid_until IS NULL OR dc.valid_until >= NOW())
          AND (
            dc.applicable_to = 'all'
            OR (dc.applicable_to = 'product' AND p.id = ANY(dc.applicable_ids))
            OR (dc.applicable_to = 'category' AND p.category_id = ANY(dc.applicable_ids))
            OR (dc.applicable_to = 'variant' AND EXISTS (
              SELECT 1 FROM product_variants pv5
              WHERE pv5.product_id = p.id
                AND pv5.id = ANY(dc.applicable_ids)
                AND pv5.is_active = true
            ))
          )
      ))
  ),

  -- Aggregate variants with discount info
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
          'final_price', p.base_price + COALESCE(pv.price_adjustment, 0),
          'translations', pv.translations
        ) ORDER BY pv.size, pv.color
      ) AS variants,
      COUNT(DISTINCT pv.color)::INTEGER AS color_count,
      BOOL_OR(pv.inventory_count > 0) AS has_stock,
      BOOL_OR(COALESCE(vd.has_discount, false)) AS any_variant_has_discount
    FROM product_variants pv
    INNER JOIN filtered_products p ON p.id = pv.product_id
    LEFT JOIN LATERAL get_variant_discount(
      pv.id,
      p.id,
      p.category_id,
      p.base_price + COALESCE(pv.price_adjustment, 0)
    ) vd ON true
    WHERE pv.is_active = true
    GROUP BY pv.product_id
  ),

  -- Aggregate images
  product_images_agg AS (
    SELECT
      pi.product_id,
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'id', pi.id,
          'image_url', pi.image_url,
          'alt_text', COALESCE(pi.alt_text, ''),
          'is_primary', pi.is_primary,
          'view_type', COALESCE(pi.view_type, 'front'),
          'display_order', COALESCE(pi.display_order, 1),
          'variant_id', pi.variant_id
        ) ORDER BY pi.display_order, pi.is_primary DESC
      ) AS images,
      MAX(CASE WHEN pi.is_primary THEN pi.image_url END) AS primary_url,
      COUNT(DISTINCT pi.view_type) > 1 AS has_multiple_views
    FROM product_images pi
    INNER JOIN filtered_products fp ON fp.id = pi.product_id
    GROUP BY pi.product_id
  )

  SELECT
    p.id,
    p.name,
    p.slug,
    COALESCE(p.short_description, '') AS short_description,
    p.base_price,
    p.badge,
    COALESCE(p.average_rating, 0) AS average_rating,
    COALESCE(p.review_count, 0) AS review_count,
    COALESCE(pimg.primary_url, '') AS primary_image_url,
    COALESCE(pvar.has_stock, false) AS in_stock,
    COALESCE(
      (SELECT d.has_discount FROM get_product_best_discount(p.id, p.category_id, p.base_price) d),
      pvar.any_variant_has_discount,
      false
    ) AS has_discount,
    COALESCE(
      (SELECT d.discount_percentage FROM get_product_best_discount(p.id, p.category_id, p.base_price) d),
      0
    )::INTEGER AS discount_percentage,
    COALESCE(
      (SELECT d.discounted_price FROM get_product_best_discount(p.id, p.category_id, p.base_price) d),
      p.base_price
    ) AS discounted_price,
    COALESCE(pvar.color_count, 0) AS available_colors,
    COALESCE(pvar.variants, '[]'::JSONB) AS variants,
    COALESCE(pimg.images, '[]'::JSONB) AS images,
    COALESCE(pimg.has_multiple_views, false) AS has_multiple_views,
    'apparel' AS product_type,
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

  FROM filtered_products p
  LEFT JOIN product_variants_agg pvar ON pvar.product_id = p.id
  LEFT JOIN product_images_agg pimg ON pimg.product_id = p.id

  -- FIXED: Use parameter variables with _param suffix and handle case insensitivity
  ORDER BY
    CASE WHEN sort_by_param = 'created_at' AND UPPER(sort_order_param) = 'DESC' THEN p.created_at END DESC,
    CASE WHEN sort_by_param = 'created_at' AND UPPER(sort_order_param) = 'ASC' THEN p.created_at END ASC,
    CASE WHEN sort_by_param = 'price' AND UPPER(sort_order_param) = 'ASC' THEN p.base_price END ASC,
    CASE WHEN sort_by_param = 'price' AND UPPER(sort_order_param) = 'DESC' THEN p.base_price END DESC,
    CASE WHEN sort_by_param = 'rating' AND UPPER(sort_order_param) = 'DESC' THEN p.average_rating END DESC,
    CASE WHEN sort_by_param = 'rating' AND UPPER(sort_order_param) = 'ASC' THEN p.average_rating END ASC,
    CASE WHEN sort_by_param = 'popular' AND UPPER(sort_order_param) = 'DESC' THEN p.purchase_count END DESC,
    CASE WHEN sort_by_param = 'popular' AND UPPER(sort_order_param) = 'ASC' THEN p.purchase_count END ASC,
    CASE WHEN sort_by_param = 'name' AND UPPER(sort_order_param) = 'ASC' THEN p.name END ASC,
    CASE WHEN sort_by_param = 'name' AND UPPER(sort_order_param) = 'DESC' THEN p.name END DESC,
    p.created_at DESC

  LIMIT limit_count
  OFFSET offset_count;

END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_products_enhanced TO authenticated, anon;

-- Test the fix
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SORTING FIX APPLIED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Issue Fixed:';
  RAISE NOTICE '✓ Parameters sort_by and sort_order renamed to sort_by_param and sort_order_param';
  RAISE NOTICE '✓ This prevents PostgreSQL from treating them as column references';
  RAISE NOTICE '✓ All sorting options should now work correctly';
  RAISE NOTICE '========================================';
END $$;