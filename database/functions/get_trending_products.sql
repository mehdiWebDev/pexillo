-- Function: get_trending_products
-- Description: Get trending products based on views and purchases

CREATE OR REPLACE FUNCTION get_trending_products(
  days_back INTEGER DEFAULT 30,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  product_name TEXT,
  product_slug TEXT,
  popularity_score NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.name as product_name,
    p.slug as product_slug,
    -- Calculate popularity score based on:
    -- 70% purchase weight, 30% view weight
    (p.purchase_count * 0.7 + p.view_count * 0.3) as popularity_score
  FROM products p
  WHERE
    p.is_active = true
    AND p.updated_at >= NOW() - INTERVAL '1 day' * days_back
  ORDER BY popularity_score DESC
  LIMIT limit_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_trending_products TO authenticated, anon;