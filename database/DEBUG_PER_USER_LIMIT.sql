-- Debug Per User Limit Validation
-- Run these queries to diagnose why per-user limit isn't working

-- 1. Check if discount_usage table exists and has the correct structure
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'discount_usage'
ORDER BY ordinal_position;

-- 2. Check the validate_discount_code function signature
SELECT
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'validate_discount_code'
AND n.nspname = 'public';

-- 3. Check if there are any entries in discount_usage table
SELECT
    COUNT(*) as total_usage_records,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT discount_id) as unique_discounts
FROM discount_usage;

-- 4. View discount_usage records (if any)
SELECT
    du.id,
    dc.code as discount_code,
    p.email as user_email,
    du.amount_saved,
    du.used_at
FROM discount_usage du
LEFT JOIN discount_codes dc ON dc.id = du.discount_id
LEFT JOIN profiles p ON p.id = du.user_id
ORDER BY du.used_at DESC
LIMIT 10;

-- 5. Check discount codes with per-user limits
SELECT
    code,
    description,
    user_usage_limit,
    usage_count,
    is_active,
    first_purchase_only
FROM discount_codes
WHERE user_usage_limit IS NOT NULL
ORDER BY created_at DESC;

-- 6. Test the validate_discount_code function with a specific code
-- Replace 'YOUR_CODE' with your actual discount code and 'USER_ID' with a test user ID
/*
SELECT * FROM validate_discount_code(
    'YOUR_CODE',           -- p_code
    'USER_ID'::uuid,       -- p_user_id
    100.00,                -- p_cart_total
    NULL,                  -- p_product_ids
    NULL,                  -- p_variant_ids
    NULL,                  -- p_category_ids
    1                      -- p_cart_items_count
);
*/

-- 7. Count how many times a specific user has used a specific discount
-- Replace USER_ID and DISCOUNT_CODE
/*
SELECT
    dc.code,
    dc.user_usage_limit,
    COUNT(du.id) as times_used,
    CASE
        WHEN COUNT(du.id) >= dc.user_usage_limit THEN '❌ LIMIT REACHED'
        ELSE '✅ CAN STILL USE'
    END as status
FROM discount_codes dc
LEFT JOIN discount_usage du ON du.discount_id = dc.id AND du.user_id = 'USER_ID'::uuid
WHERE dc.code = 'DISCOUNT_CODE'
GROUP BY dc.code, dc.user_usage_limit;
*/

-- 8. Check if record_discount_usage function exists
SELECT
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'record_discount_usage'
AND n.nspname = 'public';

-- 9. Manually test recording a discount usage (DO NOT RUN IN PRODUCTION)
/*
SELECT record_discount_usage(
    'DISCOUNT_ID'::uuid,   -- discount_id from discount_codes
    'USER_ID'::uuid,       -- user_id from profiles
    'ORDER_ID'::uuid,      -- order_id from orders
    10.50                  -- amount_saved
);
*/

-- 10. Check orders table to see if discount_id is being saved
SELECT
    o.id,
    o.user_id,
    o.discount_code_id,
    o.discount_amount,
    o.payment_status,
    o.created_at
FROM orders o
WHERE o.discount_code_id IS NOT NULL
ORDER BY o.created_at DESC
LIMIT 10;

-- TROUBLESHOOTING STEPS:

-- If discount_usage table is empty:
-- 1. Check if orders are completing successfully
-- 2. Check if record_discount_usage is being called from the application
-- 3. Check application logs for errors

-- If validate_discount_code doesn't have the right signature:
-- Re-run: /database/migrations/fix_user_usage_limit_SAFE.sql

-- If function exists but not checking per-user limit:
-- Check the function definition:
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'validate_discount_code'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
