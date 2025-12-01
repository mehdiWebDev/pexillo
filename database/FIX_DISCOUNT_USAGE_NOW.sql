-- IMMEDIATE FIX FOR DISCOUNT USAGE TRACKING
-- Run this entire script in Supabase SQL Editor

-- STEP 1: Create the automatic trigger function
CREATE OR REPLACE FUNCTION track_discount_usage()
RETURNS TRIGGER AS $$
BEGIN
    -- Only track when payment_status changes to 'completed'
    IF NEW.discount_code_id IS NOT NULL AND NEW.payment_status = 'completed' THEN

        -- For UPDATE: only track if payment_status is changing to completed
        IF TG_OP = 'UPDATE' THEN
            IF OLD.payment_status IS DISTINCT FROM 'completed' THEN
                -- Increment usage count
                UPDATE discount_codes
                SET usage_count = COALESCE(usage_count, 0) + 1
                WHERE id = NEW.discount_code_id;

                -- Log the usage
                INSERT INTO discount_usage (
                    discount_id,
                    user_id,
                    order_id,
                    amount_saved
                ) VALUES (
                    NEW.discount_code_id,
                    NEW.user_id,
                    NEW.id,
                    COALESCE(NEW.discount_amount, 0)
                ) ON CONFLICT (discount_id, order_id) DO NOTHING;

                RAISE LOG 'Discount usage tracked for order % (UPDATE)', NEW.order_number;
            END IF;

        -- For INSERT: track if already completed (rare but possible)
        ELSIF TG_OP = 'INSERT' THEN
            -- Increment usage count
            UPDATE discount_codes
            SET usage_count = COALESCE(usage_count, 0) + 1
            WHERE id = NEW.discount_code_id;

            -- Log the usage
            INSERT INTO discount_usage (
                discount_id,
                user_id,
                order_id,
                amount_saved
            ) VALUES (
                NEW.discount_code_id,
                NEW.user_id,
                NEW.id,
                COALESCE(NEW.discount_amount, 0)
            ) ON CONFLICT (discount_id, order_id) DO NOTHING;

            RAISE LOG 'Discount usage tracked for order % (INSERT)', NEW.order_number;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 2: Drop any existing trigger
DROP TRIGGER IF EXISTS track_discount_on_order ON orders;
DROP TRIGGER IF EXISTS track_discount_usage_trigger ON orders;

-- STEP 3: Create the new trigger
CREATE TRIGGER track_discount_on_order
AFTER INSERT OR UPDATE OF payment_status ON orders
FOR EACH ROW
EXECUTE FUNCTION track_discount_usage();

-- STEP 4: Fix existing counts for all discount codes
-- This will count all completed orders for each discount code
UPDATE discount_codes dc
SET usage_count = (
    SELECT COUNT(DISTINCT o.id)
    FROM orders o
    WHERE o.discount_code_id = dc.id
    AND o.payment_status = 'completed'
);

-- STEP 5: Clean up discount_usage table and repopulate from completed orders
-- First, clear existing records
TRUNCATE TABLE discount_usage;

-- Then repopulate from all completed orders with discounts
INSERT INTO discount_usage (discount_id, user_id, order_id, amount_saved)
SELECT
    o.discount_code_id,
    o.user_id,
    o.id,
    COALESCE(o.discount_amount, 0)
FROM orders o
WHERE o.discount_code_id IS NOT NULL
AND o.payment_status = 'completed'
ON CONFLICT (discount_id, order_id) DO NOTHING;

-- STEP 6: Verify the fix
SELECT
    dc.code,
    dc.description,
    dc.usage_count as current_count,
    COUNT(DISTINCT o.id) as actual_completed_orders,
    COUNT(DISTINCT du.order_id) as logged_uses
FROM discount_codes dc
LEFT JOIN orders o ON o.discount_code_id = dc.id AND o.payment_status = 'completed'
LEFT JOIN discount_usage du ON du.discount_id = dc.id
GROUP BY dc.id, dc.code, dc.description, dc.usage_count
ORDER BY dc.code;

-- STEP 7: Show specifically SAVESAI4 usage
SELECT
    'SAVESAI4 Status:' as info,
    dc.code,
    dc.usage_count as stored_usage_count,
    COUNT(DISTINCT o.id) as actual_orders_completed
FROM discount_codes dc
LEFT JOIN orders o ON o.discount_code_id = dc.id AND o.payment_status = 'completed'
WHERE dc.code = 'SAVESAI4'
GROUP BY dc.id, dc.code, dc.usage_count;

-- STEP 8: Show recent orders with SAVESAI4
SELECT
    o.order_number,
    o.payment_status,
    o.created_at,
    o.updated_at,
    o.discount_amount,
    dc.code as discount_code
FROM orders o
JOIN discount_codes dc ON dc.id = o.discount_code_id
WHERE dc.code = 'SAVESAI4'
ORDER BY o.created_at DESC
LIMIT 5;