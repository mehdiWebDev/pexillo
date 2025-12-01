-- Add First-Order Discount for New Users
-- This creates a 30% discount that automatically applies to first-time buyers

-- 1. Create the first-order discount code
INSERT INTO discount_codes (
    code,
    description,
    discount_type,
    discount_value,
    is_active,
    applicable_to,
    first_purchase_only,  -- This is the key field
    stackable,
    priority,
    minimum_purchase,
    valid_from,
    valid_until
) VALUES (
    'WELCOME30',
    'Welcome! 30% off your first order',
    'percentage',
    30,
    true,
    'all',
    true,  -- Only for first purchase
    false, -- Not stackable with other discounts
    100,   -- High priority
    0,     -- No minimum purchase
    NOW(),
    NOW() + INTERVAL '1 year'
) ON CONFLICT (code) DO UPDATE SET
    first_purchase_only = true,
    discount_value = 30,
    is_active = true;

-- 2. Create a function to check if it's user's first order
CREATE OR REPLACE FUNCTION is_first_order(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user has any completed orders
    RETURN NOT EXISTS (
        SELECT 1
        FROM orders
        WHERE user_id = p_user_id
        AND payment_status = 'completed'
    );
END;
$$ LANGUAGE plpgsql;

-- 3. Create a function to get first-order discount for authenticated users
CREATE OR REPLACE FUNCTION get_first_order_discount(p_user_id UUID)
RETURNS TABLE (
    discount_id UUID,
    code TEXT,
    description TEXT,
    discount_type TEXT,
    discount_value NUMERIC,
    display TEXT
) AS $$
BEGIN
    -- Only return discount if it's user's first order
    IF p_user_id IS NOT NULL AND is_first_order(p_user_id) THEN
        RETURN QUERY
        SELECT
            dc.id as discount_id,
            dc.code,
            dc.description,
            dc.discount_type,
            dc.discount_value,
            CASE
                WHEN dc.discount_type = 'percentage' THEN dc.discount_value || '% off'
                ELSE '$' || dc.discount_value || ' off'
            END as display
        FROM discount_codes dc
        WHERE dc.code = 'WELCOME30'
        AND dc.is_active = true
        AND dc.first_purchase_only = true
        AND (dc.valid_from IS NULL OR dc.valid_from <= NOW())
        AND (dc.valid_until IS NULL OR dc.valid_until >= NOW());
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION is_first_order TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_first_order_discount TO authenticated, anon;

-- 5. Test queries to verify setup
SELECT
    code,
    description,
    discount_value,
    first_purchase_only
FROM discount_codes
WHERE code = 'WELCOME30';

-- Example: Check if a user qualifies for first-order discount
-- SELECT * FROM get_first_order_discount('user-id-here');