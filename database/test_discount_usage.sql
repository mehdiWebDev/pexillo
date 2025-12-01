-- Test script to verify discount usage tracking

-- 1. Check if the trigger exists
SELECT
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgtype as trigger_type,
    proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'orders'::regclass
AND tgname = 'track_discount_on_order';

-- 2. Check current discount usage counts
SELECT
    dc.code,
    dc.usage_count as stored_count,
    COUNT(DISTINCT o.id) as actual_completed_orders
FROM discount_codes dc
LEFT JOIN orders o ON o.discount_code_id = dc.id AND o.payment_status = 'completed'
GROUP BY dc.id, dc.code, dc.usage_count
ORDER BY dc.code;

-- 3. Check recent orders with discounts
SELECT
    o.order_number,
    o.payment_status,
    o.discount_code_id,
    o.discount_amount,
    o.created_at,
    o.updated_at,
    dc.code as discount_code
FROM orders o
LEFT JOIN discount_codes dc ON dc.id = o.discount_code_id
WHERE o.discount_code_id IS NOT NULL
ORDER BY o.created_at DESC
LIMIT 10;

-- 4. Check if discount_usage table exists and has records
SELECT
    'Table exists' as status,
    COUNT(*) as total_records
FROM discount_usage;

-- 5. Manual fix: Update usage counts based on completed orders
-- UNCOMMENT AND RUN THIS TO FIX COUNTS
-- UPDATE discount_codes dc
-- SET usage_count = (
--     SELECT COUNT(*)
--     FROM orders o
--     WHERE o.discount_code_id = dc.id
--     AND o.payment_status = 'completed'
-- );