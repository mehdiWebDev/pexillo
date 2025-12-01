-- Fix discount usage tracking
-- This ensures the usage_count is properly incremented when orders are completed

-- First, check if the discount_usage table exists
CREATE TABLE IF NOT EXISTS discount_usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    discount_id UUID NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount_saved NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(discount_id, order_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_discount_usage_discount_id ON discount_usage(discount_id);
CREATE INDEX IF NOT EXISTS idx_discount_usage_user_id ON discount_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_discount_usage_order_id ON discount_usage(order_id);

-- Drop and recreate the trigger function with better logging
DROP FUNCTION IF EXISTS track_discount_usage() CASCADE;

CREATE OR REPLACE FUNCTION track_discount_usage()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the trigger execution
    RAISE NOTICE 'track_discount_usage trigger fired for order %', NEW.order_number;
    RAISE NOTICE 'Payment status: OLD=%, NEW=%', OLD.payment_status, NEW.payment_status;
    RAISE NOTICE 'Discount code ID: %', NEW.discount_code_id;

    -- Track usage when discount_code_id is present and payment is completed
    IF NEW.discount_code_id IS NOT NULL THEN

        -- For INSERT: track if payment is already completed
        IF TG_OP = 'INSERT' AND NEW.payment_status = 'completed' THEN
            RAISE NOTICE 'INSERT with completed payment - tracking discount usage';

            -- Update usage count
            UPDATE discount_codes
            SET usage_count = COALESCE(usage_count, 0) + 1
            WHERE id = NEW.discount_code_id;

            -- Log usage
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

            RAISE NOTICE 'Discount usage tracked for order % (INSERT)', NEW.order_number;

        -- For UPDATE: track when payment status changes to completed
        ELSIF TG_OP = 'UPDATE' THEN
            -- Check if payment status is changing to completed
            IF NEW.payment_status = 'completed' AND
               (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN

                RAISE NOTICE 'UPDATE changing payment_status to completed - tracking discount usage';

                -- Update usage count
                UPDATE discount_codes
                SET usage_count = COALESCE(usage_count, 0) + 1
                WHERE id = NEW.discount_code_id;

                -- Log usage
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

                RAISE NOTICE 'Discount usage tracked for order % (UPDATE)', NEW.order_number;
            ELSE
                RAISE NOTICE 'UPDATE but payment status not changing to completed - no action taken';
            END IF;
        END IF;
    ELSE
        RAISE NOTICE 'No discount_code_id present - no action taken';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS track_discount_on_order ON orders;

CREATE TRIGGER track_discount_on_order
AFTER INSERT OR UPDATE OF payment_status ON orders
FOR EACH ROW
EXECUTE FUNCTION track_discount_usage();

-- Grant permissions
GRANT ALL ON discount_usage TO authenticated;
GRANT ALL ON discount_usage TO anon;

-- Test query to check current discount usage counts
-- SELECT
--     dc.code,
--     dc.usage_count,
--     COUNT(du.id) as actual_usage_count,
--     COUNT(DISTINCT o.id) as orders_with_discount
-- FROM discount_codes dc
-- LEFT JOIN discount_usage du ON du.discount_id = dc.id
-- LEFT JOIN orders o ON o.discount_code_id = dc.id AND o.payment_status = 'completed'
-- GROUP BY dc.id, dc.code, dc.usage_count;

-- Fix any existing discrepancies by recounting from orders
UPDATE discount_codes dc
SET usage_count = (
    SELECT COUNT(*)
    FROM orders o
    WHERE o.discount_code_id = dc.id
    AND o.payment_status = 'completed'
)
WHERE dc.id IN (
    SELECT DISTINCT discount_code_id
    FROM orders
    WHERE discount_code_id IS NOT NULL
);