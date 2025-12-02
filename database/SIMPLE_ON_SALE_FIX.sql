-- =============================================
-- SIMPLE FIX: Make on_sale_only filter work correctly
-- Only modifies the on_sale filtering logic
-- =============================================

-- Just update the existing function's on_sale_only filter logic
-- This assumes your current function structure follows the pattern from OPTIMIZED_PRODUCTS_FUNCTION.sql

-- First, ensure the helper functions respect show_on_products
-- (Run COMPLETE_DISCOUNT_FIX_SHOW_ON_PRODUCTS.sql first if not done)

-- Then just add this simple check to your existing get_products_enhanced function
-- In the filtered_products CTE, modify the on_sale_only condition to:

/*
The on_sale_only condition should be:
    AND (
      NOT on_sale_only
      OR EXISTS (
        SELECT 1 FROM discount_codes dc
        WHERE dc.is_active = true
          AND dc.show_on_products = true  -- CRITICAL: Only product listing discounts
          AND dc.valid_from <= NOW()
          AND (dc.valid_until IS NULL OR dc.valid_until >= NOW())
          AND (dc.usage_limit IS NULL OR dc.usage_count < dc.usage_limit)
          AND (
            dc.applicable_to = 'all'
            OR (dc.applicable_to = 'product' AND p.id = ANY(dc.applicable_ids))
            OR (dc.applicable_to = 'category' AND p.category_id = ANY(dc.applicable_ids))
            OR (dc.applicable_to = 'variant' AND EXISTS (
              SELECT 1 FROM product_variants pv2
              WHERE pv2.product_id = p.id
                AND pv2.is_active = true
                AND pv2.id = ANY(dc.applicable_ids)
            ))
          )
      )
    )

Additionally, in the final SELECT, after joining all the aggregates, add:

  -- When on_sale_only is true, ensure the product actually has a discount
  WHERE NOT on_sale_only
    OR EXISTS (
      SELECT 1 FROM get_product_best_discount(p.id, p.category_id, p.base_price) d
      WHERE d.has_discount = true
    )

This ensures products are only returned when they actually have applied discounts.
*/

-- For now, let's just test if products are being correctly identified as having discounts
SELECT 'Testing discount detection:' AS test;

SELECT
  p.name,
  p.base_price,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM discount_codes dc
      WHERE dc.is_active = true
        AND dc.show_on_products = true
        AND dc.valid_from <= NOW()
        AND (dc.valid_until IS NULL OR dc.valid_until >= NOW())
        AND (
          dc.applicable_to = 'all'
          OR (dc.applicable_to = 'product' AND p.id = ANY(dc.applicable_ids))
          OR (dc.applicable_to = 'category' AND p.category_id = ANY(dc.applicable_ids))
        )
    ) THEN 'Has Discount'
    ELSE 'No Discount'
  END as discount_status,
  (SELECT d.has_discount FROM get_product_best_discount(p.id, p.category_id, p.base_price) d) as function_says
FROM products p
WHERE p.is_active = true
LIMIT 10;

SELECT '---' AS separator;
SELECT 'Active discounts with show_on_products = true:' AS info;
SELECT
  code,
  description,
  applicable_to,
  show_on_products,
  is_active
FROM discount_codes
WHERE is_active = true
  AND show_on_products = true;