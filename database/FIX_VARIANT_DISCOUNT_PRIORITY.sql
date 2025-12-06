-- Fix get_variant_discount to prioritize variant-specific discounts over general discounts
-- This ensures variant discounts are always returned first, regardless of priority field

-- Drop the existing function first
DROP FUNCTION IF EXISTS get_variant_discount(UUID, UUID, UUID, NUMERIC);

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
DECLARE
  v_discount RECORD;
BEGIN
  -- First, try to find a variant-specific discount
  SELECT * INTO v_discount
  FROM discount_codes dc
  WHERE dc.is_active = true
    AND dc.show_on_products = true
    AND dc.valid_from <= NOW()
    AND (dc.valid_until IS NULL OR dc.valid_until >= NOW())
    AND dc.applicable_to = 'variant'
    AND p_variant_id = ANY(dc.applicable_ids)
  ORDER BY dc.priority DESC, dc.discount_value DESC
  LIMIT 1;

  -- If variant-specific discount found, return it
  IF FOUND THEN
    RETURN QUERY
    SELECT
      true as has_discount,
      CASE
        WHEN v_discount.discount_type = 'percentage' THEN v_discount.discount_value::INTEGER
        WHEN v_discount.discount_type = 'fixed_amount' THEN ROUND((v_discount.discount_value / p_variant_price) * 100)::INTEGER
        ELSE 0
      END as discount_percentage,
      CASE
        WHEN v_discount.discount_type = 'percentage' THEN p_variant_price * (1 - v_discount.discount_value / 100)
        WHEN v_discount.discount_type = 'fixed_amount' THEN GREATEST(p_variant_price - v_discount.discount_value, 0)
        ELSE p_variant_price
      END as discounted_price,
      v_discount.discount_type,
      v_discount.discount_value;
    RETURN;
  END IF;

  -- If no variant-specific discount, try product/category/all discounts
  SELECT * INTO v_discount
  FROM discount_codes dc
  WHERE dc.is_active = true
    AND dc.show_on_products = true
    AND dc.valid_from <= NOW()
    AND (dc.valid_until IS NULL OR dc.valid_until >= NOW())
    AND (
      dc.applicable_to = 'all'
      OR (dc.applicable_to = 'product' AND p_product_id = ANY(dc.applicable_ids))
      OR (dc.applicable_to = 'category' AND p_category_id = ANY(dc.applicable_ids))
    )
  ORDER BY dc.priority DESC, dc.discount_value DESC
  LIMIT 1;

  -- If general discount found, return it
  IF FOUND THEN
    RETURN QUERY
    SELECT
      true as has_discount,
      CASE
        WHEN v_discount.discount_type = 'percentage' THEN v_discount.discount_value::INTEGER
        WHEN v_discount.discount_type = 'fixed_amount' THEN ROUND((v_discount.discount_value / p_variant_price) * 100)::INTEGER
        ELSE 0
      END as discount_percentage,
      CASE
        WHEN v_discount.discount_type = 'percentage' THEN p_variant_price * (1 - v_discount.discount_value / 100)
        WHEN v_discount.discount_type = 'fixed_amount' THEN GREATEST(p_variant_price - v_discount.discount_value, 0)
        ELSE p_variant_price
      END as discounted_price,
      v_discount.discount_type,
      v_discount.discount_value;
    RETURN;
  END IF;

  -- If no discount found, return default values
  RETURN QUERY SELECT false, 0, p_variant_price, NULL::TEXT, NULL::NUMERIC;
END;
$$ LANGUAGE plpgsql;
