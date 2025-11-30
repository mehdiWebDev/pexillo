-- Drop all versions of get_products_enhanced function
-- This handles the case where multiple versions exist with different signatures

-- Drop all possible versions (try all known signatures)
DROP FUNCTION IF EXISTS get_products_enhanced(TEXT, NUMERIC, NUMERIC, TEXT[], TEXT[], BOOLEAN, BOOLEAN, TEXT, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_products_enhanced(TEXT, NUMERIC, NUMERIC, TEXT[], TEXT[], TEXT[], TEXT[], BOOLEAN, BOOLEAN, BOOLEAN, TEXT, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_products_enhanced(TEXT, NUMERIC, NUMERIC, TEXT[], TEXT[], UUID[], TEXT[], BOOLEAN, BOOLEAN, BOOLEAN, TEXT, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_products_enhanced(TEXT, NUMERIC, NUMERIC, TEXT[], TEXT[], TEXT[], BOOLEAN, BOOLEAN, TEXT, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_products_enhanced();

-- If the above don't work, find and drop manually using this query first:
-- SELECT routine_name, routine_type, string_agg(parameter_name || ' ' || data_type, ', ') as params
-- FROM information_schema.routines
-- LEFT JOIN information_schema.parameters ON routines.specific_name = parameters.specific_name
-- WHERE routine_name = 'get_products_enhanced'
-- GROUP BY routine_name, routine_type;

-- Then drop using the exact signature found

-- Verify all versions are dropped:
-- SELECT routine_name, routine_type
-- FROM information_schema.routines
-- WHERE routine_name = 'get_products_enhanced';
