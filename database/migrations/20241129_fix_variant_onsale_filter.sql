-- =============================================
-- Migration: Fix On Sale filter to detect variant-specific discounts
-- Date: 2024-11-29
-- Description: Updates get_products_enhanced and get_filter_options functions
--              to properly detect products with variant-level discounts
-- =============================================

-- Drop existing function
DROP FUNCTION IF EXISTS get_products_enhanced(TEXT, NUMERIC, NUMERIC, TEXT[], TEXT[], UUID[], TEXT[], BOOLEAN, BOOLEAN, BOOLEAN, TEXT, TEXT, INTEGER, INTEGER);

-- Recreate with fixed variant discount detection in On Sale filter
CREATE OR REPLACE FUNCTION get_products_enhanced(
  category_slug_param TEXT DEFAULT NULL,
  min_price NUMERIC DEFAULT NULL,
  max_price NUMERIC DEFAULT NULL,
  size_filter TEXT[] DEFAULT NULL,
  color_filter TEXT[] DEFAULT NULL,
  category_id_filter UUID[] DEFAULT NULL,
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
DECLARE
  v_category_id UUID;
  v_total_count INTEGER;
BEGIN
  -- Get main category ID from URL slug
  IF category_slug_param IS NOT NULL THEN
    SELECT c.id INTO v_category_id
    FROM categories c
    WHERE c.slug = category_slug_param
      AND c.is_active = true
    LIMIT 1;
  END IF;

  -- Count total matching products
  SELECT COUNT(DISTINCT p.id)::INTEGER INTO v_total_count
  FROM products p
  WHERE p.is_active = true
    AND (v_category_id IS NULL OR p.category_id = v_category_id)
    AND (category_id_filter IS NULL OR cardinality(category_id_filter) = 0 OR p.category_id = ANY(category_id_filter))
    AND (badge_filter IS NULL OR cardinality(badge_filter) = 0 OR p.badge = ANY(badge_filter))
    AND (NOT featured_only OR p.is_featured = true)
    AND (min_price IS NULL OR p.base_price >= min_price)
    AND (max_price IS NULL OR p.base_price <= max_price)
    AND (size_filter IS NULL OR cardinality(size_filter) = 0 OR EXISTS (
      SELECT 1 FROM product_variants pv2
      WHERE pv2.product_id = p.id
        AND pv2.is_active = true
        AND pv2.size = ANY(size_filter)
        AND (NOT in_stock_only OR pv2.inventory_count > 0)
    ))
    AND (color_filter IS NULL OR cardinality(color_filter) = 0 OR EXISTS (
      SELECT 1 FROM product_variants pv3
      WHERE pv3.product_id = p.id
        AND pv3.is_active = true
        AND pv3.color = ANY(color_filter)
    ))
    AND (NOT in_stock_only OR EXISTS (
      SELECT 1 FROM product_variants pv4
      WHERE pv4.product_id = p.id
        AND pv4.is_active = true
        AND pv4.inventory_count > 0
    ))
    -- FIXED: On sale filter now includes variant-specific discounts
    AND (NOT on_sale_only OR EXISTS (
      SELECT 1 FROM discount_codes dc
      WHERE dc.is_active = true
        AND dc.valid_from <= NOW()
        AND (dc.valid_until IS NULL OR dc.valid_until >= NOW())
        AND (
          dc.applicable_to = 'all'
          OR (dc.applicable_to = 'product' AND p.id = ANY(dc.applicable_ids))
          OR (dc.applicable_to = 'category' AND p.category_id = ANY(dc.applicable_ids))
          OR (dc.applicable_to = 'variant' AND EXISTS (
            SELECT 1 FROM product_variants pv5
            WHERE pv5.product_id = p.id
              AND pv5.id = ANY(dc.applicable_ids)
              AND pv5.is_active = true
          ))
        )
    ));

  -- Main query
  RETURN QUERY
  WITH filtered_products AS (
    SELECT DISTINCT p.*
    FROM products p
    WHERE p.is_active = true
      AND (v_category_id IS NULL OR p.category_id = v_category_id)
      AND (category_id_filter IS NULL OR cardinality(category_id_filter) = 0 OR p.category_id = ANY(category_id_filter))
      AND (badge_filter IS NULL OR cardinality(badge_filter) = 0 OR p.badge = ANY(badge_filter))
      AND (NOT featured_only OR p.is_featured = true)
      AND (min_price IS NULL OR p.base_price >= min_price)
      AND (max_price IS NULL OR p.base_price <= max_price)
      AND (size_filter IS NULL OR cardinality(size_filter) = 0 OR EXISTS (
        SELECT 1 FROM product_variants pv2
        WHERE pv2.product_id = p.id
          AND pv2.is_active = true
          AND pv2.size = ANY(size_filter)
          AND (NOT in_stock_only OR pv2.inventory_count > 0)
      ))
      AND (color_filter IS NULL OR cardinality(color_filter) = 0 OR EXISTS (
        SELECT 1 FROM product_variants pv3
        WHERE pv3.product_id = p.id
          AND pv3.is_active = true
          AND pv3.color = ANY(color_filter)
      ))
      AND (NOT in_stock_only OR EXISTS (
        SELECT 1 FROM product_variants pv4
        WHERE pv4.product_id = p.id
          AND pv4.is_active = true
          AND pv4.inventory_count > 0
      ))
      -- FIXED: On sale filter now includes variant-specific discounts
      AND (NOT on_sale_only OR EXISTS (
        SELECT 1 FROM discount_codes dc
        WHERE dc.is_active = true
          AND dc.valid_from <= NOW()
          AND (dc.valid_until IS NULL OR dc.valid_until >= NOW())
          AND (
            dc.applicable_to = 'all'
            OR (dc.applicable_to = 'product' AND p.id = ANY(dc.applicable_ids))
            OR (dc.applicable_to = 'category' AND p.category_id = ANY(dc.applicable_ids))
            OR (dc.applicable_to = 'variant' AND EXISTS (
              SELECT 1 FROM product_variants pv5
              WHERE pv5.product_id = p.id
                AND pv5.id = ANY(dc.applicable_ids)
                AND pv5.is_active = true
            ))
          )
      ))
  ),

  -- Aggregate variants with discount info
  product_variants_agg AS (
    SELECT
      pv.product_id,
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'id', pv.id,
          'size', pv.size,
          'color', pv.color,
          'color_hex', pv.color_hex,
          'price_adjustment', pv.price_adjustment,
          'inventory_count', pv.inventory_count,
          'is_active', pv.is_active,
          'has_discount', COALESCE(vd.has_discount, false),
          'discount_percentage', COALESCE(vd.discount_percentage, 0),
          'discounted_price', COALESCE(vd.discounted_price, p.base_price + COALESCE(pv.price_adjustment, 0)),
          'final_price', p.base_price + COALESCE(pv.price_adjustment, 0),
          'translations', pv.translations
        ) ORDER BY pv.size, pv.color
      ) AS variants,
      COUNT(DISTINCT pv.color)::INTEGER AS color_count,
      BOOL_OR(pv.inventory_count > 0) AS has_stock,
      BOOL_OR(COALESCE(vd.has_discount, false)) AS any_variant_has_discount
    FROM product_variants pv
    INNER JOIN filtered_products p ON p.id = pv.product_id
    LEFT JOIN LATERAL get_variant_discount(
      pv.id,
      p.id,
      p.category_id,
      p.base_price + COALESCE(pv.price_adjustment, 0)
    ) vd ON true
    WHERE pv.is_active = true
    GROUP BY pv.product_id
  ),

  -- Aggregate images
  product_images_agg AS (
    SELECT
      pi.product_id,
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'id', pi.id,
          'image_url', pi.image_url,
          'alt_text', COALESCE(pi.alt_text, ''),
          'is_primary', pi.is_primary,
          'view_type', COALESCE(pi.view_type, 'front'),
          'display_order', COALESCE(pi.display_order, 1),
          'variant_id', pi.variant_id
        ) ORDER BY pi.display_order, pi.is_primary DESC
      ) AS images,
      MAX(CASE WHEN pi.is_primary THEN pi.image_url END) AS primary_url,
      COUNT(DISTINCT pi.view_type) > 1 AS has_multiple_views
    FROM product_images pi
    INNER JOIN filtered_products fp ON fp.id = pi.product_id
    GROUP BY pi.product_id
  )

  SELECT
    p.id,
    p.name,
    p.slug,
    COALESCE(p.short_description, '') AS short_description,
    p.base_price,
    p.badge,
    COALESCE(p.average_rating, 0) AS average_rating,
    COALESCE(p.review_count, 0) AS review_count,
    COALESCE(pimg.primary_url, '') AS primary_image_url,
    COALESCE(pvar.has_stock, false) AS in_stock,
    COALESCE(
      (SELECT d.has_discount FROM get_product_best_discount(p.id, p.category_id, p.base_price) d),
      pvar.any_variant_has_discount,
      false
    ) AS has_discount,
    COALESCE(
      (SELECT d.discount_percentage FROM get_product_best_discount(p.id, p.category_id, p.base_price) d),
      0
    )::INTEGER AS discount_percentage,
    COALESCE(
      (SELECT d.discounted_price FROM get_product_best_discount(p.id, p.category_id, p.base_price) d),
      p.base_price
    ) AS discounted_price,
    COALESCE(pvar.color_count, 0) AS available_colors,
    COALESCE(pvar.variants, '[]'::JSONB) AS variants,
    COALESCE(pimg.images, '[]'::JSONB) AS images,
    COALESCE(pimg.has_multiple_views, false) AS has_multiple_views,
    'apparel' AS product_type,
    v_total_count AS total_count,
    p.is_featured,
    p.category_id,
    p.description,
    p.meta_title,
    p.meta_description,
    p.material,
    p.care_instructions,
    p.tags,
    p.translations

  FROM filtered_products p
  LEFT JOIN product_variants_agg pvar ON pvar.product_id = p.id
  LEFT JOIN product_images_agg pimg ON pimg.product_id = p.id

  ORDER BY
    CASE WHEN sort_by = 'created_at' AND sort_order = 'DESC' THEN p.created_at END DESC,
    CASE WHEN sort_by = 'created_at' AND sort_order = 'ASC' THEN p.created_at END ASC,
    CASE WHEN sort_by = 'price' AND sort_order = 'ASC' THEN p.base_price END ASC,
    CASE WHEN sort_by = 'price' AND sort_order = 'DESC' THEN p.base_price END DESC,
    CASE WHEN sort_by = 'rating' AND sort_order = 'DESC' THEN p.average_rating END DESC,
    CASE WHEN sort_by = 'rating' AND sort_order = 'ASC' THEN p.average_rating END ASC,
    CASE WHEN sort_by = 'popular' AND sort_order = 'DESC' THEN p.purchase_count END DESC,
    CASE WHEN sort_by = 'popular' AND sort_order = 'ASC' THEN p.purchase_count END ASC,
    CASE WHEN sort_by = 'name' AND sort_order = 'ASC' THEN p.name END ASC,
    CASE WHEN sort_by = 'name' AND sort_order = 'DESC' THEN p.name END DESC,
    p.created_at DESC

  LIMIT limit_count
  OFFSET offset_count;

END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_products_enhanced TO authenticated, anon;

-- Also fix the get_filter_options function to count variant discounts
DROP FUNCTION IF EXISTS get_filter_options(TEXT);

CREATE OR REPLACE FUNCTION get_filter_options(
  category_slug_param TEXT DEFAULT NULL
)
RETURNS TABLE (
  available_sizes TEXT[],
  available_colors JSONB,
  available_categories JSONB,
  available_badges TEXT[],
  min_price NUMERIC,
  max_price NUMERIC,
  total_products INTEGER,
  products_on_sale INTEGER,
  featured_products INTEGER
) AS $$
DECLARE
  v_category_id UUID;
BEGIN
  -- Get category ID if slug provided
  IF category_slug_param IS NOT NULL THEN
    SELECT c.id INTO v_category_id
    FROM categories c
    WHERE c.slug = category_slug_param AND c.is_active = true;
  END IF;

  RETURN QUERY
  SELECT
    -- Available sizes
    ARRAY(
      SELECT DISTINCT pv.size
      FROM product_variants pv
      INNER JOIN products p ON p.id = pv.product_id
      WHERE p.is_active = true
        AND pv.is_active = true
        AND pv.size IS NOT NULL
        AND (v_category_id IS NULL OR p.category_id = v_category_id)
      ORDER BY pv.size
    ) AS available_sizes,

    -- Available colors
    (
      SELECT JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'color', color_data.color,
          'hex', color_data.hex,
          'count', color_data.count
        )
      )
      FROM (
        SELECT
          pv.color,
          MAX(pv.color_hex) AS hex,
          COUNT(DISTINCT pv.product_id) AS count
        FROM product_variants pv
        INNER JOIN products p ON p.id = pv.product_id
        WHERE p.is_active = true
          AND pv.is_active = true
          AND pv.color IS NOT NULL
          AND (v_category_id IS NULL OR p.category_id = v_category_id)
        GROUP BY pv.color
        ORDER BY pv.color
      ) AS color_data
    ) AS available_colors,

    -- Available categories with UUIDs
    (
      SELECT JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'id', cat_data.id,
          'name', cat_data.name,
          'slug', cat_data.slug,
          'count', cat_data.count
        )
      )
      FROM (
        SELECT
          c.id,
          c.name,
          c.slug,
          COUNT(DISTINCT p.id) AS count
        FROM categories c
        INNER JOIN products p ON p.category_id = c.id
        WHERE c.is_active = true
          AND p.is_active = true
          AND (v_category_id IS NULL OR c.id = v_category_id)
        GROUP BY c.id, c.name, c.slug
        ORDER BY c.sort_order, c.name
      ) AS cat_data
    ) AS available_categories,

    -- Available badges
    ARRAY(
      SELECT DISTINCT p.badge
      FROM products p
      WHERE p.is_active = true
        AND p.badge IS NOT NULL
        AND (v_category_id IS NULL OR p.category_id = v_category_id)
      ORDER BY p.badge
    ) AS available_badges,

    -- Price range
    COALESCE(MIN(p.base_price), 0) AS min_price,
    COALESCE(MAX(p.base_price), 1000) AS max_price,

    -- Product counts
    COUNT(DISTINCT p.id)::INTEGER AS total_products,

    -- FIXED: Products on sale - now includes variant discounts
    COUNT(DISTINCT
      CASE
        WHEN EXISTS (
          SELECT 1 FROM discount_codes dc
          WHERE dc.is_active = true
            AND dc.valid_from <= NOW()
            AND (dc.valid_until IS NULL OR dc.valid_until >= NOW())
            AND (
              dc.applicable_to = 'all'
              OR (dc.applicable_to = 'product' AND p.id = ANY(dc.applicable_ids))
              OR (dc.applicable_to = 'category' AND p.category_id = ANY(dc.applicable_ids))
              OR (dc.applicable_to = 'variant' AND EXISTS (
                SELECT 1 FROM product_variants pv2
                WHERE pv2.product_id = p.id
                  AND pv2.id = ANY(dc.applicable_ids)
                  AND pv2.is_active = true
              ))
            )
        ) THEN p.id
        ELSE NULL
      END
    )::INTEGER AS products_on_sale,

    -- Featured products
    COUNT(DISTINCT CASE WHEN p.is_featured = true THEN p.id ELSE NULL END)::INTEGER AS featured_products

  FROM products p
  WHERE p.is_active = true
    AND (v_category_id IS NULL OR p.category_id = v_category_id);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_filter_options TO authenticated, anon;