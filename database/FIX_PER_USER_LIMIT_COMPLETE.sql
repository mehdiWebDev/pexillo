-- COMPLETE FIX FOR PER-USER LIMIT VALIDATION
-- This ensures per-user limits are properly enforced

-- Step 1: Ensure discount_usage table exists with correct structure
CREATE TABLE IF NOT EXISTS public.discount_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  discount_id UUID NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  amount_saved NUMERIC(10, 2),
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT discount_usage_unique UNIQUE(discount_id, order_id)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_discount_usage_user_discount
ON public.discount_usage(user_id, discount_id);

CREATE INDEX IF NOT EXISTS idx_discount_usage_discount
ON public.discount_usage(discount_id);

-- Enable RLS
ALTER TABLE public.discount_usage ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate
DROP POLICY IF EXISTS "Users can view their own discount usage" ON public.discount_usage;
DROP POLICY IF EXISTS "System can insert discount usage" ON public.discount_usage;

CREATE POLICY "Users can view their own discount usage" ON public.discount_usage
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert discount usage" ON public.discount_usage
  FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.discount_usage TO authenticated;
GRANT SELECT ON public.discount_usage TO anon;

-- Step 2: Drop and recreate the validate_discount_code function with ALL checks
DROP FUNCTION IF EXISTS public.validate_discount_code(TEXT, UUID, NUMERIC, UUID[], UUID[], UUID[]);
DROP FUNCTION IF EXISTS public.validate_discount_code(TEXT, UUID, NUMERIC, UUID[], UUID[], UUID[], INTEGER);

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
AS $$
DECLARE
  v_discount RECORD;
  v_is_first_purchase BOOLEAN;
  v_user_usage_count INTEGER;
BEGIN
  -- Log the validation attempt
  RAISE NOTICE '🔍 Validating discount code: % for user: %', p_code, COALESCE(p_user_id::TEXT, 'guest');

  -- Get the discount code
  SELECT * INTO v_discount
  FROM public.discount_codes
  WHERE UPPER(code) = UPPER(p_code)
  LIMIT 1;

  -- Check if discount exists
  IF v_discount.id IS NULL THEN
    RAISE NOTICE '❌ Discount code "%" does not exist', p_code;
    RETURN QUERY SELECT
      false, NULL::UUID, NULL::TEXT, NULL::NUMERIC,
      NULL::NUMERIC, false, 'Invalid discount code'::TEXT;
    RETURN;
  END IF;

  RAISE NOTICE '✓ Found discount: % (ID: %)', v_discount.code, v_discount.id;

  -- Check if discount is active
  IF NOT v_discount.is_active THEN
    RAISE NOTICE '❌ Discount is not active';
    RETURN QUERY SELECT
      false, v_discount.id, v_discount.discount_type, v_discount.discount_value,
      v_discount.maximum_discount, COALESCE(v_discount.stackable, false),
      'Discount code is not active'::TEXT;
    RETURN;
  END IF;

  -- Check validity dates
  IF v_discount.valid_from > NOW() OR (v_discount.valid_until IS NOT NULL AND v_discount.valid_until < NOW()) THEN
    RAISE NOTICE '❌ Date validation failed';
    RETURN QUERY SELECT
      false, v_discount.id, v_discount.discount_type, v_discount.discount_value,
      v_discount.maximum_discount, COALESCE(v_discount.stackable, false),
      'Discount code has expired or is not yet valid'::TEXT;
    RETURN;
  END IF;

  -- Check overall usage limit
  IF v_discount.usage_limit IS NOT NULL AND COALESCE(v_discount.usage_count, 0) >= v_discount.usage_limit THEN
    RAISE NOTICE '❌ Overall usage limit reached';
    RETURN QUERY SELECT
      false, v_discount.id, v_discount.discount_type, v_discount.discount_value,
      v_discount.maximum_discount, COALESCE(v_discount.stackable, false),
      'Discount code usage limit reached'::TEXT;
    RETURN;
  END IF;

  -- ⭐ CRITICAL: Check per-user usage limit
  IF v_discount.user_usage_limit IS NOT NULL AND p_user_id IS NOT NULL THEN
    -- Count how many times this user has used this discount
    SELECT COUNT(*) INTO v_user_usage_count
    FROM public.discount_usage du
    WHERE du.discount_id = v_discount.id
      AND du.user_id = p_user_id;

    RAISE NOTICE '📊 Per-user check: User % has used discount % times, limit is %',
      p_user_id, v_user_usage_count, v_discount.user_usage_limit;

    IF v_user_usage_count >= v_discount.user_usage_limit THEN
      RAISE NOTICE '❌ Per-user limit exceeded! Used: %, Limit: %',
        v_user_usage_count, v_discount.user_usage_limit;
      RETURN QUERY SELECT
        false, v_discount.id, v_discount.discount_type, v_discount.discount_value,
        v_discount.maximum_discount, COALESCE(v_discount.stackable, false),
        FORMAT('You have already used this discount %s time(s). Maximum allowed: %s',
               v_user_usage_count, v_discount.user_usage_limit)::TEXT;
      RETURN;
    END IF;
    RAISE NOTICE '✓ Per-user limit OK: %/%', v_user_usage_count, v_discount.user_usage_limit;
  ELSE
    IF v_discount.user_usage_limit IS NOT NULL AND p_user_id IS NULL THEN
      RAISE NOTICE '⚠️ User not logged in but discount has per-user limit';
      RETURN QUERY SELECT
        false, v_discount.id, v_discount.discount_type, v_discount.discount_value,
        v_discount.maximum_discount, COALESCE(v_discount.stackable, false),
        'Please log in to use this discount code'::TEXT;
      RETURN;
    END IF;
    RAISE NOTICE '✓ No per-user limit or no limit set';
  END IF;

  -- Check first purchase requirement
  IF v_discount.first_purchase_only AND p_user_id IS NOT NULL THEN
    SELECT COUNT(*) = 0 INTO v_is_first_purchase
    FROM public.orders
    WHERE user_id = p_user_id
    AND payment_status IN ('completed', 'paid');

    IF NOT v_is_first_purchase THEN
      RAISE NOTICE '❌ Not first purchase';
      RETURN QUERY SELECT
        false, v_discount.id, v_discount.discount_type, v_discount.discount_value,
        v_discount.maximum_discount, COALESCE(v_discount.stackable, false),
        'This discount is only for first-time customers'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Check minimum purchase requirement
  IF v_discount.minimum_purchase > 0 AND p_cart_total < v_discount.minimum_purchase THEN
    RAISE NOTICE '❌ Minimum purchase not met';
    RETURN QUERY SELECT
      false, v_discount.id, v_discount.discount_type, v_discount.discount_value,
      v_discount.maximum_discount, COALESCE(v_discount.stackable, false),
      FORMAT('Minimum purchase of $%s required', v_discount.minimum_purchase)::TEXT;
    RETURN;
  END IF;

  -- Check minimum items requirement
  IF v_discount.minimum_items IS NOT NULL AND v_discount.minimum_items > 0 THEN
    IF p_cart_items_count < v_discount.minimum_items THEN
      RAISE NOTICE '❌ Minimum items not met';
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
      RAISE NOTICE '❌ Product applicability failed';
      RETURN QUERY SELECT
        false, v_discount.id, v_discount.discount_type, v_discount.discount_value,
        v_discount.maximum_discount, COALESCE(v_discount.stackable, false),
        'Discount not applicable to these products'::TEXT;
      RETURN;
    END IF;
  END IF;

  IF v_discount.applicable_to = 'variant' AND v_discount.applicable_ids IS NOT NULL THEN
    IF p_variant_ids IS NULL OR NOT (v_discount.applicable_ids && p_variant_ids) THEN
      RAISE NOTICE '❌ Variant applicability failed';
      RETURN QUERY SELECT
        false, v_discount.id, v_discount.discount_type, v_discount.discount_value,
        v_discount.maximum_discount, COALESCE(v_discount.stackable, false),
        'Discount not applicable to these product variants'::TEXT;
      RETURN;
    END IF;
  END IF;

  IF v_discount.applicable_to = 'category' AND v_discount.applicable_ids IS NOT NULL THEN
    IF p_category_ids IS NULL OR NOT (v_discount.applicable_ids && p_category_ids) THEN
      RAISE NOTICE '❌ Category applicability failed';
      RETURN QUERY SELECT
        false, v_discount.id, v_discount.discount_type, v_discount.discount_value,
        v_discount.maximum_discount, COALESCE(v_discount.stackable, false),
        'Discount not applicable to these categories'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- All validations passed
  RAISE NOTICE '✅ All validations passed for discount %', v_discount.code;
  RETURN QUERY SELECT
    true, v_discount.id, v_discount.discount_type, v_discount.discount_value,
    v_discount.maximum_discount, COALESCE(v_discount.stackable, false),
    'Discount applied successfully'::TEXT;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION validate_discount_code TO anon, authenticated;

-- Step 3: Create or replace the record_discount_usage function
CREATE OR REPLACE FUNCTION public.record_discount_usage(
  p_discount_id UUID,
  p_user_id UUID,
  p_order_id UUID,
  p_amount_saved NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert into discount_usage table
  INSERT INTO public.discount_usage (
    discount_id,
    user_id,
    order_id,
    amount_saved,
    used_at
  ) VALUES (
    p_discount_id,
    p_user_id,
    p_order_id,
    p_amount_saved,
    NOW()
  )
  ON CONFLICT (discount_id, order_id) DO NOTHING;

  -- Also update the usage_count in discount_codes
  UPDATE public.discount_codes
  SET usage_count = COALESCE(usage_count, 0) + 1
  WHERE id = p_discount_id;

  RAISE NOTICE '✅ Recorded discount usage for user % on order %', p_user_id, p_order_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION record_discount_usage TO authenticated;

-- Step 4: Test the validation with a test discount
-- Create a test discount with per-user limit of 1
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM discount_codes WHERE code = 'TESTLIMIT') THEN
    INSERT INTO discount_codes (
      code, description, discount_type, discount_value,
      user_usage_limit, is_active, valid_from
    ) VALUES (
      'TESTLIMIT', 'Test Per-User Limit', 'percentage', 10,
      1, true, NOW()
    );
    RAISE NOTICE 'Created test discount code TESTLIMIT with per-user limit of 1';
  END IF;
END $$;

-- Step 5: Verification queries
SELECT '---' as "=====";
SELECT 'VERIFICATION RESULTS:' as info;

-- Check function signature
SELECT
    'Function signature' as check_type,
    CASE
        WHEN pg_get_function_arguments(p.oid) LIKE '%p_cart_items_count%'
        THEN '✅ Has cart items parameter'
        ELSE '❌ Missing cart items parameter'
    END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'validate_discount_code'
AND n.nspname = 'public';

-- Check if function has per-user limit logic
SELECT
    'Per-user limit check' as check_type,
    CASE
        WHEN pg_get_functiondef(oid) LIKE '%user_usage_limit%'
        THEN '✅ Has per-user limit validation'
        ELSE '❌ Missing per-user limit validation'
    END as status
FROM pg_proc
WHERE proname = 'validate_discount_code'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Check discount_usage table
SELECT
    'Discount usage table' as check_type,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'discount_usage')
        THEN '✅ Table exists'
        ELSE '❌ Table missing'
    END as status;

-- Show discounts with per-user limits
SELECT '---' as "=====";
SELECT 'Discounts with per-user limits:' as info;
SELECT
    code,
    user_usage_limit,
    usage_count,
    is_active
FROM discount_codes
WHERE user_usage_limit IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- Manual test instructions
SELECT '---' as "=====";
SELECT 'TEST INSTRUCTIONS:' as info;
SELECT '1. Try code TESTLIMIT - should work first time' as step;
SELECT '2. Complete the order' as step;
SELECT '3. Try TESTLIMIT again - should be rejected with per-user limit message' as step;