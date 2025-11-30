-- =============================================
-- COMPREHENSIVE FIX: All missing database functions
-- Run this ENTIRE script in Supabase SQL Editor
-- =============================================

-- 1. Create get_variant_discount if missing
CREATE OR REPLACE FUNCTION get_variant_discount(
  p_variant_id UUID,
  p_product_id UUID DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_base_price NUMERIC DEFAULT 0
)
RETURNS TABLE (
  has_discount BOOLEAN,
  discount_percentage NUMERIC,
  discounted_price NUMERIC,
  discount_type TEXT,
  discount_value NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_discount RECORD;
  v_amount_off NUMERIC;
  v_final_price NUMERIC;
BEGIN
  -- Find the best active discount
  SELECT
    dc.id,
    dc.discount_type,
    dc.discount_value,
    dc.maximum_discount,
    dc.applicable_to,
    dc.priority
  INTO v_discount
  FROM public.discount_codes dc
  WHERE
    dc.is_active = true
    AND dc.valid_from <= NOW()
    AND (dc.valid_until IS NULL OR dc.valid_until > NOW())
    AND (dc.usage_limit IS NULL OR dc.usage_count < dc.usage_limit)
    AND (
      (dc.applicable_to = 'variant' AND p_variant_id = ANY(dc.applicable_ids))
      OR (dc.applicable_to = 'product' AND p_product_id IS NOT NULL AND p_product_id = ANY(dc.applicable_ids))
      OR (dc.applicable_to = 'category' AND p_category_id IS NOT NULL AND p_category_id = ANY(dc.applicable_ids))
      OR (dc.applicable_to = 'all')
    )
  ORDER BY
    CASE
      WHEN dc.applicable_to = 'variant' THEN 1
      WHEN dc.applicable_to = 'product' THEN 2
      WHEN dc.applicable_to = 'category' THEN 3
      WHEN dc.applicable_to = 'all' THEN 4
    END,
    dc.priority DESC,
    dc.discount_value DESC
  LIMIT 1;

  -- If no discount found
  IF v_discount.id IS NULL THEN
    RETURN QUERY SELECT false::BOOLEAN, 0::NUMERIC, p_base_price::NUMERIC, NULL::TEXT, NULL::NUMERIC;
    RETURN;
  END IF;

  -- Calculate discount
  IF v_discount.discount_type = 'percentage' THEN
    v_amount_off := p_base_price * (v_discount.discount_value / 100);
    IF v_discount.maximum_discount IS NOT NULL AND v_amount_off > v_discount.maximum_discount THEN
      v_amount_off := v_discount.maximum_discount;
    END IF;
    v_final_price := p_base_price - v_amount_off;
    RETURN QUERY SELECT
      true::BOOLEAN,
      ROUND((v_amount_off / NULLIF(p_base_price, 0)) * 100, 0)::NUMERIC,
      ROUND(v_final_price, 2)::NUMERIC,
      v_discount.discount_type::TEXT,
      v_discount.discount_value::NUMERIC;
  ELSIF v_discount.discount_type = 'fixed_amount' THEN
    v_amount_off := LEAST(v_discount.discount_value, p_base_price);
    v_final_price := p_base_price - v_amount_off;
    RETURN QUERY SELECT
      true::BOOLEAN,
      ROUND((v_amount_off / NULLIF(p_base_price, 0)) * 100, 0)::NUMERIC,
      ROUND(v_final_price, 2)::NUMERIC,
      v_discount.discount_type::TEXT,
      v_discount.discount_value::NUMERIC;
  ELSE
    RETURN QUERY SELECT false::BOOLEAN, 0::NUMERIC, p_base_price::NUMERIC, v_discount.discount_type::TEXT, v_discount.discount_value::NUMERIC;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_variant_discount TO anon, authenticated;

-- 2. Create get_filter_options function
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
  -- Get category ID if slug provided
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

    -- Available colors
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

    -- Available categories
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

    -- Products on sale
    COUNT(DISTINCT
      CASE
        WHEN EXISTS (
          SELECT 1 FROM discount_codes dc
          WHERE dc.is_active = true
            AND dc.valid_from <= NOW()
            AND (dc.valid_until IS NULL OR dc.valid_until >= NOW())
            AND (
              dc.applicable_to = 'all'
              OR (dc.applicable_to = 'product' AND p.id = ANY(dc.applicable_ids))
              OR (dc.applicable_to = 'category' AND p.category_id = ANY(dc.applicable_ids))
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

GRANT EXECUTE ON FUNCTION get_filter_options(TEXT) TO authenticated, anon;

-- 3. Test all functions
DO $$
BEGIN
  RAISE NOTICE 'Testing functions...';

  -- Test get_filter_options
  PERFORM * FROM get_filter_options() LIMIT 1;
  RAISE NOTICE '✓ get_filter_options works';

  -- Test get_variant_discount
  PERFORM * FROM get_variant_discount(
    '00000000-0000-0000-0000-000000000000'::UUID,
    '00000000-0000-0000-0000-000000000000'::UUID,
    '00000000-0000-0000-0000-000000000000'::UUID,
    100.00
  );
  RAISE NOTICE '✓ get_variant_discount works';

  -- Test get_products_enhanced
  PERFORM * FROM get_products_enhanced() LIMIT 1;
  RAISE NOTICE '✓ get_products_enhanced works';

  RAISE NOTICE 'All functions created successfully!';
END $$;