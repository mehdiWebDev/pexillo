-- Update database functions to respect show_on_products field
-- This ensures only discounts with show_on_products = true appear on product listings
-- Checkout codes (show_on_products = false) won't show on product cards

-- 1. Update get_product_best_discount to only include discounts with show_on_products = true
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
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE WHEN dc.id IS NOT NULL THEN true ELSE false END as has_discount,
    CASE
      WHEN dc.discount_type = 'percentage' THEN dc.discount_value::INTEGER
      WHEN dc.discount_type = 'fixed_amount' THEN ROUND((dc.discount_value / p_base_price) * 100)::INTEGER
      ELSE 0
    END as discount_percentage,
    CASE
      WHEN dc.discount_type = 'percentage' THEN p_base_price * (1 - dc.discount_value / 100)
      WHEN dc.discount_type = 'fixed_amount' THEN GREATEST(p_base_price - dc.discount_value, 0)
      ELSE p_base_price
    END as discounted_price,
    dc.discount_type,
    dc.discount_value
  FROM discount_codes dc
  WHERE dc.is_active = true
    AND dc.show_on_products = true  -- ADDED: Only show discounts meant for product listings
    AND dc.valid_from <= NOW()
    AND (dc.valid_until IS NULL OR dc.valid_until >= NOW())
    AND (
      dc.applicable_to = 'all'
      OR (dc.applicable_to = 'product' AND p_product_id = ANY(dc.applicable_ids))
      OR (dc.applicable_to = 'category' AND p_category_id = ANY(dc.applicable_ids))
    )
  ORDER BY dc.priority DESC, dc.discount_value DESC
  LIMIT 1;

  -- If no discount found, return default values
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, p_base_price, NULL::TEXT, NULL::NUMERIC;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. Update get_variant_discount to only include discounts with show_on_products = true
CREATE OR REPLACE FUNCTION get_variant_discount(
  p_variant_id UUID,
  p_product_id UUID,
  p_category_id UUID,
  p_variant_price NUMERIC
)
RETURNS TABLE (
  has_discount BOOLEAN,
  discount_percentage INTEGER,
  discounted_price NUMERIC,
  discount_type TEXT,
  discount_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE WHEN dc.id IS NOT NULL THEN true ELSE false END as has_discount,
    CASE
      WHEN dc.discount_type = 'percentage' THEN dc.discount_value::INTEGER
      WHEN dc.discount_type = 'fixed_amount' THEN ROUND((dc.discount_value / p_variant_price) * 100)::INTEGER
      ELSE 0
    END as discount_percentage,
    CASE
      WHEN dc.discount_type = 'percentage' THEN p_variant_price * (1 - dc.discount_value / 100)
      WHEN dc.discount_type = 'fixed_amount' THEN GREATEST(p_variant_price - dc.discount_value, 0)
      ELSE p_variant_price
    END as discounted_price,
    dc.discount_type,
    dc.discount_value
  FROM discount_codes dc
  WHERE dc.is_active = true
    AND dc.show_on_products = true  -- ADDED: Only show discounts meant for product listings
    AND dc.valid_from <= NOW()
    AND (dc.valid_until IS NULL OR dc.valid_until >= NOW())
    AND (
      dc.applicable_to = 'all'
      OR (dc.applicable_to = 'variant' AND p_variant_id = ANY(dc.applicable_ids))
      OR (dc.applicable_to = 'product' AND p_product_id = ANY(dc.applicable_ids))
      OR (dc.applicable_to = 'category' AND p_category_id = ANY(dc.applicable_ids))
    )
  ORDER BY dc.priority DESC, dc.discount_value DESC
  LIMIT 1;

  -- If no discount found, return default values
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, p_variant_price, NULL::TEXT, NULL::NUMERIC;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Update the on_sale_only filter in get_products_enhanced to check show_on_products
-- (This requires updating the main function but the key parts are shown here)
-- The on_sale_only filter should only consider discounts with show_on_products = true

-- Note: The get_products_enhanced function will automatically use the updated
-- get_product_best_discount and get_variant_discount functions, so the
-- main change needed is in the on_sale_only filter sections.

-- For the on_sale_only filter, update the EXISTS clause to include show_on_products check:
-- Replace all instances of this pattern in get_products_enhanced:
/*
  EXISTS (
    SELECT 1 FROM discount_codes dc
    WHERE dc.is_active = true
      AND dc.valid_from <= NOW()
      AND (dc.valid_until IS NULL OR dc.valid_until >= NOW())
*/
-- With:
/*
  EXISTS (
    SELECT 1 FROM discount_codes dc
    WHERE dc.is_active = true
      AND dc.show_on_products = true  -- ADDED
      AND dc.valid_from <= NOW()
      AND (dc.valid_until IS NULL OR dc.valid_until >= NOW())
*/

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_product_best_discount(UUID, UUID, NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_variant_discount(UUID, UUID, UUID, NUMERIC) TO authenticated, anon;

-- 4. Verify the changes
-- Test query to see discounts split by show_on_products
SELECT
  code,
  description,
  discount_type,
  discount_value,
  show_on_products,
  CASE
    WHEN show_on_products = true THEN 'Product Sale (shows on listings)'
    ELSE 'Checkout Code (manual entry only)'
  END as discount_category,
  is_active
FROM discount_codes
ORDER BY show_on_products DESC, created_at DESC;