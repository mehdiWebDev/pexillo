-- Update discount validation function to handle variant IDs
-- This migration updates the validate_discount_code function to accept variant IDs

-- Drop the existing function
DROP FUNCTION IF EXISTS validate_discount_code(TEXT, UUID, NUMERIC, UUID[], UUID[]);
DROP FUNCTION IF EXISTS validate_discount_code(TEXT, UUID, NUMERIC, UUID[], UUID[], UUID[]);

-- Create the updated function with variant support
CREATE OR REPLACE FUNCTION validate_discount_code(
  p_code TEXT,
  p_user_id UUID DEFAULT NULL,
  p_cart_total NUMERIC DEFAULT 0,
  p_product_ids UUID[] DEFAULT NULL,
  p_variant_ids UUID[] DEFAULT NULL,
  p_category_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  is_valid BOOLEAN,
  discount_id UUID,
  discount_type TEXT,
  discount_value NUMERIC,
  maximum_discount NUMERIC,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_discount RECORD;
  v_user_usage_count INTEGER;
  v_is_first_purchase BOOLEAN;
BEGIN
  -- Find the discount code (case-insensitive)
  SELECT * INTO v_discount
  FROM public.discount_codes
  WHERE UPPER(code) = UPPER(p_code)
  LIMIT 1;

  -- Check if discount exists
  IF v_discount.id IS NULL THEN
    RETURN QUERY SELECT
      false,
      NULL::UUID,
      NULL::TEXT,
      NULL::NUMERIC,
      NULL::NUMERIC,
      'Invalid discount code'::TEXT;
    RETURN;
  END IF;

  -- Check if discount is active
  IF NOT v_discount.is_active THEN
    RETURN QUERY SELECT
      false,
      v_discount.id,
      v_discount.discount_type,
      v_discount.discount_value,
      v_discount.maximum_discount,
      'Discount code is not active'::TEXT;
    RETURN;
  END IF;

  -- Check validity dates
  IF v_discount.valid_from > NOW() THEN
    RETURN QUERY SELECT
      false,
      v_discount.id,
      v_discount.discount_type,
      v_discount.discount_value,
      v_discount.maximum_discount,
      'Discount code is not yet valid'::TEXT;
    RETURN;
  END IF;

  IF v_discount.valid_until IS NOT NULL AND v_discount.valid_until < NOW() THEN
    RETURN QUERY SELECT
      false,
      v_discount.id,
      v_discount.discount_type,
      v_discount.discount_value,
      v_discount.maximum_discount,
      'Discount code has expired'::TEXT;
    RETURN;
  END IF;

  -- Check overall usage limit
  IF v_discount.usage_limit IS NOT NULL AND v_discount.usage_count >= v_discount.usage_limit THEN
    RETURN QUERY SELECT
      false,
      v_discount.id,
      v_discount.discount_type,
      v_discount.discount_value,
      v_discount.maximum_discount,
      'Discount code usage limit reached'::TEXT;
    RETURN;
  END IF;

  -- Check first purchase requirement
  IF v_discount.first_purchase_only AND p_user_id IS NOT NULL THEN
    SELECT COUNT(*) = 0 INTO v_is_first_purchase
    FROM public.orders
    WHERE user_id = p_user_id
    AND status NOT IN ('cancelled', 'refunded');

    IF NOT v_is_first_purchase THEN
      RETURN QUERY SELECT
        false,
        v_discount.id,
        v_discount.discount_type,
        v_discount.discount_value,
        v_discount.maximum_discount,
        'This discount is only for first-time customers'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Check minimum purchase requirement
  IF v_discount.minimum_purchase > 0 AND p_cart_total < v_discount.minimum_purchase THEN
    RETURN QUERY SELECT
      false,
      v_discount.id,
      v_discount.discount_type,
      v_discount.discount_value,
      v_discount.maximum_discount,
      FORMAT('Minimum purchase of $%s required', v_discount.minimum_purchase)::TEXT;
    RETURN;
  END IF;

  -- Check applicable products/variants/categories
  IF v_discount.applicable_to = 'product' AND v_discount.applicable_ids IS NOT NULL THEN
    IF p_product_ids IS NULL OR NOT (v_discount.applicable_ids && p_product_ids) THEN
      RETURN QUERY SELECT
        false,
        v_discount.id,
        v_discount.discount_type,
        v_discount.discount_value,
        v_discount.maximum_discount,
        'Discount not applicable to these products'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Check for variant-specific discounts
  IF v_discount.applicable_to = 'variant' AND v_discount.applicable_ids IS NOT NULL THEN
    IF p_variant_ids IS NULL OR NOT (v_discount.applicable_ids && p_variant_ids) THEN
      RETURN QUERY SELECT
        false,
        v_discount.id,
        v_discount.discount_type,
        v_discount.discount_value,
        v_discount.maximum_discount,
        'Discount not applicable to these product variants'::TEXT;
      RETURN;
    END IF;
  END IF;

  IF v_discount.applicable_to = 'category' AND v_discount.applicable_ids IS NOT NULL THEN
    IF p_category_ids IS NULL OR NOT (v_discount.applicable_ids && p_category_ids) THEN
      RETURN QUERY SELECT
        false,
        v_discount.id,
        v_discount.discount_type,
        v_discount.discount_value,
        v_discount.maximum_discount,
        'Discount not applicable to these categories'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- All validations passed
  RETURN QUERY SELECT
    true,
    v_discount.id,
    v_discount.discount_type,
    v_discount.discount_value,
    v_discount.maximum_discount,
    'Discount applied successfully'::TEXT;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION validate_discount_code TO anon, authenticated;

-- Also update the check_first_purchase_logic constraint to include variant
ALTER TABLE public.discount_codes
DROP CONSTRAINT IF EXISTS check_first_purchase_logic;

ALTER TABLE public.discount_codes
ADD CONSTRAINT check_first_purchase_logic
CHECK (
    (first_purchase_only = false)
    OR (
        (first_purchase_only = true)
        AND (
            applicable_to = ANY (
                ARRAY['all'::text, 'category'::text, 'product'::text, 'variant'::text]
            )
        )
    )
);