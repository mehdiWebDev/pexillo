-- Function to get the best active discount for a variant
-- Returns the discount percentage and discounted price
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
  -- Priority order: variant-specific > product-specific > category-specific > all
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_variant_discount TO anon, authenticated;

COMMENT ON FUNCTION get_variant_discount IS 'Calculates the best active discount for a variant, considering variant-specific, product-specific, category-specific, and all-products discounts';
