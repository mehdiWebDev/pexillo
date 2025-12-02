-- =============================================
-- VERIFY DISCOUNT STATUS AND FIX ON_SALE FILTER
-- =============================================

-- 1. Check current discount situation
SELECT '=== CURRENT DISCOUNT ANALYSIS ===' AS section;
SELECT
  COUNT(*) AS total_discounts,
  COUNT(*) FILTER (WHERE is_active = true) AS active_discounts,
  COUNT(*) FILTER (WHERE is_active = true AND show_on_products = true) AS visible_product_discounts,
  COUNT(*) FILTER (WHERE is_active = true AND show_on_products = false) AS checkout_only_codes
FROM discount_codes;

SELECT '=== ACTIVE DISCOUNTS BREAKDOWN ===' AS section;
SELECT
  code,
  description,
  is_active,
  show_on_products,
  applicable_to,
  discount_type,
  discount_value,
  CASE
    WHEN show_on_products = true THEN '✅ Shows on products'
    WHEN show_on_products = false THEN '🔒 Checkout code only'
    ELSE '❓ Not set (defaults to checkout only)'
  END AS visibility
FROM discount_codes
WHERE is_active = true
ORDER BY show_on_products DESC NULLS LAST;

-- 2. Test what the current filter returns
SELECT '=== TESTING CURRENT ON_SALE FILTER ===' AS section;
SELECT COUNT(*) as products_returned_by_on_sale_filter
FROM get_products_enhanced(
  on_sale_only := true,
  limit_count := 100
) p;

-- 3. The expected result
SELECT '=== EXPECTED RESULT ===' AS section;
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✅ CORRECT: No products should be on sale (no active show_on_products discounts)'
    ELSE '❌ ERROR: ' || COUNT(*) || ' products returned but there are no visible discounts!'
  END AS filter_status
FROM discount_codes
WHERE is_active = true AND show_on_products = true;

-- 4. If you want to test the system, create a test discount
SELECT '=== CREATE TEST DISCOUNT (Optional) ===' AS section;
SELECT 'To test the discount system, you can create a visible discount with this command:' AS instruction;
SELECT 'INSERT INTO discount_codes (code, description, discount_type, discount_value, is_active, show_on_products, applicable_to, valid_from)
VALUES (''TESTVISIBLE'', ''Test visible discount'', ''percentage'', 10, true, true, ''all'', NOW());' AS example_command;

-- 5. Fix for get_filter_options to return correct count
SELECT '=== FIX FILTER COUNT ===' AS section;
-- The products_on_sale count in filter options should also be 0
SELECT
  products_on_sale AS current_count,
  CASE
    WHEN products_on_sale = 0 THEN '✅ Filter count is correct'
    ELSE '❌ Filter shows ' || products_on_sale || ' on sale but there are none!'
  END AS count_status
FROM get_filter_options();

-- 6. Summary
SELECT '=== SUMMARY ===' AS section;
SELECT 'The issue is clear:' AS finding1;
SELECT '1. You have NO active discounts with show_on_products = true' AS finding2;
SELECT '2. Therefore, the on_sale filter should return 0 products' AS finding3;
SELECT '3. If it returns any products, the function needs the fix from COMPLETE_DISCOUNT_FIX_SHOW_ON_PRODUCTS.sql' AS finding4;

-- 7. Quick fix verification
SELECT '=== CHECKING IF FIXES ARE NEEDED ===' AS section;
WITH discount_check AS (
  SELECT COUNT(*) as visible_discount_count
  FROM discount_codes
  WHERE is_active = true AND show_on_products = true
),
filter_check AS (
  SELECT COUNT(*) as on_sale_products
  FROM get_products_enhanced(on_sale_only := true, limit_count := 100) p
)
SELECT
  dc.visible_discount_count,
  fc.on_sale_products,
  CASE
    WHEN dc.visible_discount_count = 0 AND fc.on_sale_products = 0 THEN
      '✅ SYSTEM WORKING CORRECTLY: No discounts, no products on sale'
    WHEN dc.visible_discount_count = 0 AND fc.on_sale_products > 0 THEN
      '❌ BUG CONFIRMED: Filter returns ' || fc.on_sale_products || ' products but there are no visible discounts!'
    WHEN dc.visible_discount_count > 0 AND fc.on_sale_products = 0 THEN
      '⚠️ POSSIBLE ISSUE: Have discounts but no products on sale'
    ELSE
      'ℹ️ Have ' || dc.visible_discount_count || ' discounts and ' || fc.on_sale_products || ' products on sale'
  END AS system_status
FROM discount_check dc, filter_check fc;