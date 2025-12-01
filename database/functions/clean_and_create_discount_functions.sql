-- Clean up ALL existing discount functions and recreate them
-- This script drops all possible versions of the functions

-- First, find and drop all versions of the functions
DO $$
DECLARE
    _sql text;
BEGIN
    -- Drop all versions of validate_discount_code
    FOR _sql IN
        SELECT 'DROP FUNCTION IF EXISTS ' || ns.nspname || '.' || proname || '(' || oidvectortypes(proargtypes) || ');'
        FROM pg_proc
        INNER JOIN pg_namespace ns ON (pg_proc.pronamespace = ns.oid)
        WHERE proname = 'validate_discount_code'
        AND ns.nspname = 'public'
    LOOP
        EXECUTE _sql;
    END LOOP;

    -- Drop all versions of calculate_discount_amount
    FOR _sql IN
        SELECT 'DROP FUNCTION IF EXISTS ' || ns.nspname || '.' || proname || '(' || oidvectortypes(proargtypes) || ');'
        FROM pg_proc
        INNER JOIN pg_namespace ns ON (pg_proc.pronamespace = ns.oid)
        WHERE proname = 'calculate_discount_amount'
        AND ns.nspname = 'public'
    LOOP
        EXECUTE _sql;
    END LOOP;

    -- Drop all versions of get_auto_apply_discounts
    FOR _sql IN
        SELECT 'DROP FUNCTION IF EXISTS ' || ns.nspname || '.' || proname || '(' || oidvectortypes(proargtypes) || ');'
        FROM pg_proc
        INNER JOIN pg_namespace ns ON (pg_proc.pronamespace = ns.oid)
        WHERE proname = 'get_auto_apply_discounts'
        AND ns.nspname = 'public'
    LOOP
        EXECUTE _sql;
    END LOOP;

    -- Drop all versions of record_discount_usage
    FOR _sql IN
        SELECT 'DROP FUNCTION IF EXISTS ' || ns.nspname || '.' || proname || '(' || oidvectortypes(proargtypes) || ');'
        FROM pg_proc
        INNER JOIN pg_namespace ns ON (pg_proc.pronamespace = ns.oid)
        WHERE proname = 'record_discount_usage'
        AND ns.nspname = 'public'
    LOOP
        EXECUTE _sql;
    END LOOP;

    -- Drop all versions of get_discount_statistics
    FOR _sql IN
        SELECT 'DROP FUNCTION IF EXISTS ' || ns.nspname || '.' || proname || '(' || oidvectortypes(proargtypes) || ');'
        FROM pg_proc
        INNER JOIN pg_namespace ns ON (pg_proc.pronamespace = ns.oid)
        WHERE proname = 'get_discount_statistics'
        AND ns.nspname = 'public'
    LOOP
        EXECUTE _sql;
    END LOOP;
END $$;

-- Now create the discount_usage table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.discount_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  discount_id UUID REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  amount_saved NUMERIC(10, 2) NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT discount_usage_unique UNIQUE (discount_id, order_id)
);

-- Create indexes for discount_usage if they don't exist
CREATE INDEX IF NOT EXISTS idx_discount_usage_user
  ON public.discount_usage (user_id, discount_id);

CREATE INDEX IF NOT EXISTS idx_discount_usage_discount
  ON public.discount_usage (discount_id);

-- Now create the functions fresh

-- Function to validate a discount code
CREATE FUNCTION validate_discount_code(
  p_code TEXT,
  p_user_id UUID DEFAULT NULL,
  p_cart_total NUMERIC DEFAULT 0,
  p_product_ids UUID[] DEFAULT NULL,
  p_category_ids UUID[] DEFAULT NULL
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
      false,
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
      COALESCE(v_discount.stackable, false),
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
      COALESCE(v_discount.stackable, false),
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
      COALESCE(v_discount.stackable, false),
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
      COALESCE(v_discount.stackable, false),
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
        COALESCE(v_discount.stackable, false),
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
      COALESCE(v_discount.stackable, false),
      FORMAT('Minimum purchase of $%s required', v_discount.minimum_purchase)::TEXT;
    RETURN;
  END IF;

  -- Check applicable products/categories
  IF v_discount.applicable_to = 'product' AND v_discount.applicable_ids IS NOT NULL THEN
    IF p_product_ids IS NULL OR NOT (v_discount.applicable_ids && p_product_ids) THEN
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
  END IF;

  IF v_discount.applicable_to = 'category' AND v_discount.applicable_ids IS NOT NULL THEN
    IF p_category_ids IS NULL OR NOT (v_discount.applicable_ids && p_category_ids) THEN
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
  END IF;

  -- All validations passed
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

-- Function to calculate discount amount
CREATE FUNCTION calculate_discount_amount(
  p_discount_id UUID,
  p_subtotal NUMERIC,
  p_product_totals JSONB DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  v_discount RECORD;
  v_applicable_total NUMERIC := 0;
  v_discount_amount NUMERIC := 0;
  v_product JSONB;
BEGIN
  -- Get discount details
  SELECT * INTO v_discount
  FROM public.discount_codes
  WHERE id = p_discount_id;

  IF v_discount.id IS NULL THEN
    RETURN 0;
  END IF;

  -- Calculate applicable total based on discount scope
  IF v_discount.applicable_to = 'all' THEN
    v_applicable_total := p_subtotal;
  ELSIF v_discount.applicable_to = 'product' AND p_product_totals IS NOT NULL THEN
    -- Sum only applicable products
    FOR v_product IN SELECT * FROM jsonb_array_elements(p_product_totals)
    LOOP
      IF v_discount.applicable_ids @> ARRAY[(v_product->>'product_id')::UUID] THEN
        v_applicable_total := v_applicable_total + (v_product->>'total')::NUMERIC;
      END IF;
    END LOOP;
  ELSE
    v_applicable_total := p_subtotal; -- Default to full subtotal
  END IF;

  -- Calculate discount based on type
  IF v_discount.discount_type = 'percentage' THEN
    v_discount_amount := v_applicable_total * (v_discount.discount_value / 100);
  ELSIF v_discount.discount_type = 'fixed_amount' THEN
    v_discount_amount := LEAST(v_discount.discount_value, v_applicable_total);
  ELSIF v_discount.discount_type = 'free_shipping' THEN
    -- This would be handled separately in the checkout process
    v_discount_amount := 0;
  END IF;

  -- Apply maximum discount limit if set
  IF v_discount.maximum_discount IS NOT NULL THEN
    v_discount_amount := LEAST(v_discount_amount, v_discount.maximum_discount);
  END IF;

  RETURN ROUND(v_discount_amount, 2);
END;
$$;

-- Function to get auto-applicable discounts for a cart
CREATE FUNCTION get_auto_apply_discounts(
  p_user_id UUID DEFAULT NULL,
  p_cart_total NUMERIC DEFAULT 0,
  p_product_ids UUID[] DEFAULT NULL,
  p_category_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  discount_id UUID,
  code TEXT,
  discount_type TEXT,
  discount_value NUMERIC,
  maximum_discount NUMERIC,
  description TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.code,
    dc.discount_type,
    dc.discount_value,
    dc.maximum_discount,
    dc.description
  FROM public.discount_codes dc
  WHERE dc.is_active = true
    AND dc.valid_from <= NOW()
    AND (dc.valid_until IS NULL OR dc.valid_until > NOW())
    AND (dc.minimum_purchase IS NULL OR dc.minimum_purchase <= p_cart_total)
    AND (dc.usage_limit IS NULL OR dc.usage_count < dc.usage_limit)
    AND (
      dc.applicable_to = 'all'
      OR (dc.applicable_to = 'product' AND dc.applicable_ids && p_product_ids)
      OR (dc.applicable_to = 'category' AND dc.applicable_ids && p_category_ids)
    )
  ORDER BY dc.priority DESC, dc.discount_value DESC
  LIMIT 1;
END;
$$;

-- Function to record discount usage
CREATE FUNCTION record_discount_usage(
  p_discount_id UUID,
  p_user_id UUID,
  p_order_id UUID,
  p_amount_saved NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert usage record
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
  );

  -- Increment usage count on discount
  UPDATE public.discount_codes
  SET usage_count = usage_count + 1
  WHERE id = p_discount_id;
END;
$$;

-- Function to get discount statistics
CREATE FUNCTION get_discount_statistics(p_discount_id UUID)
RETURNS TABLE (
  total_uses INTEGER,
  total_saved NUMERIC,
  unique_users INTEGER,
  average_order_value NUMERIC,
  last_used TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_uses,
    COALESCE(SUM(du.amount_saved), 0) as total_saved,
    COUNT(DISTINCT du.user_id)::INTEGER as unique_users,
    COALESCE(AVG(o.total_amount), 0) as average_order_value,
    MAX(du.used_at) as last_used
  FROM public.discount_usage du
  LEFT JOIN public.orders o ON o.id = du.order_id
  WHERE du.discount_id = p_discount_id;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION validate_discount_code TO anon, authenticated;
GRANT EXECUTE ON FUNCTION calculate_discount_amount TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_auto_apply_discounts TO anon, authenticated;
GRANT EXECUTE ON FUNCTION record_discount_usage TO authenticated;
GRANT EXECUTE ON FUNCTION get_discount_statistics TO authenticated;

-- Grant permissions on tables
GRANT SELECT ON public.discount_codes TO anon;
GRANT ALL ON public.discount_codes TO authenticated;
GRANT ALL ON public.discount_usage TO authenticated;