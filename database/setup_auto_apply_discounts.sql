-- Setup Auto-Apply Discounts

-- 1. Example: Create an auto-apply discount for all products
-- This discount will automatically apply at checkout without needing a code
INSERT INTO discount_codes (
    code,
    description,
    discount_type,
    discount_value,
    minimum_purchase,
    is_active,
    valid_from,
    valid_until,
    applicable_to,
    auto_apply,          -- This makes it auto-apply
    priority,            -- Higher priority applies first
    stackable,           -- Can be combined with other discounts
    campaign_name
) VALUES (
    'AUTO_WINTER_SALE',
    'Winter Sale - 10% off everything',
    'percentage',
    10,
    50.00,              -- Minimum $50 purchase
    true,
    NOW(),
    NOW() + INTERVAL '3 months',  -- Valid for 3 months from now
    'all',              -- Applies to all products
    true,               -- AUTO-APPLY: This is the key field
    10,                 -- Priority (higher number = higher priority)
    false,              -- Not stackable with other discounts
    'Winter Sale 2024-2025'
) ON CONFLICT (code) DO UPDATE SET
    auto_apply = true,
    is_active = true,
    valid_until = NOW() + INTERVAL '3 months';

-- 2. Example: Auto-apply for specific category
INSERT INTO discount_codes (
    code,
    description,
    discount_type,
    discount_value,
    is_active,
    applicable_to,
    applicable_ids,      -- Category IDs
    auto_apply,
    priority,
    stackable,
    campaign_name
) VALUES (
    'AUTO_TSHIRT_PROMO',
    'T-Shirt Special - 15% off',
    'percentage',
    15,
    true,
    'category',
    ARRAY['YOUR_TSHIRT_CATEGORY_ID']::uuid[],  -- Replace with actual category ID
    true,
    20,                 -- Higher priority than general sale
    false,
    'T-Shirt Promotion'
) ON CONFLICT (code) DO NOTHING;

-- 3. Example: Auto-apply for new customers only
INSERT INTO discount_codes (
    code,
    description,
    discount_type,
    discount_value,
    is_active,
    applicable_to,
    auto_apply,
    first_purchase_only,
    priority,
    campaign_name
) VALUES (
    'AUTO_WELCOME10',
    'Welcome - 10% off your first order',
    'percentage',
    10,
    true,
    'all',
    true,
    true,               -- First purchase only
    5,
    'New Customer Welcome'
) ON CONFLICT (code) DO NOTHING;

-- 4. Query to see all auto-apply discounts
SELECT
    code,
    description,
    discount_type,
    discount_value,
    auto_apply,
    priority,
    stackable,
    is_active,
    valid_from,
    valid_until
FROM discount_codes
WHERE auto_apply = true
AND is_active = true
ORDER BY priority DESC;

-- 5. Update existing discount to be auto-apply
-- UPDATE discount_codes
-- SET auto_apply = true,
--     priority = 15
-- WHERE code = 'YOUR_EXISTING_CODE';

-- 6. Disable auto-apply for a discount
-- UPDATE discount_codes
-- SET auto_apply = false
-- WHERE code = 'AUTO_WINTER_SALE';