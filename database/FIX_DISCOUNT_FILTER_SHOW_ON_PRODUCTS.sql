-- FIX DISCOUNT FILTER TO RESPECT show_on_products FIELD
-- This ensures only product sale discounts (show_on_products = true) appear in filters
-- Checkout-only codes won't trigger the "Discounts" filter

-- 1. Update get_variant_discount function to only show product listing discounts
DROP FUNCTION IF EXISTS get_variant_discount(UUID, UUID, UUID, NUMERIC);

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
  -- Find the best active discount applicable to this variant
  -- ONLY include discounts with show_on_products = true
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
    AND dc.show_on_products = true  -- ⭐ CRITICAL: Only show product listing discounts
    AND dc.valid_from <= NOW()
    AND (dc.valid_until IS NULL OR dc.valid_until > NOW())
    AND (dc.usage_limit IS NULL OR dc.usage_count < dc.usage_limit)
    AND (
      -- Variant-specific discount
      (dc.applicable_to = 'variant' AND p_variant_id = ANY(dc.applicable_ids))
      OR
      -- Product-specific discount
      (dc.applicable_to = 'product' AND p_product_id IS NOT NULL AND p_product_id = ANY(dc.applicable_ids))
      OR
      -- Category-specific discount
      (dc.applicable_to = 'category' AND p_category_id IS NOT NULL AND p_category_id = ANY(dc.applicable_ids))
      OR
      -- All products discount
      (dc.applicable_to = 'all')
    )
  ORDER BY
    -- Prioritize variant-specific, then product, then category, then all
    CASE
      WHEN dc.applicable_to = 'variant' THEN 1
      WHEN dc.applicable_to = 'product' THEN 2
      WHEN dc.applicable_to = 'category' THEN 3
      WHEN dc.applicable_to = 'all' THEN 4
    END,
    dc.priority DESC,
    dc.discount_value DESC
  LIMIT 1;

  -- If no discount found, return no discount
  IF v_discount.id IS NULL THEN
    RETURN QUERY SELECT
      false::BOOLEAN,
      0::NUMERIC,
      p_base_price::NUMERIC,
      NULL::TEXT,
      NULL::NUMERIC;
    RETURN;
  END IF;

  -- Calculate discount amount based on type
  IF v_discount.discount_type = 'percentage' THEN
    v_amount_off := p_base_price * (v_discount.discount_value / 100);

    -- Apply maximum discount cap if specified
    IF v_discount.maximum_discount IS NOT NULL AND v_amount_off > v_discount.maximum_discount THEN
      v_amount_off := v_discount.maximum_discount;
    END IF;

    v_final_price := p_base_price - v_amount_off;

    RETURN QUERY SELECT
      true::BOOLEAN,
      ROUND((v_amount_off / p_base_price) * 100, 0)::NUMERIC as discount_percentage,
      ROUND(v_final_price, 2)::NUMERIC,
      v_discount.discount_type::TEXT,
      v_discount.discount_value::NUMERIC;

  ELSIF v_discount.discount_type = 'fixed_amount' THEN
    v_amount_off := v_discount.discount_value;

    -- Don't let price go below 0
    IF v_amount_off > p_base_price THEN
      v_amount_off := p_base_price;
    END IF;

    v_final_price := p_base_price - v_amount_off;

    RETURN QUERY SELECT
      true::BOOLEAN,
      ROUND((v_amount_off / p_base_price) * 100, 0)::NUMERIC as discount_percentage,
      ROUND(v_final_price, 2)::NUMERIC,
      v_discount.discount_type::TEXT,
      v_discount.discount_value::NUMERIC;

  ELSE
    -- Free shipping doesn't affect product price display
    RETURN QUERY SELECT
      false::BOOLEAN,
      0::NUMERIC,
      p_base_price::NUMERIC,
      v_discount.discount_type::TEXT,
      v_discount.discount_value::NUMERIC;
  END IF;
END;
$$;

-- 2. Update/Create get_product_best_discount function if it exists
DROP FUNCTION IF EXISTS get_product_best_discount(UUID, UUID, NUMERIC);

CREATE OR REPLACE FUNCTION get_product_best_discount(
  p_product_id UUID,
  p_category_id UUID,
  p_base_price NUMERIC
)
RETURNS TABLE (
  has_discount BOOLEAN,
  discount_percentage INTEGER,
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
  v_percentage INTEGER;
BEGIN
  -- Find the best active discount applicable to this product
  -- ONLY include discounts with show_on_products = true
  SELECT
    dc.id,
    dc.discount_type,
    dc.discount_value,
    dc.maximum_discount
  INTO v_discount
  FROM public.discount_codes dc
  WHERE
    dc.is_active = true
    AND dc.show_on_products = true  -- ⭐ CRITICAL: Only show product listing discounts
    AND dc.valid_from <= NOW()
    AND (dc.valid_until IS NULL OR dc.valid_until > NOW())
    AND (dc.usage_limit IS NULL OR dc.usage_count < dc.usage_limit)
    AND (
      -- All products discount
      dc.applicable_to = 'all'
      OR
      -- Product-specific discount
      (dc.applicable_to = 'product' AND p_product_id = ANY(dc.applicable_ids))
      OR
      -- Category-specific discount
      (dc.applicable_to = 'category' AND p_category_id = ANY(dc.applicable_ids))
      OR
      -- Check if product has variants with this discount
      (dc.applicable_to = 'variant' AND EXISTS (
        SELECT 1 FROM product_variants pv
        WHERE pv.product_id = p_product_id
        AND pv.id = ANY(dc.applicable_ids)
      ))
    )
  ORDER BY
    dc.priority DESC,
    dc.discount_value DESC
  LIMIT 1;

  -- If no discount found, return no discount
  IF v_discount.id IS NULL THEN
    RETURN QUERY SELECT
      false::BOOLEAN,
      0::INTEGER,
      p_base_price::NUMERIC,
      NULL::TEXT,
      NULL::NUMERIC;
    RETURN;
  END IF;

  -- Calculate discount amount based on type
  IF v_discount.discount_type = 'percentage' THEN
    v_amount_off := p_base_price * (v_discount.discount_value / 100);

    -- Apply maximum discount cap if specified
    IF v_discount.maximum_discount IS NOT NULL AND v_amount_off > v_discount.maximum_discount THEN
      v_amount_off := v_discount.maximum_discount;
    END IF;

    v_final_price := p_base_price - v_amount_off;
    v_percentage := ROUND((v_amount_off / p_base_price) * 100, 0);

  ELSIF v_discount.discount_type = 'fixed_amount' THEN
    v_amount_off := v_discount.discount_value;

    -- Don't let price go below 0
    IF v_amount_off > p_base_price THEN
      v_amount_off := p_base_price;
    END IF;

    v_final_price := p_base_price - v_amount_off;
    v_percentage := ROUND((v_amount_off / p_base_price) * 100, 0);

  ELSE
    -- Free shipping doesn't affect product price display
    v_final_price := p_base_price;
    v_percentage := 0;
  END IF;

  RETURN QUERY SELECT
    true::BOOLEAN,
    v_percentage::INTEGER,
    ROUND(v_final_price, 2)::NUMERIC,
    v_discount.discount_type::TEXT,
    v_discount.discount_value::NUMERIC;
END;
$$;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION get_variant_discount TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_product_best_discount TO anon, authenticated;

-- 4. Verify the fix
SELECT '---' AS separator;
SELECT 'Current discount codes breakdown:' AS info;
SELECT
  COUNT(*) FILTER (WHERE show_on_products = true) AS product_sale_discounts,
  COUNT(*) FILTER (WHERE show_on_products = false OR show_on_products IS NULL) AS checkout_only_codes,
  COUNT(*) FILTER (WHERE is_active = true AND show_on_products = true) AS active_product_sales,
  COUNT(*) FILTER (WHERE is_active = true AND (show_on_products = false OR show_on_products IS NULL)) AS active_checkout_codes
FROM discount_codes;

SELECT '---' AS separator;
SELECT 'Sample discounts by type:' AS info;
SELECT
  code,
  description,
  is_active,
  show_on_products,
  CASE
    WHEN show_on_products = true THEN '✅ Shows on product listings'
    ELSE '🔒 Checkout only (manual entry)'
  END AS visibility
FROM discount_codes
WHERE is_active = true
ORDER BY show_on_products DESC, created_at DESC
LIMIT 10;

SELECT '---' AS separator;
SELECT 'Test a product discount calculation (should only show product sale discounts):' AS info;
SELECT
  p.name,
  p.base_price,
  pd.has_discount,
  pd.discount_percentage,
  pd.discounted_price
FROM products p
CROSS JOIN LATERAL get_product_best_discount(p.id, p.category_id, p.base_price) pd
WHERE p.is_active = true
LIMIT 5;

SELECT '---' AS separator;
SELECT '✅ Functions updated! Only discounts with show_on_products=true will appear in product listings and filters.' AS status;