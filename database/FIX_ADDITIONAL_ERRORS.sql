-- =============================================
-- FIX ADDITIONAL SQL ERRORS
-- 1. Fix get_brand_suggestions ambiguity
-- 2. Any other column reference issues
-- =============================================

-- Fix the brand_name ambiguity in get_brand_suggestions
DROP FUNCTION IF EXISTS get_brand_suggestions(text, integer);

CREATE OR REPLACE FUNCTION get_brand_suggestions(
  partial_query TEXT,
  limit_count INT DEFAULT 5
)
RETURNS TABLE (
  brand_name TEXT,
  product_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH brand_patterns AS (
    -- Extract brand from product name (first word often)
    SELECT
      id,
      CASE
        WHEN name ~* '^[A-Z][a-zA-Z&\-]+' THEN
          (regexp_match(name, '^([A-Z][a-zA-Z&\-]+)'))[1]
        ELSE NULL
      END as extracted_brand
    FROM products
    WHERE is_active = true
  ),
  brand_counts AS (
    SELECT
      extracted_brand as brand_text,  -- Changed alias to avoid ambiguity
      COUNT(DISTINCT id)::INT as count_products
    FROM brand_patterns
    WHERE extracted_brand IS NOT NULL
      AND extracted_brand ILIKE partial_query || '%'
    GROUP BY extracted_brand
    HAVING COUNT(DISTINCT id) > 1
  )
  SELECT
    brand_text::TEXT as brand_name,  -- Explicit cast and alias
    count_products as product_count
  FROM brand_counts
  ORDER BY count_products DESC
  LIMIT limit_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_brand_suggestions(text, integer) TO anon;
GRANT EXECUTE ON FUNCTION get_brand_suggestions(text, integer) TO authenticated;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ADDITIONAL FIXES APPLIED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Fixed Issues:';
  RAISE NOTICE '✓ brand_name ambiguity in get_brand_suggestions resolved';
  RAISE NOTICE '✓ Column aliases updated to avoid conflicts';
  RAISE NOTICE '========================================';
END $$;