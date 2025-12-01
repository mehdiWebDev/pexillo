-- SAFE VERSION: Fix Per User Limit and Minimum Items functionality
-- This adds the missing user_usage_limit and minimum_items checks to validate_discount_code

-- First, ensure the discount_usage table exists for tracking per-user usage
CREATE TABLE IF NOT EXISTS public.discount_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  discount_id UUID NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  amount_saved NUMERIC(10, 2),
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT discount_usage_unique UNIQUE(discount_id, order_id) -- Prevent duplicate entries for same order
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_discount_usage_user_discount
ON public.discount_usage(user_id, discount_id);

-- Enable RLS on discount_usage table
ALTER TABLE public.discount_usage ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate them
DROP POLICY IF EXISTS "Users can view their own discount usage" ON public.discount_usage;
DROP POLICY IF EXISTS "System can insert discount usage" ON public.discount_usage;

-- Create RLS policies for discount_usage
CREATE POLICY "Users can view their own discount usage" ON public.discount_usage
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert discount usage" ON public.discount_usage
  FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.discount_usage TO authenticated;
GRANT SELECT ON public.discount_usage TO anon;

-- Drop the existing validate_discount_code function (if it exists) to avoid signature conflicts
DROP FUNCTION IF EXISTS public.validate_discount_code(TEXT, UUID, NUMERIC, UUID[], UUID[], UUID[]);

-- Now update the validate_discount_code function to check user_usage_limit and minimum_items
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
  RAISE NOTICE '🔍 Validating discount code: % for user: % with cart total: % and items: %',
    p_code, COALESCE(p_user_id::TEXT, 'guest'), p_cart_total, p_cart_items_count;

  -- Get the discount code
  SELECT * INTO v_discount
  FROM public.discount_codes
  WHERE UPPER(code) = UPPER(p_code)
  LIMIT 1;

  -- Check if discount exists
  IF v_discount.id IS NULL THEN
    RAISE NOTICE '❌ FAILED: Discount code "%" does not exist', p_code;
    RETURN QUERY SELECT
      false,
      NULL::UUID,
      NULL::TEXT,
      NULL::NUMERIC,
      NULL::NUMERIC,
      false,
      'Invalid discount code'::TEXT;
    RETURN;
  END IF;

  RAISE NOTICE '✓ Discount found: % (ID: %)', v_discount.code, v_discount.id;

  -- Check if discount is active
  IF NOT v_discount.is_active THEN
    RAISE NOTICE '❌ FAILED: Discount is not active (is_active = false)';
    RETURN QUERY SELECT
      false,
      v_discount.id,
      v_discount.discount_type,
      v_discount.discount_value,
      v_discount.maximum_discount,
      COALESCE(v_discount.stackable, false),
      'Discount code is not active'::TEXT;
    RETURN;
  END IF;
  RAISE NOTICE '✓ Discount is active';

  -- Check validity dates
  IF v_discount.valid_from > NOW() OR (v_discount.valid_until IS NOT NULL AND v_discount.valid_until < NOW()) THEN
    RAISE NOTICE '❌ FAILED: Date validation failed (valid_from: %, valid_until: %, now: %)',
      v_discount.valid_from, v_discount.valid_until, NOW();
    RETURN QUERY SELECT
      false,
      v_discount.id,
      v_discount.discount_type,
      v_discount.discount_value,
      v_discount.maximum_discount,
      COALESCE(v_discount.stackable, false),
      'Discount code has expired or is not yet valid'::TEXT;
    RETURN;
  END IF;
  RAISE NOTICE '✓ Date validation passed';

  -- Check overall usage limit
  IF v_discount.usage_limit IS NOT NULL AND v_discount.usage_count >= v_discount.usage_limit THEN
    RAISE NOTICE '❌ FAILED: Usage limit reached (used: %/%, limit: %)',
      v_discount.usage_count, v_discount.usage_limit, v_discount.usage_limit;
    RETURN QUERY SELECT
      false,
      v_discount.id,
      v_discount.discount_type,
      v_discount.discount_value,
      v_discount.maximum_discount,
      COALESCE(v_discount.stackable, false),
      'Discount code usage limit reached'::TEXT;
    RETURN;
  END IF;
  RAISE NOTICE '✓ Overall usage limit check passed (used: %, limit: %)',
    COALESCE(v_discount.usage_count, 0), COALESCE(v_discount.usage_limit::TEXT, 'unlimited');

  -- Check per-user usage limit (NEW CHECK)
  IF v_discount.user_usage_limit IS NOT NULL AND p_user_id IS NOT NULL THEN
    -- Count how many times this user has used this discount
    SELECT COUNT(*) INTO v_user_usage_count
    FROM public.discount_usage du
    WHERE du.discount_id = v_discount.id
      AND du.user_id = p_user_id;

    RAISE NOTICE 'Checking per-user limit: user has used % times, limit is %',
      v_user_usage_count, v_discount.user_usage_limit;

    IF v_user_usage_count >= v_discount.user_usage_limit THEN
      RAISE NOTICE '❌ FAILED: Per-user limit reached (used: %/%, limit: %)',
        v_user_usage_count, v_discount.user_usage_limit, v_discount.user_usage_limit;
      RETURN QUERY SELECT
        false,
        v_discount.id,
        v_discount.discount_type,
        v_discount.discount_value,
        v_discount.maximum_discount,
        COALESCE(v_discount.stackable, false),
        FORMAT('You have already used this discount %s time(s). Maximum allowed: %s',
               v_user_usage_count, v_discount.user_usage_limit)::TEXT;
      RETURN;
    END IF;
    RAISE NOTICE '✓ Per-user limit check passed (used: %/%)',
      v_user_usage_count, v_discount.user_usage_limit;
  ELSE
    RAISE NOTICE '✓ No per-user limit or guest user (limit: %, user_id: %)',
      COALESCE(v_discount.user_usage_limit::TEXT, 'none'), COALESCE(p_user_id::TEXT, 'guest');
  END IF;

  -- Check first purchase requirement
  IF v_discount.first_purchase_only AND p_user_id IS NOT NULL THEN
    SELECT COUNT(*) = 0 INTO v_is_first_purchase
    FROM public.orders
    WHERE user_id = p_user_id
    AND payment_status IN ('completed', 'paid');  -- Only count completed orders

    RAISE NOTICE 'Checking first purchase: is_first = %, first_purchase_only = %',
      v_is_first_purchase, v_discount.first_purchase_only;

    IF NOT v_is_first_purchase THEN
      RAISE NOTICE '❌ FAILED: Not first purchase (user has completed orders)';
      RETURN QUERY SELECT
        false,
        v_discount.id,
        v_discount.discount_type,
        v_discount.discount_value,
        v_discount.maximum_discount,
        COALESCE(v_discount.stackable, false),
        'This discount is only for first-time customers'::TEXT;
      RETURN;
    END IF;
    RAISE NOTICE '✓ First purchase check passed';
  ELSE
    RAISE NOTICE '✓ Not a first-purchase-only discount';
  END IF;

  -- Check minimum purchase requirement
  IF v_discount.minimum_purchase > 0 AND p_cart_total < v_discount.minimum_purchase THEN
    RAISE NOTICE '❌ FAILED: Minimum purchase not met (cart: $%, required: $%)',
      p_cart_total, v_discount.minimum_purchase;
    RETURN QUERY SELECT
      false,
      v_discount.id,
      v_discount.discount_type,
      v_discount.discount_value,
      v_discount.maximum_discount,
      COALESCE(v_discount.stackable, false),
      FORMAT('Minimum purchase of $%s required', v_discount.minimum_purchase)::TEXT;
    RETURN;
  END IF;
  RAISE NOTICE '✓ Minimum purchase check passed (cart: $%, required: $%)',
    p_cart_total, COALESCE(v_discount.minimum_purchase, 0);

  -- Check minimum items requirement (NEW CHECK)
  IF v_discount.minimum_items IS NOT NULL AND v_discount.minimum_items > 0 THEN
    IF p_cart_items_count < v_discount.minimum_items THEN
      RAISE NOTICE '❌ FAILED: Minimum items not met (cart has: %, required: %)',
        p_cart_items_count, v_discount.minimum_items;
      RETURN QUERY SELECT
        false,
        v_discount.id,
        v_discount.discount_type,
        v_discount.discount_value,
        v_discount.maximum_discount,
        COALESCE(v_discount.stackable, false),
        FORMAT('Minimum %s item(s) required in cart. You have %s item(s)',
               v_discount.minimum_items, p_cart_items_count)::TEXT;
      RETURN;
    END IF;
    RAISE NOTICE '✓ Minimum items check passed (cart has: %/%, required: %)',
      p_cart_items_count, v_discount.minimum_items, v_discount.minimum_items;
  ELSE
    RAISE NOTICE '✓ No minimum items requirement';
  END IF;

  -- Check applicable products/variants/categories
  IF v_discount.applicable_to = 'product' AND v_discount.applicable_ids IS NOT NULL THEN
    IF p_product_ids IS NULL OR NOT (v_discount.applicable_ids && p_product_ids) THEN
      RAISE NOTICE '❌ FAILED: Product applicability check (discount products: %, cart products: %)',
        v_discount.applicable_ids, p_product_ids;
      RETURN QUERY SELECT
        false,
        v_discount.id,
        v_discount.discount_type,
        v_discount.discount_value,
        v_discount.maximum_discount,
        COALESCE(v_discount.stackable, false),
        'Discount not applicable to these products'::TEXT;
      RETURN;
    END IF;
    RAISE NOTICE '✓ Product applicability check passed';
  END IF;

  -- Check for variant-specific discounts
  IF v_discount.applicable_to = 'variant' AND v_discount.applicable_ids IS NOT NULL THEN
    IF p_variant_ids IS NULL OR NOT (v_discount.applicable_ids && p_variant_ids) THEN
      RAISE NOTICE '❌ FAILED: Variant applicability check (discount variants: %, cart variants: %)',
        v_discount.applicable_ids, p_variant_ids;
      RETURN QUERY SELECT
        false,
        v_discount.id,
        v_discount.discount_type,
        v_discount.discount_value,
        v_discount.maximum_discount,
        COALESCE(v_discount.stackable, false),
        'Discount not applicable to these product variants'::TEXT;
      RETURN;
    END IF;
    RAISE NOTICE '✓ Variant applicability check passed';
  END IF;

  IF v_discount.applicable_to = 'category' AND v_discount.applicable_ids IS NOT NULL THEN
    IF p_category_ids IS NULL OR NOT (v_discount.applicable_ids && p_category_ids) THEN
      RAISE NOTICE '❌ FAILED: Category applicability check (discount categories: %, cart categories: %)',
        v_discount.applicable_ids, p_category_ids;
      RETURN QUERY SELECT
        false,
        v_discount.id,
        v_discount.discount_type,
        v_discount.discount_value,
        v_discount.maximum_discount,
        COALESCE(v_discount.stackable, false),
        'Discount not applicable to these categories'::TEXT;
      RETURN;
    END IF;
    RAISE NOTICE '✓ Category applicability check passed';
  END IF;

  IF v_discount.applicable_to = 'all' THEN
    RAISE NOTICE '✓ Discount applies to all products';
  END IF;

  -- All validations passed
  RAISE NOTICE '✅ SUCCESS: All validation checks passed! Discount % is valid', v_discount.code;
  RETURN QUERY SELECT
    true,
    v_discount.id,
    v_discount.discount_type,
    v_discount.discount_value,
    v_discount.maximum_discount,
    COALESCE(v_discount.stackable, false),
    'Discount applied successfully'::TEXT;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION validate_discount_code TO anon, authenticated;

-- Update the record_discount_usage function to use the discount_usage table
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
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION record_discount_usage TO authenticated;

-- Test queries to verify the setup
-- Check if a user has used a discount:
-- SELECT COUNT(*) FROM discount_usage WHERE user_id = 'USER_ID' AND discount_id = 'DISCOUNT_ID';

-- See all usage for a specific discount:
-- SELECT
--   du.*,
--   p.email
-- FROM discount_usage du
-- JOIN profiles p ON p.id = du.user_id
-- WHERE discount_id = 'DISCOUNT_ID'
-- ORDER BY du.used_at DESC;

-- Update existing discounts to have reasonable per-user limits
-- For example, set WELCOME30 to 1 use per user:
UPDATE discount_codes
SET user_usage_limit = 1
WHERE code = 'WELCOME30' AND user_usage_limit IS NULL;

-- Set general promo codes to allow 3 uses per user:
UPDATE discount_codes
SET user_usage_limit = 3
WHERE first_purchase_only = false
  AND user_usage_limit IS NULL
  AND code IS NOT NULL;

-- Summary of what this fixes:
-- 1. Creates discount_usage table to track per-user usage
-- 2. Updates validate_discount_code to check user_usage_limit
-- 3. Adds minimum_items validation to ensure cart has enough items
-- 4. Shows detailed messages when limits are exceeded
-- 5. Updates record_discount_usage to properly track usage
-- 6. Sets reasonable defaults for existing discounts