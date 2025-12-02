-- =============================================
-- FIX: Filter options not respecting show_on_products field
-- This fixes the products_on_sale count to only include products
-- with discounts that have show_on_products = true
-- =============================================

-- Update the get_filter_options function to respect show_on_products
CREATE OR REPLACE FUNCTION get_filter_options(
  category_slug_param TEXT DEFAULT NULL
)
RETURNS TABLE (
  available_sizes TEXT[],
  available_colors JSONB,
  available_categories JSONB,
  available_badges TEXT[],
  min_price NUMERIC,
  max_price NUMERIC,
  total_products INTEGER,
  products_on_sale INTEGER,
  featured_products INTEGER
) AS $$
DECLARE
  v_category_id UUID;
BEGIN
  -- Get category ID if category slug is provided
  IF category_slug_param IS NOT NULL THEN
    SELECT c.id INTO v_category_id
    FROM categories c
    WHERE c.slug = category_slug_param AND c.is_active = true;
  END IF;

  RETURN QUERY
  SELECT
    -- Available sizes
    ARRAY(
      SELECT DISTINCT pv.size
      FROM product_variants pv
      INNER JOIN products p ON p.id = pv.product_id
      WHERE p.is_active = true
        AND pv.is_active = true
        AND pv.size IS NOT NULL
        AND (v_category_id IS NULL OR p.category_id = v_category_id)
      ORDER BY pv.size
    ) AS available_sizes,

    -- Available colors with hex codes and counts
    (
      SELECT JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'color', color_data.color,
          'hex', color_data.hex,
          'count', color_data.count
        )
      )
      FROM (
        SELECT
          pv.color,
          MAX(pv.color_hex) AS hex,
          COUNT(DISTINCT pv.product_id) AS count
        FROM product_variants pv
        INNER JOIN products p ON p.id = pv.product_id
        WHERE p.is_active = true
          AND pv.is_active = true
          AND pv.color IS NOT NULL
          AND (v_category_id IS NULL OR p.category_id = v_category_id)
        GROUP BY pv.color
        ORDER BY pv.color
      ) AS color_data
    ) AS available_colors,

    -- Available categories with counts
    (
      SELECT JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'id', cat_data.id,
          'name', cat_data.name,
          'slug', cat_data.slug,
          'count', cat_data.count
        )
      )
      FROM (
        SELECT
          c.id,
          c.name,
          c.slug,
          COUNT(DISTINCT p.id) AS count
        FROM categories c
        INNER JOIN products p ON p.category_id = c.id
        WHERE c.is_active = true
          AND p.is_active = true
          AND (v_category_id IS NULL OR c.id = v_category_id)
        GROUP BY c.id, c.name, c.slug
        ORDER BY c.sort_order, c.name
      ) AS cat_data
    ) AS available_categories,

    -- Available badges
    ARRAY(
      SELECT DISTINCT p.badge
      FROM products p
      WHERE p.is_active = true
        AND p.badge IS NOT NULL
        AND (v_category_id IS NULL OR p.category_id = v_category_id)
      ORDER BY p.badge
    ) AS available_badges,

    -- Price range
    COALESCE(MIN(p.base_price), 0) AS min_price,
    COALESCE(MAX(p.base_price), 1000) AS max_price,

    -- Product counts
    COUNT(DISTINCT p.id)::INTEGER AS total_products,

    -- Products on sale (have active discounts WITH show_on_products = true)
    -- ⭐ CRITICAL FIX: Added show_on_products = true check
    COUNT(DISTINCT
      CASE
        WHEN EXISTS (
          SELECT 1 FROM discount_codes dc
          WHERE dc.is_active = true
            AND dc.show_on_products = true  -- ⭐ CRITICAL: Only count product listing discounts
            AND dc.valid_from <= NOW()
            AND (dc.valid_until IS NULL OR dc.valid_until >= NOW())
            AND (
              dc.applicable_to = 'all'
              OR (dc.applicable_to = 'product' AND p.id = ANY(dc.applicable_ids))
              OR (dc.applicable_to = 'category' AND p.category_id = ANY(dc.applicable_ids))
              OR (dc.applicable_to = 'variant' AND EXISTS (
                SELECT 1 FROM product_variants pv
                WHERE pv.product_id = p.id
                AND pv.id = ANY(dc.applicable_ids)
              ))
            )
        ) THEN p.id
        ELSE NULL
      END
    )::INTEGER AS products_on_sale,

    -- Featured products
    COUNT(DISTINCT CASE WHEN p.is_featured = true THEN p.id ELSE NULL END)::INTEGER AS featured_products

  FROM products p
  WHERE p.is_active = true
    AND (v_category_id IS NULL OR p.category_id = v_category_id);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_filter_options(TEXT) TO authenticated, anon;

-- Verify the fix
SELECT '---' AS separator;
SELECT 'Testing filter options with show_on_products check:' AS info;
SELECT * FROM get_filter_options();

SELECT '---' AS separator;
SELECT 'Current discount codes breakdown:' AS info;
SELECT
  COUNT(*) FILTER (WHERE show_on_products = true) AS product_sale_discounts,
  COUNT(*) FILTER (WHERE show_on_products = false OR show_on_products IS NULL) AS checkout_only_codes,
  COUNT(*) FILTER (WHERE is_active = true AND show_on_products = true) AS active_product_sales,
  COUNT(*) FILTER (WHERE is_active = true AND (show_on_products = false OR show_on_products IS NULL)) AS active_checkout_codes
FROM discount_codes;

SELECT '---' AS separator;
SELECT '✅ Filter options function updated! Now only counts products with visible discounts (show_on_products=true).' AS status;