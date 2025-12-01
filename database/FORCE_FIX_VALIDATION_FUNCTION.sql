-- FORCE UPDATE THE VALIDATION FUNCTION
-- The function exists but isn't checking per-user limits properly

-- First, completely drop the old function
DROP FUNCTION IF EXISTS public.validate_discount_code CASCADE;

-- Now recreate it with the CORRECT per-user limit check
CREATE OR REPLACE FUNCTION public.validate_discount_code(
  p_code TEXT,
  p_user_id UUID DEFAULT NULL,
  p_cart_total NUMERIC DEFAULT 0,
  p_product_ids UUID[] DEFAULT NULL,
  p_variant_ids UUID[] DEFAULT NULL,
  p_category_ids UUID[] DEFAULT NULL,
  p_cart_items_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  is_valid BOOLEAN,
  discount_id UUID,
  discount_type TEXT,
  discount_value NUMERIC,
  maximum_discount NUMERIC,
  stackable BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_discount RECORD;
  v_is_first_purchase BOOLEAN;
  v_user_usage_count INTEGER;
BEGIN
  -- Get the discount code
  SELECT * INTO v_discount
  FROM public.discount_codes
  WHERE UPPER(code) = UPPER(p_code)
  LIMIT 1;

  -- Check if discount exists
  IF v_discount.id IS NULL THEN
    RETURN QUERY SELECT
      false, NULL::UUID, NULL::TEXT, NULL::NUMERIC,
      NULL::NUMERIC, false, 'Invalid discount code'::TEXT;
    RETURN;
  END IF;

  -- Check if discount is active
  IF NOT v_discount.is_active THEN
    RETURN QUERY SELECT
      false, v_discount.id, v_discount.discount_type, v_discount.discount_value,
      v_discount.maximum_discount, COALESCE(v_discount.stackable, false),
      'Discount code is not active'::TEXT;
    RETURN;
  END IF;

  -- Check validity dates
  IF v_discount.valid_from > NOW() OR (v_discount.valid_until IS NOT NULL AND v_discount.valid_until < NOW()) THEN
    RETURN QUERY SELECT
      false, v_discount.id, v_discount.discount_type, v_discount.discount_value,
      v_discount.maximum_discount, COALESCE(v_discount.stackable, false),
      'Discount code has expired or is not yet valid'::TEXT;
    RETURN;
  END IF;

  -- Check overall usage limit
  IF v_discount.usage_limit IS NOT NULL AND COALESCE(v_discount.usage_count, 0) >= v_discount.usage_limit THEN
    RETURN QUERY SELECT
      false, v_discount.id, v_discount.discount_type, v_discount.discount_value,
      v_discount.maximum_discount, COALESCE(v_discount.stackable, false),
      'Discount code usage limit reached'::TEXT;
    RETURN;
  END IF;

  -- ⭐⭐⭐ CRITICAL FIX: Check per-user usage limit ⭐⭐⭐
  IF v_discount.user_usage_limit IS NOT NULL THEN
    -- User must be logged in for per-user limited discounts
    IF p_user_id IS NULL THEN
      RETURN QUERY SELECT
        false, v_discount.id, v_discount.discount_type, v_discount.discount_value,
        v_discount.maximum_discount, COALESCE(v_discount.stackable, false),
        'Please log in to use this discount code'::TEXT;
      RETURN;
    END IF;

    -- Count how many times this specific user has used this specific discount
    SELECT COUNT(*) INTO v_user_usage_count
    FROM public.discount_usage du
    WHERE du.discount_id = v_discount.id
      AND du.user_id = p_user_id;

    -- Check if user has exceeded their limit
    IF v_user_usage_count >= v_discount.user_usage_limit THEN
      RETURN QUERY SELECT
        false, v_discount.id, v_discount.discount_type, v_discount.discount_value,
        v_discount.maximum_discount, COALESCE(v_discount.stackable, false),
        FORMAT('You have already used this discount %s time(s). Maximum allowed: %s',
               v_user_usage_count, v_discount.user_usage_limit)::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Check first purchase requirement
  IF v_discount.first_purchase_only AND p_user_id IS NOT NULL THEN
    SELECT COUNT(*) = 0 INTO v_is_first_purchase
    FROM public.orders
    WHERE user_id = p_user_id
    AND payment_status IN ('completed', 'paid');

    IF NOT v_is_first_purchase THEN
      RETURN QUERY SELECT
        false, v_discount.id, v_discount.discount_type, v_discount.discount_value,
        v_discount.maximum_discount, COALESCE(v_discount.stackable, false),
        'This discount is only for first-time customers'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Check minimum purchase requirement
  IF v_discount.minimum_purchase > 0 AND p_cart_total < v_discount.minimum_purchase THEN
    RETURN QUERY SELECT
      false, v_discount.id, v_discount.discount_type, v_discount.discount_value,
      v_discount.maximum_discount, COALESCE(v_discount.stackable, false),
      FORMAT('Minimum purchase of $%s required', v_discount.minimum_purchase)::TEXT;
    RETURN;
  END IF;

  -- Check minimum items requirement
  IF v_discount.minimum_items IS NOT NULL AND v_discount.minimum_items > 0 THEN
    IF p_cart_items_count < v_discount.minimum_items THEN
      RETURN QUERY SELECT
        false, v_discount.id, v_discount.discount_type, v_discount.discount_value,
        v_discount.maximum_discount, COALESCE(v_discount.stackable, false),
        FORMAT('Minimum %s item(s) required in cart. You have %s item(s)',
               v_discount.minimum_items, p_cart_items_count)::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Check applicable products/variants/categories
  IF v_discount.applicable_to = 'product' AND v_discount.applicable_ids IS NOT NULL THEN
    IF p_product_ids IS NULL OR NOT (v_discount.applicable_ids && p_product_ids) THEN
      RETURN QUERY SELECT
        false, v_discount.id, v_discount.discount_type, v_discount.discount_value,
        v_discount.maximum_discount, COALESCE(v_discount.stackable, false),
        'Discount not applicable to these products'::TEXT;
      RETURN;
    END IF;
  END IF;

  IF v_discount.applicable_to = 'variant' AND v_discount.applicable_ids IS NOT NULL THEN
    IF p_variant_ids IS NULL OR NOT (v_discount.applicable_ids && p_variant_ids) THEN
      RETURN QUERY SELECT
        false, v_discount.id, v_discount.discount_type, v_discount.discount_value,
        v_discount.maximum_discount, COALESCE(v_discount.stackable, false),
        'Discount not applicable to these product variants'::TEXT;
      RETURN;
    END IF;
  END IF;

  IF v_discount.applicable_to = 'category' AND v_discount.applicable_ids IS NOT NULL THEN
    IF p_category_ids IS NULL OR NOT (v_discount.applicable_ids && p_category_ids) THEN
      RETURN QUERY SELECT
        false, v_discount.id, v_discount.discount_type, v_discount.discount_value,
        v_discount.maximum_discount, COALESCE(v_discount.stackable, false),
        'Discount not applicable to these categories'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- All validations passed
  RETURN QUERY SELECT
    true, v_discount.id, v_discount.discount_type, v_discount.discount_value,
    v_discount.maximum_discount, COALESCE(v_discount.stackable, false),
    'Discount applied successfully'::TEXT;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION validate_discount_code TO anon, authenticated;

-- Now test it immediately
SELECT '---' as "=====";
SELECT 'Testing TESTLIMIT for user 9fffa8d9-bd50-493e-ba46-349e40899155:' as info;

-- First show how many times they've used it
SELECT
    'Current usage count' as check,
    COUNT(*) as times_used,
    (SELECT user_usage_limit FROM discount_codes WHERE code = 'TESTLIMIT') as limit
FROM discount_usage du
JOIN discount_codes dc ON dc.id = du.discount_id
WHERE dc.code = 'TESTLIMIT'
AND du.user_id = '9fffa8d9-bd50-493e-ba46-349e40899155';

-- Now test the validation (should FAIL if they've already used it)
SELECT '---' as "=====";
SELECT 'Validation result (should be false if already used):' as info;
SELECT * FROM validate_discount_code(
    'TESTLIMIT',
    '9fffa8d9-bd50-493e-ba46-349e40899155'::uuid,
    50.00,
    NULL,
    NULL,
    NULL,
    1
);

-- Also test ALL20%
SELECT '---' as "=====";
SELECT 'Testing ALL20% for same user:' as info;
SELECT * FROM validate_discount_code(
    'ALL20%',
    '9fffa8d9-bd50-493e-ba46-349e40899155'::uuid,
    100.00,
    NULL,
    NULL,
    NULL,
    1
);

SELECT '---' as "=====";
SELECT '✅ Function has been FORCE updated. Test applying discounts now!' as status;