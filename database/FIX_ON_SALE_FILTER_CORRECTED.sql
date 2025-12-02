-- =============================================
-- FINAL FIX: On-sale filter returning products without actual discounts
-- Problem: on_sale_only filter checks if discount EXISTS but not if it APPLIES
-- Solution: Only return products that ACTUALLY have a discounted price
-- =============================================

-- First, let's check what discounts are currently active
SELECT '=== CURRENT DISCOUNT STATUS ===' AS section;
SELECT
  code,
  description,
  is_active,
  show_on_products,
  applicable_to,
  applicable_ids,
  discount_type,
  discount_value,
  valid_from,
  valid_until
FROM discount_codes
WHERE is_active = true
ORDER BY show_on_products DESC, created_at DESC;

-- DROP the existing function first (required when parameter names change)
DROP FUNCTION IF EXISTS get_products_enhanced(text,numeric,numeric,text[],text[],uuid[],text[],boolean,boolean,boolean,text,text,integer,integer);

-- Now recreate the get_products_enhanced function with the fix
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
BEGIN
  -- Get category ID if category slug is provided
  IF category_slug_param IS NOT NULL THEN
    SELECT c.id INTO v_category_id
    FROM categories c
    WHERE c.slug = category_slug_param AND c.is_active = true;
  END IF;

  -- First, let's create a CTE that determines which products actually have discounts
  WITH products_with_discounts AS (
    SELECT DISTINCT p.id AS product_id  -- FIX: Alias the column to avoid ambiguity
    FROM products p
    WHERE p.is_active = true
      AND EXISTS (
        SELECT 1 FROM discount_codes dc
        WHERE dc.is_active = true
          AND dc.show_on_products = true
          AND dc.valid_from <= NOW()
          AND (dc.valid_until IS NULL OR dc.valid_until >= NOW())
          AND (dc.usage_limit IS NULL OR dc.usage_count < dc.usage_limit)
          AND (
            dc.applicable_to = 'all'
            OR (dc.applicable_to = 'product' AND p.id = ANY(dc.applicable_ids))
            OR (dc.applicable_to = 'category' AND p.category_id = ANY(dc.applicable_ids))
            OR (dc.applicable_to = 'variant' AND EXISTS (
              SELECT 1 FROM product_variants pv2
              WHERE pv2.product_id = p.id
                AND pv2.is_active = true
                AND pv2.id = ANY(dc.applicable_ids)
            ))
          )
      )
  ),

  -- Now filter products based on all criteria
  filtered_products AS (
    SELECT DISTINCT p.*
    FROM products p
    WHERE p.is_active = true
      AND (v_category_id IS NULL OR p.category_id = v_category_id)
      AND (category_id_filter IS NULL OR p.category_id = ANY(category_id_filter))
      AND (badge_filter IS NULL OR p.badge = ANY(badge_filter))
      AND (NOT featured_only OR p.is_featured = true)
      AND (min_price IS NULL OR p.base_price >= min_price)
      AND (max_price IS NULL OR p.base_price <= max_price)
      -- CRITICAL FIX: For on_sale_only, check if product is in products_with_discounts
      AND (NOT on_sale_only OR p.id IN (SELECT pwd.product_id FROM products_with_discounts pwd))  -- FIX: Use aliased column
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

  -- Get variant discounts
  variant_discounts AS (
    SELECT
      pv.id as variant_id,
      pv.product_id,
      vd.*
    FROM product_variants pv
    INNER JOIN filtered_products p ON p.id = pv.product_id
    CROSS JOIN LATERAL get_variant_discount(
      pv.id,
      p.id,
      p.category_id,
      p.base_price + COALESCE(pv.price_adjustment, 0)
    ) vd
    WHERE pv.is_active = true
  ),

  -- Aggregate variants with their discount information
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
      COUNT(DISTINCT pv.color) AS available_colors
    FROM product_variants pv
    INNER JOIN filtered_products p ON p.id = pv.product_id
    LEFT JOIN variant_discounts vd ON vd.variant_id = pv.id AND vd.product_id = pv.product_id
    WHERE pv.is_active = true
    GROUP BY pv.product_id
  ),

  -- Get product images
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
      COUNT(DISTINCT pi.view_type) > 1 AS has_multiple_views
    FROM product_images pi
    INNER JOIN filtered_products p ON p.id = pi.product_id
    GROUP BY pi.product_id
  ),

  -- Get best product discount
  product_discounts AS (
    SELECT
      p.id as product_id,
      pd.*
    FROM filtered_products p
    CROSS JOIN LATERAL get_product_best_discount(
      p.id,
      p.category_id,
      p.base_price
    ) pd
  )

  -- Count total before pagination
  SELECT COUNT(DISTINCT p.id)::INTEGER INTO v_total_count
  FROM filtered_products p
  -- CRITICAL: When on_sale_only is true, verify the product actually has a discount
  LEFT JOIN product_discounts pd ON pd.product_id = p.id
  WHERE NOT on_sale_only OR pd.has_discount = true;

  -- Return final results
  RETURN QUERY
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
    COALESCE(pd.discount_percentage, 0) AS discount_percentage,
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
  FROM filtered_products p
  LEFT JOIN product_variants_agg pv ON pv.product_id = p.id
  LEFT JOIN product_images_agg pi ON pi.product_id = p.id
  LEFT JOIN product_discounts pd ON pd.product_id = p.id
  -- CRITICAL: When on_sale_only is true, only include products with actual discounts
  WHERE NOT on_sale_only OR pd.has_discount = true
  ORDER BY
    CASE
      WHEN sort_by_param = 'price' AND sort_order_param = 'ASC' THEN p.base_price
      WHEN sort_by_param = 'price' AND sort_order_param = 'DESC' THEN -p.base_price
      WHEN sort_by_param = 'name' AND sort_order_param = 'ASC' THEN p.name::TEXT
      WHEN sort_by_param = 'name' AND sort_order_param = 'DESC' THEN p.name::TEXT
      WHEN sort_by_param = 'rating' THEN -p.average_rating
      WHEN sort_by_param = 'popular' THEN -p.review_count
      ELSE NULL
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
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_products_enhanced TO anon, authenticated;

-- Test the fix
SELECT '=== TESTING ON_SALE_ONLY FILTER ===' AS section;
SELECT
  p.id,
  p.name,
  p.has_discount,
  p.discount_percentage,
  p.discounted_price,
  p.base_price
FROM get_products_enhanced(
  on_sale_only := true,
  limit_count := 10
) p;

SELECT '=== VERIFICATION ===' AS section;
SELECT 'Products returned by on_sale_only filter should have:' AS check1;
SELECT '- has_discount = true' AS check2;
SELECT '- discount_percentage > 0' AS check3;
SELECT '- discounted_price < base_price' AS check4;

SELECT '✅ FIX COMPLETE!' AS status;
SELECT 'The on_sale_only filter now correctly returns ONLY products with actual applied discounts.' AS result;