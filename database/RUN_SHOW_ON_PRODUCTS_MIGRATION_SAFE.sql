-- SAFE VERSION: RUN THIS SCRIPT IN YOUR SUPABASE SQL EDITOR TO IMPLEMENT THE show_on_products FEATURE
-- This separates product sales (shown on listings) from checkout codes (manual entry only)

-- ========================================
-- STEP 1: Add the show_on_products field
-- ========================================
ALTER TABLE discount_codes
ADD COLUMN IF NOT EXISTS show_on_products BOOLEAN DEFAULT false;

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_discount_codes_show_on_products
ON discount_codes(show_on_products)
WHERE show_on_products = true;

-- Add a comment for clarity
COMMENT ON COLUMN discount_codes.show_on_products IS
'If true, this discount shows as a sale price on product listings. If false, it only works as a checkout code.';

-- ========================================
-- STEP 2: Update existing discounts
-- ========================================
-- Set all existing discount CODES to NOT show on products (checkout only)
UPDATE discount_codes
SET show_on_products = false
WHERE code IS NOT NULL AND show_on_products IS NULL;

-- ========================================
-- STEP 3: Update database functions (SAFE VERSION)
-- ========================================

-- First, let's check if the functions exist and drop them if needed
DO $$
BEGIN
  -- Drop get_product_best_discount if it exists
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_product_best_discount'
  ) THEN
    DROP FUNCTION get_product_best_discount(UUID, UUID, NUMERIC);
  END IF;

  -- Drop get_variant_discount if it exists
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_variant_discount'
  ) THEN
    DROP FUNCTION get_variant_discount(UUID, UUID, UUID, NUMERIC);
  END IF;
END $$;

-- Now create the updated functions

-- Create get_product_best_discount
CREATE FUNCTION get_product_best_discount(
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
    AND dc.show_on_products = true  -- Only show discounts meant for product listings
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

-- Create get_variant_discount
CREATE FUNCTION get_variant_discount(
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
    AND dc.show_on_products = true  -- Only show discounts meant for product listings
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_product_best_discount(UUID, UUID, NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_variant_discount(UUID, UUID, UUID, NUMERIC) TO authenticated, anon;

-- ========================================
-- STEP 3.5: Update the on_sale_only filter in get_products_enhanced
-- ========================================
-- This is a partial update to add show_on_products checking to the on_sale_only filter
-- The main function will use the updated get_product_best_discount and get_variant_discount functions

-- Note: If you have custom modifications to get_products_enhanced,
-- you may need to manually add "AND dc.show_on_products = true" to any
-- discount_codes queries in the on_sale_only filter sections

-- ========================================
-- STEP 4: Example configurations
-- ========================================

-- Make WELCOME30 a checkout-only code (won't show on products)
UPDATE discount_codes
SET
    show_on_products = false,  -- Won't show on listings
    first_purchase_only = true, -- Only works for first order
    is_active = true
WHERE code = 'WELCOME30';

-- Make any other first-purchase codes checkout-only
UPDATE discount_codes
SET show_on_products = false
WHERE first_purchase_only = true;

-- Example: Create a product sale that shows on listings
-- INSERT INTO discount_codes (
--     description,
--     discount_type,
--     discount_value,
--     show_on_products,
--     applicable_to,
--     code,
--     is_active,
--     valid_from
-- ) VALUES (
--     'Summer Sale - 25% off everything',
--     'percentage',
--     25,
--     true,             -- Shows on product cards
--     'all',
--     NULL,             -- No code needed (auto-applied)
--     true,
--     NOW()
-- );

-- ========================================
-- STEP 5: Check your configuration
-- ========================================
SELECT
    code,
    description,
    discount_type,
    discount_value,
    first_purchase_only,
    show_on_products,
    CASE
        WHEN show_on_products = true THEN '🏷️ Product Sale (shows on listings)'
        ELSE '💳 Checkout Code (manual entry)'
    END as display_type,
    is_active,
    applicable_to
FROM discount_codes
ORDER BY show_on_products DESC, created_at DESC;