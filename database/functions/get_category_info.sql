-- Function to get category information by slug
-- Used by the products page to verify category exists and get details

-- Drop existing function if it exists with different signature
DROP FUNCTION IF EXISTS get_category_info(TEXT);

CREATE OR REPLACE FUNCTION get_category_info(category_slug_param TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN,
  sort_order INTEGER,
  product_count BIGINT,
  translations JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.slug,
    c.description,
    c.image_url,
    CASE
      WHEN c.is_active::text = 'true' THEN true
      WHEN c.is_active::text = 'false' THEN false
      ELSE c.is_active::boolean
    END as is_active,
    c.sort_order,
    COUNT(DISTINCT p.id) as product_count,
    c.translations
  FROM categories c
  LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
  WHERE c.slug = category_slug_param
    AND (c.is_active = 'true' OR c.is_active::boolean = true)
  GROUP BY c.id, c.name, c.slug, c.description, c.image_url, c.is_active, c.sort_order, c.translations;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_category_info(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_category_info(TEXT) TO authenticated;