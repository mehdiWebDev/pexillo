-- Create a First-Order Discount Code
-- This discount can be fully managed from the dashboard

-- Create the discount code with all configurable options
INSERT INTO discount_codes (
    code,
    description,
    discount_type,
    discount_value,
    maximum_discount,     -- Cap the discount amount
    minimum_purchase,     -- Optional minimum order amount
    usage_limit,         -- Total number of times it can be used
    is_active,          -- Can be turned on/off
    first_purchase_only, -- KEY: Only for first orders
    stackable,          -- Can it combine with other discounts
    applicable_to,
    valid_from,
    valid_until,
    priority
) VALUES (
    'WELCOME30',                              -- Code
    'Welcome! 30% off your first order',     -- Description
    'percentage',                             -- Type
    30,                                       -- 30% off (you can change this)
    50,                                       -- Maximum $50 discount (protect margins!)
    0,                                        -- No minimum purchase
    1000,                                     -- Can be used 1000 times total
    true,                                     -- Active (turn on/off in dashboard)
    true,                                     -- ONLY for first purchase
    false,                                    -- Not stackable
    'all',                                    -- Applies to all products
    NOW(),                                    -- Valid from now
    NOW() + INTERVAL '6 months',             -- Valid for 6 months
    90                                        -- High priority
) ON CONFLICT (code)
DO UPDATE SET
    -- Update if it already exists
    description = EXCLUDED.description,
    discount_value = EXCLUDED.discount_value,
    maximum_discount = EXCLUDED.maximum_discount,
    first_purchase_only = EXCLUDED.first_purchase_only,
    is_active = EXCLUDED.is_active;

-- Verify the discount was created
SELECT
    code,
    description,
    discount_type,
    discount_value || '%' as percentage,
    '$' || maximum_discount as max_discount,
    CASE WHEN is_active THEN 'Active' ELSE 'Inactive' END as status,
    CASE WHEN first_purchase_only THEN 'Yes' ELSE 'No' END as first_order_only,
    usage_count || '/' || usage_limit as usage
FROM discount_codes
WHERE code = 'WELCOME30';

-- HOW TO MANAGE FROM DASHBOARD:
-- 1. Go to Dashboard > Discounts
-- 2. Find WELCOME30 in the list
-- 3. Click Edit to:
--    - Change percentage (discount_value)
--    - Set maximum discount amount (maximum_discount)
--    - Turn on/off (is_active)
--    - Set usage limits
--    - Change validity dates
-- 4. Save changes

-- EXAMPLES OF DIFFERENT CONFIGURATIONS:

-- Conservative: 10% off, max $20
-- UPDATE discount_codes
-- SET discount_value = 10, maximum_discount = 20
-- WHERE code = 'WELCOME30';

-- Generous: 50% off, max $100
-- UPDATE discount_codes
-- SET discount_value = 50, maximum_discount = 100
-- WHERE code = 'WELCOME30';

-- Temporarily disable
-- UPDATE discount_codes
-- SET is_active = false
-- WHERE code = 'WELCOME30';

-- Set specific date range
-- UPDATE discount_codes
-- SET
--     valid_from = '2024-12-01'::timestamp,
--     valid_until = '2024-12-31'::timestamp
-- WHERE code = 'WELCOME30';