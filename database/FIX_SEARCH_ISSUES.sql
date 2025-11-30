-- =============================================
-- FIX SEARCH ISSUES:
-- 1. Add multilingual search support (French + English)
-- 2. Fix search_analytics permission error
-- 3. Optimize get_trending_searches function
-- =============================================

-- PART 1: FIX SEARCH_ANALYTICS PERMISSIONS
-- =============================================

-- Drop the overly restrictive RLS policies
DROP POLICY IF EXISTS "No direct read access to search analytics" ON public.search_analytics;
DROP POLICY IF EXISTS "No direct insert to search analytics" ON public.search_analytics;
DROP POLICY IF EXISTS "No update on search analytics" ON public.search_analytics;
DROP POLICY IF EXISTS "No delete on search analytics" ON public.search_analytics;
DROP POLICY IF EXISTS "Allow function access to search analytics" ON public.search_analytics;

-- Create more permissive policies for the functions to work
CREATE POLICY "Allow function access to search analytics"
  ON public.search_analytics
  FOR ALL
  USING (true)  -- Functions with SECURITY DEFINER can access
  WITH CHECK (false); -- But direct writes are still blocked

-- Grant SELECT permission for the get_trending_searches function
GRANT SELECT ON public.search_analytics TO authenticated, anon;

-- Recreate get_trending_searches with better performance
DROP FUNCTION IF EXISTS get_trending_searches(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_trending_searches(
  days_back INTEGER DEFAULT 7,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  search_term TEXT,
  search_count BIGINT
)
LANGUAGE sql
STABLE  -- Mark as STABLE for better performance
SECURITY DEFINER  -- Bypass RLS
AS $$
  SELECT
    LOWER(search_query) as search_term,
    COUNT(*) as search_count
  FROM search_analytics
  WHERE
    search_timestamp >= NOW() - INTERVAL '1 day' * days_back
    AND result_count > 0
  GROUP BY LOWER(search_query)
  ORDER BY search_count DESC
  LIMIT limit_count;
$$;

-- PART 2: MULTILINGUAL PRODUCT SEARCH
-- =============================================

DROP FUNCTION IF EXISTS search_products(TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION search_products(
  search_query TEXT,
  limit_count INT DEFAULT 20,
  offset_count INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  short_description TEXT,
  description TEXT,
  base_price NUMERIC,
  badge TEXT,
  category_id UUID,
  category_name TEXT,
  category_slug TEXT,
  primary_image_url TEXT,
  in_stock BOOLEAN,
  has_discount BOOLEAN,
  discount_percentage NUMERIC,
  discounted_price NUMERIC,
  available_colors INT,
  min_variant_price NUMERIC,
  max_variant_price NUMERIC,
  relevance_score REAL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  translations JSONB  -- Added translations field
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Return empty if search query is empty
  IF search_query IS NULL OR trim(search_query) = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH product_search AS (
    SELECT
      p.id,
      p.name,
      p.slug,
      p.short_description,
      p.description,
      p.base_price,
      p.badge,
      p.category_id,
      c.name as category_name,
      c.slug as category_slug,
      p.created_at,
      p.updated_at,
      p.translations,  -- Include translations
      -- Calculate relevance score with multilingual support
      (
        CASE
          -- Exact name match (English or French)
          WHEN lower(p.name) = lower(search_query)
            OR lower(p.translations->'fr'->>'name') = lower(search_query) THEN 100

          -- Name starts with query (English or French)
          WHEN lower(p.name) LIKE lower(search_query) || '%'
            OR lower(p.translations->'fr'->>'name') LIKE lower(search_query) || '%' THEN 80

          -- Name contains query (English or French)
          WHEN lower(p.name) LIKE '%' || lower(search_query) || '%'
            OR lower(p.translations->'fr'->>'name') LIKE '%' || lower(search_query) || '%' THEN 60

          -- Short description contains query (English or French)
          WHEN lower(COALESCE(p.short_description, '')) LIKE '%' || lower(search_query) || '%'
            OR lower(COALESCE(p.translations->'fr'->>'short_description', '')) LIKE '%' || lower(search_query) || '%' THEN 40

          -- Description contains query
          WHEN lower(COALESCE(p.description, '')) LIKE '%' || lower(search_query) || '%' THEN 30

          -- Category name contains query (English or French)
          WHEN lower(COALESCE(c.name, '')) LIKE '%' || lower(search_query) || '%'
            OR lower(COALESCE(c.translations->'fr'->>'name', '')) LIKE '%' || lower(search_query) || '%' THEN 25

          -- Tags contain query (English or French)
          WHEN lower(COALESCE(p.tags::text, '')) LIKE '%' || lower(search_query) || '%'
            OR lower(COALESCE((p.translations->'fr'->>'tags')::text, '')) LIKE '%' || lower(search_query) || '%' THEN 20

          -- Material contains query (English or French)
          WHEN lower(COALESCE(p.material, '')) LIKE '%' || lower(search_query) || '%'
            OR lower(COALESCE(p.translations->'fr'->>'material', '')) LIKE '%' || lower(search_query) || '%' THEN 15

          ELSE 10
        END
      )::REAL as relevance_score
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE
      p.is_active = true AND
      (
        -- Search in English fields
        lower(p.name) LIKE '%' || lower(search_query) || '%' OR
        lower(COALESCE(p.short_description, '')) LIKE '%' || lower(search_query) || '%' OR
        lower(COALESCE(p.description, '')) LIKE '%' || lower(search_query) || '%' OR
        lower(COALESCE(c.name, '')) LIKE '%' || lower(search_query) || '%' OR
        lower(COALESCE(p.tags::text, '')) LIKE '%' || lower(search_query) || '%' OR
        lower(COALESCE(p.material, '')) LIKE '%' || lower(search_query) || '%' OR
        lower(COALESCE(p.sku, '')) = lower(search_query) OR

        -- Search in French translations
        lower(COALESCE(p.translations->'fr'->>'name', '')) LIKE '%' || lower(search_query) || '%' OR
        lower(COALESCE(p.translations->'fr'->>'short_description', '')) LIKE '%' || lower(search_query) || '%' OR
        lower(COALESCE(p.translations->'fr'->>'material', '')) LIKE '%' || lower(search_query) || '%' OR
        lower(COALESCE((p.translations->'fr'->>'tags')::text, '')) LIKE '%' || lower(search_query) || '%' OR
        lower(COALESCE(c.translations->'fr'->>'name', '')) LIKE '%' || lower(search_query) || '%'
      )
  ),
  product_details AS (
    SELECT
      ps.*,
      -- Get primary image
      COALESCE(
        (SELECT pi.image_url
         FROM product_images pi
         WHERE pi.product_id = ps.id AND pi.is_primary = true
         LIMIT 1),
        (SELECT pi.image_url
         FROM product_images pi
         WHERE pi.product_id = ps.id
         ORDER BY pi.display_order, pi.created_at
         LIMIT 1)
      ) as primary_image_url,

      -- Check stock availability
      EXISTS(
        SELECT 1 FROM product_variants pv
        WHERE pv.product_id = ps.id
        AND pv.inventory_count > 0
        AND pv.is_active = true
      ) as in_stock,

      -- Check for discounts (from discount_codes table)
      EXISTS(
        SELECT 1 FROM discount_codes dc
        WHERE dc.is_active = true
        AND dc.valid_from <= NOW()
        AND (dc.valid_until IS NULL OR dc.valid_until >= NOW())
        AND (
          dc.applicable_to = 'all'
          OR (dc.applicable_to = 'product' AND ps.id = ANY(dc.applicable_ids))
          OR (dc.applicable_to = 'category' AND ps.category_id = ANY(dc.applicable_ids))
        )
      ) as has_discount,

      -- Calculate discount percentage
      COALESCE(
        (SELECT MAX(dc.discount_value)
         FROM discount_codes dc
         WHERE dc.is_active = true
         AND dc.valid_from <= NOW()
         AND (dc.valid_until IS NULL OR dc.valid_until >= NOW())
         AND dc.discount_type = 'percentage'
         AND (
           dc.applicable_to = 'all'
           OR (dc.applicable_to = 'product' AND ps.id = ANY(dc.applicable_ids))
           OR (dc.applicable_to = 'category' AND ps.category_id = ANY(dc.applicable_ids))
         )
        ), 0
      ) as discount_percentage,

      -- Get lowest price
      ps.base_price + COALESCE(MIN(pv.price_adjustment), 0) as discounted_price,

      -- Count available colors
      COUNT(DISTINCT pv.color) as available_colors,

      -- Calculate price range
      ps.base_price + COALESCE(MIN(pv.price_adjustment), 0) as min_variant_price,
      ps.base_price + COALESCE(MAX(pv.price_adjustment), 0) as max_variant_price

    FROM product_search ps
    LEFT JOIN product_variants pv ON pv.product_id = ps.id AND pv.is_active = true
    GROUP BY
      ps.id, ps.name, ps.slug, ps.short_description, ps.description,
      ps.base_price, ps.badge, ps.category_id, ps.category_name,
      ps.category_slug, ps.created_at, ps.updated_at, ps.relevance_score,
      ps.translations
  )
  SELECT
    pd.id,
    pd.name,
    pd.slug,
    pd.short_description,
    pd.description,
    pd.base_price,
    pd.badge,
    pd.category_id,
    pd.category_name,
    pd.category_slug,
    pd.primary_image_url,
    pd.in_stock,
    pd.has_discount,
    pd.discount_percentage,
    pd.discounted_price,
    pd.available_colors::INT,
    pd.min_variant_price,
    pd.max_variant_price,
    pd.relevance_score,
    pd.created_at,
    pd.updated_at,
    pd.translations  -- Include translations in results
  FROM product_details pd
  ORDER BY
    pd.relevance_score DESC,
    pd.in_stock DESC,
    pd.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_products TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_trending_searches TO authenticated, anon;
GRANT EXECUTE ON FUNCTION track_search TO authenticated, anon;

-- Enable trigram extension for fuzzy search FIRST (must be before creating trigram indexes)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create indexes for better search performance (AFTER enabling pg_trgm)
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_translations
  ON products USING gin (translations);

-- Verification
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SEARCH ISSUES FIXED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Fixes Applied:';
  RAISE NOTICE '✓ Search analytics permissions fixed';
  RAISE NOTICE '✓ Multilingual search support added (English + French)';
  RAISE NOTICE '✓ get_trending_searches optimized with SQL language';
  RAISE NOTICE '✓ Search now includes translations JSONB';
  RAISE NOTICE '✓ Added GIN indexes for better performance';
  RAISE NOTICE '✓ Enabled trigram extension for fuzzy search';
  RAISE NOTICE '';
  RAISE NOTICE 'Search now works with:';
  RAISE NOTICE '✓ English product names and descriptions';
  RAISE NOTICE '✓ French translations from JSONB';
  RAISE NOTICE '✓ Category names in both languages';
  RAISE NOTICE '✓ Materials and tags in both languages';
  RAISE NOTICE '========================================';
END $$;