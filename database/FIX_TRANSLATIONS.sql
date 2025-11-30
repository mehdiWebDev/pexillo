-- =============================================
-- FIX: Product French translations not showing
-- Run this in Supabase SQL Editor to add translations support
-- =============================================

-- Drop the existing function to recreate with new signature
DROP FUNCTION IF EXISTS get_products_enhanced(TEXT, NUMERIC, NUMERIC, TEXT[], TEXT[], UUID[], TEXT[], BOOLEAN, BOOLEAN, BOOLEAN, TEXT, TEXT, INTEGER, INTEGER);

-- Recreate get_products_enhanced with translations support
CREATE OR REPLACE FUNCTION get_products_enhanced(
  category_slug_param TEXT DEFAULT NULL,
  min_price NUMERIC DEFAULT NULL,
  max_price NUMERIC DEFAULT NULL,
  size_filter TEXT[] DEFAULT NULL,
  color_filter TEXT[] DEFAULT NULL,
  category_filter UUID[] DEFAULT NULL,
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
  v_min_price NUMERIC := min_price;
  v_max_price NUMERIC := max_price;
  v_size_filter TEXT[] := size_filter;
  v_color_filter TEXT[] := color_filter;
  v_category_filter UUID[] := category_filter;
  v_badge_filter TEXT[] := badge_filter;
  v_featured_only BOOLEAN := featured_only;
  v_in_stock_only BOOLEAN := in_stock_only;
  v_on_sale_only BOOLEAN := on_sale_only;
  v_sort_by TEXT := sort_by;
  v_sort_order TEXT := sort_order;
  v_limit INTEGER := limit_count;
  v_offset INTEGER := offset_count;
BEGIN
  -- Get category ID if category slug is provided
  IF category_slug_param IS NOT NULL THEN
    SELECT c.id INTO v_category_id
    FROM categories c
    WHERE c.slug = category_slug_param AND c.is_active = true;
  END IF;

  -- Count total matching products
  SELECT COUNT(DISTINCT p.id)::INTEGER INTO v_total_count
  FROM products p
  WHERE p.is_active = true
    AND (v_category_id IS NULL OR p.category_id = v_category_id)
    AND (v_category_filter IS NULL OR p.category_id = ANY(v_category_filter))
    AND (v_badge_filter IS NULL OR p.badge = ANY(v_badge_filter))
    AND (NOT v_featured_only OR p.is_featured = true)
    AND (v_min_price IS NULL OR p.base_price >= v_min_price)
    AND (v_max_price IS NULL OR p.base_price <= v_max_price)
    AND (
      NOT v_on_sale_only
      OR EXISTS (
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
              WHERE pv2.product_id = p.id AND pv2.id = ANY(dc.applicable_ids)
            ))
          )
      )
    )
    AND (
      v_size_filter IS NULL
      OR EXISTS (
        SELECT 1 FROM product_variants pv
        WHERE pv.product_id = p.id
          AND pv.size = ANY(v_size_filter)
          AND pv.is_active = true
          AND (NOT v_in_stock_only OR pv.inventory_count > 0)
      )
    )
    AND (
      v_color_filter IS NULL
      OR EXISTS (
        SELECT 1 FROM product_variants pv
        WHERE pv.product_id = p.id
          AND pv.color = ANY(v_color_filter)
          AND pv.is_active = true
      )
    );

  RETURN QUERY
  WITH filtered_products AS (
    SELECT DISTINCT p.*
    FROM products p
    WHERE p.is_active = true
      AND (v_category_id IS NULL OR p.category_id = v_category_id)
      AND (v_category_filter IS NULL OR p.category_id = ANY(v_category_filter))
      AND (v_badge_filter IS NULL OR p.badge = ANY(v_badge_filter))
      AND (NOT v_featured_only OR p.is_featured = true)
      AND (v_min_price IS NULL OR p.base_price >= v_min_price)
      AND (v_max_price IS NULL OR p.base_price <= v_max_price)
      AND (
        NOT v_on_sale_only
        OR EXISTS (
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
                WHERE pv2.product_id = p.id AND pv2.id = ANY(dc.applicable_ids)
              ))
            )
        )
      )
      AND (
        v_size_filter IS NULL
        OR EXISTS (
          SELECT 1 FROM product_variants pv
          WHERE pv.product_id = p.id
            AND pv.size = ANY(v_size_filter)
            AND pv.is_active = true
            AND (NOT v_in_stock_only OR pv.inventory_count > 0)
        )
      )
      AND (
        v_color_filter IS NULL
        OR EXISTS (
          SELECT 1 FROM product_variants pv
          WHERE pv.product_id = p.id
            AND pv.color = ANY(v_color_filter)
            AND pv.is_active = true
        )
      )
  ),

  -- Get variant discounts
  variant_discounts AS (
    SELECT
      pv.id as variant_id,
      pv.product_id,
      vd.*
    FROM product_variants pv
    INNER JOIN filtered_products p ON p.id = pv.product_id
    CROSS JOIN LATERAL get_variant_discount(
      pv.id,
      p.id,
      p.category_id,
      p.base_price + COALESCE(pv.price_adjustment, 0)
    ) vd
    WHERE pv.is_active = true
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
      COUNT(DISTINCT pv.color) AS color_count,
      BOOL_OR(pv.inventory_count > 0) AS has_stock,
      BOOL_OR(COALESCE(vd.has_discount, false)) AS any_variant_has_discount
    FROM product_variants pv
    INNER JOIN filtered_products p ON p.id = pv.product_id
    LEFT JOIN variant_discounts vd ON vd.variant_id = pv.id
    WHERE pv.is_active = true
    GROUP BY pv.product_id, p.id, p.base_price, p.category_id
  ),

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
    WHERE pi.product_id IN (SELECT fp.id FROM filtered_products fp)
    GROUP BY pi.product_id
  ),

  -- Get product-level discount
  product_discount AS (
    SELECT
      p.id,
      (SELECT d.has_discount FROM get_product_best_discount(p.id, p.category_id, p.base_price) d) AS has_discount,
      (SELECT d.discount_percentage FROM get_product_best_discount(p.id, p.category_id, p.base_price) d) AS discount_percentage,
      (SELECT d.discounted_price FROM get_product_best_discount(p.id, p.category_id, p.base_price) d) AS discounted_price
    FROM filtered_products p
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
    COALESCE(pd.has_discount, pvar.any_variant_has_discount, false) AS has_discount,
    COALESCE(pd.discount_percentage, 0)::INTEGER AS discount_percentage,
    COALESCE(pd.discounted_price, p.base_price) AS discounted_price,
    COALESCE(pvar.color_count, 0)::INTEGER AS available_colors,
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
  LEFT JOIN product_discount pd ON pd.id = p.id

  ORDER BY
    CASE WHEN v_sort_by = 'created_at' AND v_sort_order = 'DESC' THEN p.created_at END DESC,
    CASE WHEN v_sort_by = 'created_at' AND v_sort_order = 'ASC' THEN p.created_at END ASC,
    CASE WHEN v_sort_by = 'price' AND v_sort_order = 'ASC' THEN p.base_price END ASC,
    CASE WHEN v_sort_by = 'price' AND v_sort_order = 'DESC' THEN p.base_price END DESC,
    CASE WHEN v_sort_by = 'rating' AND v_sort_order = 'DESC' THEN p.average_rating END DESC,
    CASE WHEN v_sort_by = 'rating' AND v_sort_order = 'ASC' THEN p.average_rating END ASC,
    CASE WHEN v_sort_by = 'popular' AND v_sort_order = 'DESC' THEN p.purchase_count END DESC,
    CASE WHEN v_sort_by = 'popular' AND v_sort_order = 'ASC' THEN p.purchase_count END ASC,
    CASE WHEN v_sort_by = 'name' AND v_sort_order = 'ASC' THEN p.name END ASC,
    CASE WHEN v_sort_by = 'name' AND v_sort_order = 'DESC' THEN p.name END DESC,
    p.created_at DESC

  LIMIT v_limit
  OFFSET v_offset;

END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_products_enhanced(TEXT, NUMERIC, NUMERIC, TEXT[], TEXT[], UUID[], TEXT[], BOOLEAN, BOOLEAN, BOOLEAN, TEXT, TEXT, INTEGER, INTEGER) TO authenticated, anon;

-- Test to verify translations are included
SELECT id, name, slug, translations
FROM get_products_enhanced()
LIMIT 2;