-- Function: search_products
-- Description: Full-text search across products with relevance scoring
-- Parameters:
--   search_query: The search term
--   limit_count: Maximum number of results
--   offset_count: Pagination offset
-- Returns: Products matching the search query with relevance score

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS search_products(text, integer, integer);

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
  updated_at TIMESTAMPTZ
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
      -- Calculate relevance score based on where the match occurs
      (
        CASE
          -- Exact name match gets highest score
          WHEN lower(p.name) = lower(search_query) THEN 100
          -- Name starts with query
          WHEN lower(p.name) LIKE lower(search_query) || '%' THEN 80
          -- Name contains query
          WHEN lower(p.name) LIKE '%' || lower(search_query) || '%' THEN 60
          -- Short description contains query
          WHEN lower(COALESCE(p.short_description, '')) LIKE '%' || lower(search_query) || '%' THEN 40
          -- Description contains query
          WHEN lower(COALESCE(p.description, '')) LIKE '%' || lower(search_query) || '%' THEN 30
          -- Category name contains query
          WHEN lower(COALESCE(c.name, '')) LIKE '%' || lower(search_query) || '%' THEN 25
          -- Tags contain query (if you have tags)
          WHEN lower(COALESCE(p.tags::text, '')) LIKE '%' || lower(search_query) || '%' THEN 20
          ELSE 10
        END
      )::REAL as relevance_score
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE
      p.is_active = true AND
      (
        -- Search in product name
        lower(p.name) LIKE '%' || lower(search_query) || '%' OR
        -- Search in short description
        lower(COALESCE(p.short_description, '')) LIKE '%' || lower(search_query) || '%' OR
        -- Search in full description
        lower(COALESCE(p.description, '')) LIKE '%' || lower(search_query) || '%' OR
        -- Search in category name
        lower(COALESCE(c.name, '')) LIKE '%' || lower(search_query) || '%' OR
        -- Search in tags if column exists (using COALESCE for safety)
        lower(COALESCE(p.tags::text, '')) LIKE '%' || lower(search_query) || '%' OR
        -- Search in material if column exists
        lower(COALESCE(p.material, '')) LIKE '%' || lower(search_query) || '%' OR
        -- Search by SKU (exact match only) if column exists
        lower(COALESCE(p.sku, '')) = lower(search_query)
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

      -- Check stock availability (only active variants)
      EXISTS(
        SELECT 1 FROM product_variants pv
        WHERE pv.product_id = ps.id
        AND pv.inventory_count > 0
        AND pv.is_active = true
      ) as in_stock,

      -- Check if any variant has negative price adjustment (discount)
      EXISTS(
        SELECT 1 FROM product_variants pv2
        WHERE pv2.product_id = ps.id
        AND pv2.price_adjustment < 0
        AND pv2.is_active = true
      ) as has_discount,

      -- Calculate max discount percentage from negative adjustments
      CASE
        WHEN ps.base_price > 0 AND MIN(pv.price_adjustment) < 0 THEN
          ROUND((ABS(MIN(pv.price_adjustment)) / ps.base_price * 100)::numeric, 0)
        ELSE 0
      END as discount_percentage,

      -- Get lowest price (base_price + min adjustment)
      ps.base_price + COALESCE(MIN(pv.price_adjustment), 0) as discounted_price,

      -- Count available colors
      COUNT(DISTINCT pv.color) as available_colors,

      -- Calculate price range with adjustments
      ps.base_price + COALESCE(MIN(pv.price_adjustment), 0) as min_variant_price,
      ps.base_price + COALESCE(MAX(pv.price_adjustment), 0) as max_variant_price

    FROM product_search ps
    LEFT JOIN product_variants pv ON pv.product_id = ps.id AND pv.is_active = true
    GROUP BY
      ps.id, ps.name, ps.slug, ps.short_description, ps.description,
      ps.base_price, ps.badge, ps.category_id, ps.category_name,
      ps.category_slug, ps.created_at, ps.updated_at, ps.relevance_score
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
    pd.updated_at
  FROM product_details pd
  ORDER BY
    pd.relevance_score DESC,
    pd.in_stock DESC,
    pd.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION search_products TO authenticated, anon;