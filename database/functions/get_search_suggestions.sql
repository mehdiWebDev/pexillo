-- Function to get search suggestions based on partial query
-- Returns query completions from product names and popular searches

DROP FUNCTION IF EXISTS get_search_suggestions(text, integer);

CREATE OR REPLACE FUNCTION get_search_suggestions(
  partial_query TEXT,
  limit_count INT DEFAULT 5
)
RETURNS TABLE (
  suggestion TEXT,
  type TEXT, -- 'product', 'category', 'brand', 'popular'
  relevance_score FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH
  -- Get unique product name suggestions
  product_suggestions AS (
    SELECT DISTINCT
      p.name as suggestion,
      'product'::TEXT as type,
      1.0::FLOAT as relevance_score
    FROM products p
    WHERE p.is_active = true
      AND p.name ILIKE partial_query || '%'
    ORDER BY p.name
    LIMIT limit_count
  ),
  -- Get category suggestions
  category_suggestions AS (
    SELECT DISTINCT
      c.name as suggestion,
      'category'::TEXT as type,
      0.9::FLOAT as relevance_score
    FROM categories c
    WHERE c.status = 'active'
      AND c.name ILIKE '%' || partial_query || '%'
    ORDER BY c.name
    LIMIT limit_count
  ),
  -- Get popular search terms from analytics
  popular_suggestions AS (
    SELECT DISTINCT
      sa.search_query as suggestion,
      'popular'::TEXT as type,
      0.8::FLOAT as relevance_score
    FROM search_analytics sa
    WHERE sa.search_query ILIKE partial_query || '%'
      AND sa.result_count > 0
    GROUP BY sa.search_query
    ORDER BY COUNT(*) DESC
    LIMIT limit_count
  ),
  -- Combine all suggestions
  all_suggestions AS (
    SELECT * FROM product_suggestions
    UNION ALL
    SELECT * FROM category_suggestions
    UNION ALL
    SELECT * FROM popular_suggestions
  )
  SELECT DISTINCT ON (suggestion)
    suggestion,
    type,
    relevance_score
  FROM all_suggestions
  ORDER BY suggestion, relevance_score DESC
  LIMIT limit_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_search_suggestions(text, integer) TO anon;
GRANT EXECUTE ON FUNCTION get_search_suggestions(text, integer) TO authenticated;

-- Function to extract brand names from products (if they're in the name)
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
    -- Common brand name patterns in product names
    -- This is a simplified approach - you might want to add a brands table
    SELECT DISTINCT
      CASE
        WHEN name ~* '^([A-Za-z]+)\s' THEN
          (regexp_match(name, '^([A-Za-z]+)\s'))[1]
        ELSE NULL
      END as brand,
      id
    FROM products
    WHERE is_active = true
  ),
  brand_counts AS (
    SELECT
      brand as brand_name,
      COUNT(DISTINCT id)::INT as product_count
    FROM brand_patterns
    WHERE brand IS NOT NULL
      AND brand ILIKE partial_query || '%'
    GROUP BY brand
    HAVING COUNT(DISTINCT id) > 1  -- Only show brands with multiple products
  )
  SELECT
    brand_name,
    product_count
  FROM brand_counts
  ORDER BY product_count DESC
  LIMIT limit_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_brand_suggestions(text, integer) TO anon;
GRANT EXECUTE ON FUNCTION get_brand_suggestions(text, integer) TO authenticated;