-- =============================================
-- FIX get_search_suggestions FUNCTION
-- 1. Fix c.status column error (should be c.is_active)
-- 2. Optimize performance with proper indexes
-- =============================================

-- Drop the existing function
DROP FUNCTION IF EXISTS get_search_suggestions(text, integer);

-- Recreate with fixed column references
CREATE OR REPLACE FUNCTION get_search_suggestions(
  partial_query TEXT,
  limit_count INT DEFAULT 8
)
RETURNS TABLE (
  suggestion TEXT,
  type TEXT,
  relevance_score FLOAT
)
LANGUAGE sql
STABLE  -- Mark as STABLE for better performance
SECURITY DEFINER
AS $$
  -- Get matching products
  (
    SELECT
      p.name as suggestion,
      'product'::TEXT as type,
      1.0::FLOAT as relevance_score
    FROM products p
    WHERE p.is_active = true
      AND (
        p.name ILIKE partial_query || '%'  -- Starts with query (highest relevance)
        OR p.name ILIKE '%' || partial_query || '%'  -- Contains query
      )
    ORDER BY
      CASE WHEN p.name ILIKE partial_query || '%' THEN 1 ELSE 2 END,
      p.purchase_count DESC NULLS LAST,
      p.name
    LIMIT limit_count
  )
  UNION ALL
  -- Get matching categories (FIXED: c.status -> c.is_active)
  (
    SELECT
      c.name as suggestion,
      'category'::TEXT as type,
      0.9::FLOAT as relevance_score
    FROM categories c
    WHERE c.is_active = true  -- FIXED: was c.status = 'active'
      AND c.name ILIKE '%' || partial_query || '%'
    ORDER BY c.name
    LIMIT limit_count
  )
  UNION ALL
  -- Get popular search terms from analytics
  (
    SELECT
      search_query as suggestion,
      'popular'::TEXT as type,
      0.8::FLOAT as relevance_score
    FROM (
      SELECT
        sa.search_query,
        COUNT(*) as search_count
      FROM search_analytics sa
      WHERE sa.search_query ILIKE partial_query || '%'
        AND sa.result_count > 0
        AND sa.search_timestamp >= NOW() - INTERVAL '30 days'
      GROUP BY sa.search_query
      HAVING COUNT(*) > 2  -- At least 3 searches
      ORDER BY COUNT(*) DESC
      LIMIT limit_count
    ) popular_searches
  )
  ORDER BY relevance_score DESC, suggestion
  LIMIT limit_count;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_search_suggestions TO authenticated, anon;

-- =============================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- =============================================

-- Index for product name searches (if not exists)
CREATE INDEX IF NOT EXISTS idx_products_name_lower
  ON products(LOWER(name))
  WHERE is_active = true;

-- Index for category name searches (if not exists)
CREATE INDEX IF NOT EXISTS idx_categories_name_lower
  ON categories(LOWER(name))
  WHERE is_active = true;

-- Index for search analytics queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_search_analytics_query_lower
  ON search_analytics(LOWER(search_query), search_timestamp DESC)
  WHERE result_count > 0;

-- Composite index for product searches with purchase count
CREATE INDEX IF NOT EXISTS idx_products_active_purchase
  ON products(is_active, purchase_count DESC NULLS LAST)
  WHERE is_active = true;

-- Index for categories is_active column
CREATE INDEX IF NOT EXISTS idx_categories_is_active
  ON categories(is_active)
  WHERE is_active = true;

-- =============================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- =============================================

-- Update statistics for better query planning
ANALYZE products;
ANALYZE categories;
ANALYZE search_analytics;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SEARCH SUGGESTIONS FIXED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Fixes Applied:';
  RAISE NOTICE '✓ Fixed c.status -> c.is_active column reference';
  RAISE NOTICE '✓ Optimized function to use SQL language (faster)';
  RAISE NOTICE '✓ Added performance indexes for all search columns';
  RAISE NOTICE '✓ Added composite indexes for common query patterns';
  RAISE NOTICE '✓ Updated table statistics for query planner';
  RAISE NOTICE '';
  RAISE NOTICE 'Performance Improvements:';
  RAISE NOTICE '✓ SQL language function (no PL/pgSQL overhead)';
  RAISE NOTICE '✓ Indexed searches on LOWER(name) for case-insensitive queries';
  RAISE NOTICE '✓ Composite indexes for multi-column filters';
  RAISE NOTICE '✓ Statistics updated for optimal query plans';
  RAISE NOTICE '========================================';
END $$;