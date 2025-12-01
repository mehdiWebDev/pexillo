-- DEBUG: Check what's happening with discount usage tracking

-- 1. Check if the trigger exists
SELECT
    'Trigger Status:' as check,
    EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'track_discount_on_order'
    ) as trigger_exists;

-- 2. Check SAVESAI4 current status
SELECT
    'SAVESAI4 Status:' as info,
    id,
    code,
    usage_count,
    usage_limit,
    is_active
FROM discount_codes
WHERE code = 'SAVESAI4';

-- 3. Check ALL orders with SAVESAI4 (regardless of payment status)
SELECT
    'Orders with SAVESAI4:' as info,
    o.order_number,
    o.payment_status,
    o.status as order_status,
    o.created_at,
    o.updated_at,
    o.discount_amount,
    o.discount_code_id
FROM orders o
JOIN discount_codes dc ON dc.id = o.discount_code_id
WHERE dc.code = 'SAVESAI4'
ORDER BY o.created_at DESC;

-- 4. Check if there are completed orders that should have incremented the count
SELECT
    'Completed Orders Count:' as info,
    COUNT(*) as completed_orders_with_savesai4
FROM orders o
JOIN discount_codes dc ON dc.id = o.discount_code_id
WHERE dc.code = 'SAVESAI4'
AND o.payment_status = 'completed';

-- 5. Check the discount_usage table
SELECT
    'Discount Usage Records:' as info,
    COUNT(*) as usage_records_for_savesai4
FROM discount_usage du
JOIN discount_codes dc ON dc.id = du.discount_id
WHERE dc.code = 'SAVESAI4';

-- 6. MANUAL FIX: Force update the usage_count for SAVESAI4
-- Uncomment and run this to fix immediately:
/*
UPDATE discount_codes
SET usage_count = (
    SELECT COUNT(*)
    FROM orders o
    WHERE o.discount_code_id = discount_codes.id
    AND o.payment_status = 'completed'
)
WHERE code = 'SAVESAI4';
*/

-- 7. Check what payment_status values actually exist in orders
SELECT
    'Payment Status Values:' as info,
    payment_status,
    COUNT(*) as count
FROM orders
WHERE discount_code_id IS NOT NULL
GROUP BY payment_status
ORDER BY count DESC;