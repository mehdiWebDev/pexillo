-- Manual function to increment discount usage
-- Call this if the trigger isn't working

-- Function to manually increment usage for an order
CREATE OR REPLACE FUNCTION manual_increment_discount_usage(p_order_id UUID)
RETURNS JSON AS $$
DECLARE
    v_order RECORD;
    v_result JSON;
BEGIN
    -- Get order details
    SELECT * INTO v_order
    FROM orders
    WHERE id = p_order_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Order not found');
    END IF;

    IF v_order.discount_code_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'No discount code applied to this order');
    END IF;

    -- Check if usage already tracked
    IF EXISTS (SELECT 1 FROM discount_usage WHERE order_id = p_order_id) THEN
        RETURN json_build_object('success', false, 'error', 'Usage already tracked for this order');
    END IF;

    -- Update usage count
    UPDATE discount_codes
    SET usage_count = COALESCE(usage_count, 0) + 1
    WHERE id = v_order.discount_code_id;

    -- Insert usage record
    INSERT INTO discount_usage (
        discount_id,
        user_id,
        order_id,
        amount_saved
    ) VALUES (
        v_order.discount_code_id,
        v_order.user_id,
        v_order.id,
        COALESCE(v_order.discount_amount, 0)
    );

    RETURN json_build_object(
        'success', true,
        'order_number', v_order.order_number,
        'discount_code_id', v_order.discount_code_id,
        'amount_saved', v_order.discount_amount
    );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION manual_increment_discount_usage TO anon, authenticated, service_role;

-- Function to check and fix all orders with discounts that haven't been tracked
CREATE OR REPLACE FUNCTION fix_untracked_discount_usage()
RETURNS JSON AS $$
DECLARE
    v_fixed_count INTEGER := 0;
    v_order RECORD;
BEGIN
    -- Find orders with discount codes but no usage record
    FOR v_order IN
        SELECT o.*
        FROM orders o
        WHERE o.discount_code_id IS NOT NULL
        AND o.payment_status = 'completed'
        AND NOT EXISTS (
            SELECT 1 FROM discount_usage du
            WHERE du.order_id = o.id
        )
    LOOP
        -- Update usage count
        UPDATE discount_codes
        SET usage_count = COALESCE(usage_count, 0) + 1
        WHERE id = v_order.discount_code_id;

        -- Insert usage record
        INSERT INTO discount_usage (
            discount_id,
            user_id,
            order_id,
            amount_saved
        ) VALUES (
            v_order.discount_code_id,
            v_order.user_id,
            v_order.id,
            COALESCE(v_order.discount_amount, 0)
        ) ON CONFLICT (discount_id, order_id) DO NOTHING;

        v_fixed_count := v_fixed_count + 1;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'fixed_count', v_fixed_count,
        'message', format('Fixed %s untracked discount usages', v_fixed_count)
    );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION fix_untracked_discount_usage TO anon, authenticated, service_role;