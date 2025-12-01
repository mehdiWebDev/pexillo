-- Simple Auto-Apply Discount Example
-- This creates a basic auto-apply discount without date constraints

-- Create a simple 10% off auto-apply discount for all products
INSERT INTO discount_codes (
    code,
    description,
    discount_type,
    discount_value,
    is_active,
    applicable_to,
    auto_apply,
    priority
) VALUES (
    'AUTO10',
    'Automatic 10% off',
    'percentage',
    10,
    true,
    'all',
    true,  -- This makes it auto-apply
    10     -- Priority
) ON CONFLICT (code) DO UPDATE SET
    auto_apply = true,
    is_active = true;

-- Or update an existing discount to be auto-apply
-- UPDATE discount_codes
-- SET auto_apply = true
-- WHERE code = 'YOUR_EXISTING_CODE';

-- Check auto-apply discounts
SELECT
    code,
    description,
    discount_type,
    discount_value,
    auto_apply,
    is_active
FROM discount_codes
WHERE auto_apply = true;