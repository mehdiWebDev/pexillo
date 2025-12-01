-- MANUAL INCREMENT FUNCTION
-- Use this if the trigger still doesn't work

-- Create a function that can be called manually to increment usage
CREATE OR REPLACE FUNCTION increment_discount_usage(p_order_id UUID)
RETURNS VOID AS $$
DECLARE
    v_discount_id UUID;
    v_user_id UUID;
    v_discount_amount NUMERIC;
BEGIN
    -- Get the discount info from the order
    SELECT discount_code_id, user_id, discount_amount
    INTO v_discount_id, v_user_id, v_discount_amount
    FROM orders
    WHERE id = p_order_id
    AND payment_status = 'completed';

    IF v_discount_id IS NOT NULL THEN
        -- Increment the usage count
        UPDATE discount_codes
        SET usage_count = COALESCE(usage_count, 0) + 1,
            updated_at = NOW()
        WHERE id = v_discount_id;

        -- Log the usage
        INSERT INTO discount_usage (
            discount_id,
            user_id,
            order_id,
            amount_saved
        ) VALUES (
            v_discount_id,
            v_user_id,
            p_order_id,
            COALESCE(v_discount_amount, 0)
        ) ON CONFLICT (discount_id, order_id) DO NOTHING;

        RAISE NOTICE 'Manually incremented usage for discount %', v_discount_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant permission to call this function
GRANT EXECUTE ON FUNCTION increment_discount_usage TO authenticated;
GRANT EXECUTE ON FUNCTION increment_discount_usage TO anon;

-- Example: To manually increment for a specific order
-- SELECT increment_discount_usage('your-order-id-here');

-- To increment for ALL completed orders that haven't been tracked yet
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT o.id
        FROM orders o
        WHERE o.discount_code_id IS NOT NULL
        AND o.payment_status = 'completed'
        AND NOT EXISTS (
            SELECT 1 FROM discount_usage du
            WHERE du.order_id = o.id
        )
    LOOP
        PERFORM increment_discount_usage(r.id);
    END LOOP;
END $$;