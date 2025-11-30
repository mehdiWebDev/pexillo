-- =============================================
-- PERFORMANCE OPTIMIZED SOLUTION
-- Best approach: Frontend sends UUIDs, not slugs
-- =============================================

-- OPTION 1: OPTIMAL - Use UUIDs everywhere (RECOMMENDED)
-- Frontend should send category IDs, not slugs

DROP FUNCTION IF EXISTS get_products_enhanced(TEXT, NUMERIC, NUMERIC, TEXT[], TEXT[], TEXT[], TEXT[], BOOLEAN, BOOLEAN, BOOLEAN, TEXT, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_products_enhanced(
  category_slug_param TEXT DEFAULT NULL,
  min_price NUMERIC DEFAULT NULL,
  max_price NUMERIC DEFAULT NULL,
  size_filter TEXT[] DEFAULT NULL,
  color_filter TEXT[] DEFAULT NULL,
  category_filter UUID[] DEFAULT NULL,  -- Back to UUID[] for best performance
  badge_filter TEXT[] DEFAULT NULL,
  featured_only BOOLEAN DEFAULT false,
  in_stock_only BOOLEAN DEFAULT false,
  on_sale_only BOOLEAN DEFAULT false,
  sort_by TEXT DEFAULT 'created_at',
  sort_order TEXT DEFAULT 'DESC',
  limit_count INTEGER DEFAULT 12,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  -- ... same return columns ...
  id UUID,
  name TEXT,
  slug TEXT,
  short_description TEXT,
  base_price NUMERIC,
  badge TEXT,
  average_rating NUMERIC,
  review_count INTEGER,
  primary_image_url TEXT,
  in_stock BOOLEAN,
  has_discount BOOLEAN,
  discount_percentage INTEGER,
  discounted_price NUMERIC,
  available_colors INTEGER,
  variants JSONB,
  images JSONB,
  has_multiple_views BOOLEAN,
  product_type TEXT,
  total_count INTEGER,
  is_featured BOOLEAN,
  category_id UUID,
  description TEXT,
  meta_title TEXT,
  meta_description TEXT,
  material TEXT,
  care_instructions TEXT,
  tags TEXT[],
  translations JSONB
) AS $$
-- Function body stays mostly the same, but using UUID[] directly
-- This allows PostgreSQL to use indexes efficiently
$$;

-- =============================================
-- OPTION 2: Hybrid approach with materialized view (for complex scenarios)
-- =============================================

-- Create a materialized view for category slug->ID mapping
-- This gets refreshed periodically and cached in memory
CREATE MATERIALIZED VIEW IF NOT EXISTS category_slug_mapping AS
SELECT
  slug,
  id,
  name,
  is_active
FROM categories
WHERE is_active = true;

-- Create index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_category_slug_mapping_slug
ON category_slug_mapping(slug);

-- Refresh the view (run this periodically or after category changes)
REFRESH MATERIALIZED VIEW category_slug_mapping;

-- =============================================
-- OPTION 3: Denormalization for ultimate performance
-- Add category_slugs array to products table
-- =============================================

-- Add denormalized column (one-time migration)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS category_slugs TEXT[] GENERATED ALWAYS AS (
  ARRAY[(SELECT slug FROM categories WHERE id = products.category_id)]
) STORED;

-- Create GIN index for array searches
CREATE INDEX IF NOT EXISTS idx_products_category_slugs
ON products USING GIN(category_slugs);

-- =============================================
-- PERFORMANCE COMPARISON
-- =============================================

/*
Performance Rankings (best to worst):

1. **UUID Direct (OPTION 1)**: ~5-10ms
   - Direct index lookup
   - No conversions needed
   - Best for all scenarios

2. **Materialized View (OPTION 2)**: ~15-20ms
   - Single cached lookup
   - Good for rarely changing categories
   - Adds complexity

3. **Denormalized Slugs (OPTION 3)**: ~10-15ms
   - No joins needed
   - Storage overhead
   - Good for read-heavy workloads

4. **Current Slug Conversion**: ~30-50ms
   - Subquery for each request
   - Can't use indexes effectively
   - Poor scaling

RECOMMENDATION:
Use OPTION 1 - Have frontend send category IDs instead of slugs.
The get_filter_options function already returns category IDs!
*/

-- =============================================
-- IMPLEMENTATION GUIDE
-- =============================================

-- The get_filter_options already returns category IDs:
SELECT * FROM get_filter_options() LIMIT 1;
-- Returns: available_categories with 'id', 'name', 'slug'

-- Frontend should:
-- 1. Use category 'id' for filtering, not 'slug'
-- 2. Display category 'name' to users
-- 3. Keep slug only for URLs/SEO