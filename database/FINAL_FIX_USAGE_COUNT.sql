-- FINAL FIX FOR DISCOUNT USAGE COUNT
-- This comprehensive solution will definitely fix the issue

-- 1. First, let's see what's actually in your orders table
SELECT
    'Current Payment Status Distribution:' as info,
    payment_status,
    COUNT(*) as count
FROM orders
GROUP BY payment_status;

-- 2. Drop ALL existing triggers on orders table related to discounts
DROP TRIGGER IF EXISTS track_discount_on_order ON orders;
DROP TRIGGER IF EXISTS track_discount_usage_trigger ON orders;
DROP TRIGGER IF EXISTS track_discount_on_payment ON orders;
DROP TRIGGER IF EXISTS update_discount_usage_on_order ON orders;

-- 3. Create a ROBUST trigger function that handles all cases
CREATE OR REPLACE FUNCTION track_discount_usage()
RETURNS TRIGGER AS $$
DECLARE
    v_old_status TEXT;
    v_new_status TEXT;
BEGIN
    -- Get the status values (handle NULL)
    v_old_status := COALESCE(OLD.payment_status, 'none');
    v_new_status := COALESCE(NEW.payment_status, 'none');

    -- Log for debugging
    RAISE NOTICE 'Discount Usage Trigger: Order %, Old Status: %, New Status: %, Discount ID: %',
        NEW.order_number, v_old_status, v_new_status, NEW.discount_code_id;

    -- Check if we have a discount and payment is completed
    IF NEW.discount_code_id IS NOT NULL AND v_new_status = 'completed' THEN

        -- Only process if status is CHANGING to completed (not already completed)
        IF v_old_status != 'completed' THEN

            RAISE NOTICE 'Incrementing usage count for discount %', NEW.discount_code_id;

            -- Increment the usage count
            UPDATE discount_codes
            SET usage_count = COALESCE(usage_count, 0) + 1,
                updated_at = NOW()
            WHERE id = NEW.discount_code_id;

            -- Insert into discount_usage table (ignore if already exists)
            INSERT INTO discount_usage (
                discount_id,
                user_id,
                order_id,
                amount_saved,
                used_at
            ) VALUES (
                NEW.discount_code_id,
                NEW.user_id,
                NEW.id,
                COALESCE(NEW.discount_amount, 0),
                NOW()
            ) ON CONFLICT (discount_id, order_id) DO NOTHING;

            RAISE NOTICE 'Successfully tracked discount usage for order %', NEW.order_number;
        ELSE
            RAISE NOTICE 'Payment already completed, skipping increment';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create the trigger on BOTH INSERT and UPDATE
CREATE TRIGGER track_discount_on_order
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION track_discount_usage();

-- 5. IMMEDIATELY fix all existing counts
UPDATE discount_codes dc
SET usage_count = subquery.actual_count,
    updated_at = NOW()
FROM (
    SELECT
        dc2.id,
        COUNT(DISTINCT o.id) as actual_count
    FROM discount_codes dc2
    LEFT JOIN orders o ON o.discount_code_id = dc2.id
        AND o.payment_status = 'completed'
    GROUP BY dc2.id
) AS subquery
WHERE dc.id = subquery.id;

-- 6. Verify SAVESAI4 specifically
SELECT
    'SAVESAI4 After Fix:' as status,
    code,
    usage_count,
    usage_limit,
    (SELECT COUNT(*) FROM orders WHERE discount_code_id = discount_codes.id AND payment_status = 'completed') as actual_completed_orders
FROM discount_codes
WHERE code = 'SAVESAI4';

-- 7. Show all discount codes with their corrected counts
SELECT
    code,
    description,
    usage_count as updated_count,
    usage_limit,
    is_active,
    COUNT(o.id) as orders_with_this_code,
    COUNT(CASE WHEN o.payment_status = 'completed' THEN 1 END) as completed_orders
FROM discount_codes dc
LEFT JOIN orders o ON o.discount_code_id = dc.id
GROUP BY dc.id, dc.code, dc.description, dc.usage_count, dc.usage_limit, dc.is_active
ORDER BY dc.code;

-- 8. Clean up and rebuild discount_usage table
TRUNCATE TABLE discount_usage;

INSERT INTO discount_usage (discount_id, user_id, order_id, amount_saved, used_at)
SELECT
    o.discount_code_id,
    o.user_id,
    o.id,
    COALESCE(o.discount_amount, 0),
    COALESCE(o.updated_at, o.created_at)
FROM orders o
WHERE o.discount_code_id IS NOT NULL
AND o.payment_status = 'completed'
ON CONFLICT (discount_id, order_id) DO NOTHING;

-- 9. Final verification
SELECT
    'Final Status Check:' as info,
    (SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'track_discount_on_order') as trigger_exists,
    (SELECT usage_count FROM discount_codes WHERE code = 'SAVESAI4') as savesai4_count,
    (SELECT COUNT(*) FROM orders o JOIN discount_codes dc ON dc.id = o.discount_code_id WHERE dc.code = 'SAVESAI4' AND o.payment_status = 'completed') as actual_savesai4_uses;