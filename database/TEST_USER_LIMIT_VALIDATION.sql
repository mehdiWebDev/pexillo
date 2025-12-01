-- TEST USER LIMIT VALIDATION
-- Run this in Supabase SQL Editor to test if the validation is working

-- Step 1: Check if the discount_usage table has records
SELECT
    'Current usage records for user 9fffa8d9-bd50-493e-ba46-349e40899155:' as info;

SELECT
    dc.code,
    COUNT(*) as times_used,
    dc.user_usage_limit
FROM discount_usage du
JOIN discount_codes dc ON dc.id = du.discount_id
WHERE du.user_id = '9fffa8d9-bd50-493e-ba46-349e40899155'
GROUP BY dc.code, dc.user_usage_limit;

-- Step 2: Test the validation function directly
SELECT '---' as spacer;
SELECT 'Testing validation for ALL20% (should fail if already used):' as info;

SELECT * FROM validate_discount_code(
    'ALL20%',                                           -- code
    '9fffa8d9-bd50-493e-ba46-349e40899155'::uuid,     -- user_id
    100.00,                                             -- cart_total
    NULL,                                               -- product_ids
    NULL,                                               -- variant_ids
    NULL,                                               -- category_ids
    1                                                   -- cart_items_count
);

-- Step 3: Test with TESTLIMIT
SELECT '---' as spacer;
SELECT 'Testing validation for TESTLIMIT (should fail if already used):' as info;

SELECT * FROM validate_discount_code(
    'TESTLIMIT',                                        -- code
    '9fffa8d9-bd50-493e-ba46-349e40899155'::uuid,     -- user_id
    50.00,                                              -- cart_total
    NULL,                                               -- product_ids
    NULL,                                               -- variant_ids
    NULL,                                               -- category_ids
    1                                                   -- cart_items_count
);

-- Step 4: Check the function definition contains the per-user check
SELECT '---' as spacer;
SELECT 'Checking if function has per-user limit logic:' as info;

SELECT
    CASE
        WHEN pg_get_functiondef(oid) LIKE '%discount_usage%'
        THEN '✅ Function checks discount_usage table'
        ELSE '❌ Function does NOT check discount_usage table'
    END as status,
    CASE
        WHEN pg_get_functiondef(oid) LIKE '%user_usage_limit%'
        THEN '✅ Function checks user_usage_limit field'
        ELSE '❌ Function does NOT check user_usage_limit field'
    END as status2
FROM pg_proc
WHERE proname = 'validate_discount_code'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Step 5: Show the actual per-user usage count check
SELECT '---' as spacer;
SELECT 'Manually checking usage count for ALL20%:' as info;

SELECT
    '88be0f20-aad3-4174-b04c-ddd7298fae14'::uuid as discount_id,
    COUNT(*) as usage_count,
    (SELECT user_usage_limit FROM discount_codes WHERE id = '88be0f20-aad3-4174-b04c-ddd7298fae14'::uuid) as limit
FROM discount_usage
WHERE discount_id = '88be0f20-aad3-4174-b04c-ddd7298fae14'::uuid
AND user_id = '9fffa8d9-bd50-493e-ba46-349e40899155'::uuid;