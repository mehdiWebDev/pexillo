-- =============================================
-- WORKING FIX: Complete replacement of get_products_enhanced
-- This version properly checks show_on_products for on_sale filter
-- =============================================

-- Step 1: Drop the existing broken function
DROP FUNCTION IF EXISTS get_products_enhanced(text,numeric,numeric,text[],text[],uuid[],text[],boolean,boolean,boolean,text,text,integer,integer);

-- Step 2: Create the corrected function
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
) AS $$
DECLARE
  v_category_id UUID;
  v_total_count INTEGER;
  v_sort_by TEXT := sort_by_param;
  v_sort_order TEXT := sort_order_param;
BEGIN
  -- Get category ID if category slug is provided
  IF category_slug_param IS NOT NULL THEN
    SELECT c.id INTO v_category_id
    FROM categories c
    WHERE c.slug = category_slug_param AND c.is_active = true;
  END IF;

  -- Return results using a simpler approach
  RETURN QUERY
  WITH filtered_products AS (
    SELECT p.*
    FROM products p
    WHERE p.is_active = true
      AND (v_category_id IS NULL OR p.category_id = v_category_id)
      AND (category_id_filter IS NULL OR p.category_id = ANY(category_id_filter))
      AND (badge_filter IS NULL OR p.badge = ANY(badge_filter))
      AND (NOT featured_only OR p.is_featured = true)
      AND (min_price IS NULL OR p.base_price >= min_price)
      AND (max_price IS NULL OR p.base_price <= max_price)
      -- CRITICAL FIX: Only include products with visible discounts when on_sale_only = true
      AND (
        NOT on_sale_only
        OR EXISTS (
          SELECT 1
          FROM discount_codes dc
          WHERE dc.is_active = true
            AND dc.show_on_products = true  -- ⭐ CRITICAL: Must be visible on products
            AND dc.valid_from <= NOW()
            AND (dc.valid_until IS NULL OR dc.valid_until >= NOW())
            AND (dc.usage_limit IS NULL OR dc.usage_count < dc.usage_limit)
            AND (
              dc.applicable_to = 'all'
              OR (dc.applicable_to = 'product' AND p.id = ANY(dc.applicable_ids))
              OR (dc.applicable_to = 'category' AND p.category_id = ANY(dc.applicable_ids))
              OR (dc.applicable_to = 'variant' AND EXISTS (
                SELECT 1 FROM product_variants pv
                WHERE pv.product_id = p.id
                  AND pv.is_active = true
                  AND pv.id = ANY(dc.applicable_ids)
              ))
            )
        )
      )
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
      )
  ),
  total_count AS (
    SELECT COUNT(*)::INTEGER as cnt FROM filtered_products
  ),
  product_variants_data AS (
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
          'has_discount', COALESCE((
            SELECT vd.has_discount
            FROM get_variant_discount(pv.id, pv.product_id, p.category_id, p.base_price + COALESCE(pv.price_adjustment, 0)) vd
          ), false),
          'discount_percentage', COALESCE((
            SELECT vd.discount_percentage
            FROM get_variant_discount(pv.id, pv.product_id, p.category_id, p.base_price + COALESCE(pv.price_adjustment, 0)) vd
          ), 0),
          'discounted_price', COALESCE((
            SELECT vd.discounted_price
            FROM get_variant_discount(pv.id, pv.product_id, p.category_id, p.base_price + COALESCE(pv.price_adjustment, 0)) vd
          ), p.base_price + COALESCE(pv.price_adjustment, 0)),
          'final_price', COALESCE((
            SELECT vd.discounted_price
            FROM get_variant_discount(pv.id, pv.product_id, p.category_id, p.base_price + COALESCE(pv.price_adjustment, 0)) vd
          ), p.base_price + COALESCE(pv.price_adjustment, 0)),
          'translations', pv.translations
        )
        ORDER BY pv.size, pv.color
      ) AS variants,
      MAX(pv.inventory_count) AS max_inventory,
      COUNT(DISTINCT pv.color)::INTEGER AS color_count
    FROM product_variants pv
    INNER JOIN filtered_products p ON p.id = pv.product_id
    WHERE pv.is_active = true
    GROUP BY pv.product_id
  ),
  product_images_data AS (
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
      MAX(CASE WHEN pi.is_primary THEN pi.image_url END) AS primary_url,
      (COUNT(DISTINCT pi.view_type) > 1) AS has_multiple
    FROM product_images pi
    INNER JOIN filtered_products p ON p.id = pi.product_id
    GROUP BY pi.product_id
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
    COALESCE(pi.primary_url, '') AS primary_image_url,
    COALESCE(pv.max_inventory, 0) > 0 AS in_stock,
    COALESCE((
      SELECT pd.has_discount
      FROM get_product_best_discount(p.id, p.category_id, p.base_price) pd
    ), false) AS has_discount,
    COALESCE((
      SELECT pd.discount_percentage
      FROM get_product_best_discount(p.id, p.category_id, p.base_price) pd
    ), 0)::INTEGER AS discount_percentage,
    COALESCE((
      SELECT pd.discounted_price
      FROM get_product_best_discount(p.id, p.category_id, p.base_price) pd
    ), p.base_price) AS discounted_price,
    COALESCE(pv.color_count, 0) AS available_colors,
    COALESCE(pv.variants, '[]'::JSONB) AS variants,
    COALESCE(pi.images, '[]'::JSONB) AS images,
    COALESCE(pi.has_multiple, false) AS has_multiple_views,
    'apparel' AS product_type,
    tc.cnt AS total_count,
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
  CROSS JOIN total_count tc
  LEFT JOIN product_variants_data pv ON pv.product_id = p.id
  LEFT JOIN product_images_data pi ON pi.product_id = p.id
  ORDER BY
    CASE
      WHEN v_sort_by = 'price' AND v_sort_order = 'ASC' THEN p.base_price
    END ASC,
    CASE
      WHEN v_sort_by = 'price' AND v_sort_order = 'DESC' THEN p.base_price
    END DESC,
    CASE
      WHEN v_sort_by = 'name' AND v_sort_order = 'ASC' THEN p.name
    END ASC,
    CASE
      WHEN v_sort_by = 'name' AND v_sort_order = 'DESC' THEN p.name
    END DESC,
    CASE
      WHEN v_sort_by = 'rating' AND v_sort_order = 'DESC' THEN p.average_rating
    END DESC,
    CASE
      WHEN v_sort_by = 'rating' AND v_sort_order = 'ASC' THEN p.average_rating
    END ASC,
    CASE
      WHEN v_sort_by = 'created_at' AND v_sort_order = 'ASC' THEN p.created_at
    END ASC,
    CASE
      WHEN v_sort_by = 'created_at' AND v_sort_order = 'DESC' THEN p.created_at
    END DESC,
    p.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_products_enhanced TO anon, authenticated;

-- Step 3: Test the fix
SELECT '=== TESTING THE FIX ===' AS section;

-- This should return 0 since you have no show_on_products = true discounts
SELECT COUNT(*) as should_be_zero
FROM get_products_enhanced(
  on_sale_only := true,
  limit_count := 100
) p;

-- Verify no active visible discounts
SELECT '=== VERIFY DISCOUNT STATUS ===' AS section;
SELECT
  COUNT(*) as visible_discounts,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ Correct: No visible discounts, so no products should be on sale'
    ELSE '❌ You have ' || COUNT(*) || ' visible discounts'
  END as status
FROM discount_codes
WHERE is_active = true AND show_on_products = true;

SELECT '✅ Fix applied! The on_sale filter now correctly checks show_on_products.' AS result;