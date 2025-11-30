-- =============================================
-- FIX: Products not showing - Missing get_product_best_discount function
-- Run this in Supabase SQL Editor to fix product listing
-- =============================================

-- 1. Drop existing function first (it has a different signature)
DROP FUNCTION IF EXISTS get_product_best_discount(UUID, UUID, DECIMAL);
DROP FUNCTION IF EXISTS get_product_best_discount(UUID, UUID, NUMERIC);

-- 2. Create the function with correct signature
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_product_best_discount(UUID, UUID, NUMERIC) TO authenticated, anon;

-- 3. Test the function
SELECT * FROM get_product_best_discount(
  '00000000-0000-0000-0000-000000000000'::UUID,
  '00000000-0000-0000-0000-000000000000'::UUID,
  100.00
);

-- 4. Verify get_products_enhanced still works
SELECT id, name, slug, base_price, has_discount, discount_percentage
FROM get_products_enhanced()
LIMIT 5;
