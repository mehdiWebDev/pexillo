-- VERIFY PER USER LIMIT SETUP
-- Run this to check if everything is configured correctly

-- 1. Check if discount_usage table exists and has correct structure
SELECT 'discount_usage table structure:' as info;
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'discount_usage'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check validate_discount_code function signature
SELECT '---' as spacer;
SELECT 'validate_discount_code function signature:' as info;
SELECT
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'validate_discount_code'
AND n.nspname = 'public';

-- Expected arguments should include:
-- p_code text, p_user_id uuid DEFAULT NULL, p_cart_total numeric DEFAULT 0,
-- p_product_ids uuid[] DEFAULT NULL, p_variant_ids uuid[] DEFAULT NULL,
-- p_category_ids uuid[] DEFAULT NULL, p_cart_items_count integer DEFAULT 0

-- 3. Check if the function has the per-user limit check in its definition
SELECT '---' as spacer;
SELECT 'Function contains per-user limit check:' as info;
SELECT
    CASE
        WHEN pg_get_functiondef(oid) LIKE '%user_usage_limit%' THEN '✅ YES - Function has per-user limit check'
        ELSE '❌ NO - Function missing per-user limit check'
    END as status
FROM pg_proc
WHERE proname = 'validate_discount_code'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 4. Check if record_discount_usage function exists
SELECT '---' as spacer;
SELECT 'record_discount_usage function exists:' as info;
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE p.proname = 'record_discount_usage'
            AND n.nspname = 'public'
        ) THEN '✅ YES - Function exists'
        ELSE '❌ NO - Function missing'
    END as status;

-- 5. Show discount codes with per-user limits
SELECT '---' as spacer;
SELECT 'Discount codes with per-user limits:' as info;
SELECT
    code,
    description,
    user_usage_limit,
    usage_count,
    is_active
FROM discount_codes
WHERE user_usage_limit IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- 6. Check current usage records
SELECT '---' as spacer;
SELECT 'Current discount usage records:' as info;
SELECT COUNT(*) as total_records FROM discount_usage;

-- 7. Sample usage records (if any)
SELECT '---' as spacer;
SELECT 'Sample usage records:' as info;
SELECT
    du.id,
    dc.code as discount_code,
    du.user_id,
    du.order_id,
    du.amount_saved,
    du.used_at
FROM discount_usage du
LEFT JOIN discount_codes dc ON dc.id = du.discount_id
ORDER BY du.used_at DESC
LIMIT 5;

-- 8. NEXT STEPS if validation fails:
SELECT '---' as spacer;
SELECT 'If any checks failed, run this migration:' as info;
SELECT '/database/migrations/fix_user_usage_limit_SAFE.sql' as migration_file;
