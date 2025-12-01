-- Function to get cart items with discount information
CREATE OR REPLACE FUNCTION get_cart_items_with_discounts(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    product_id UUID,
    variant_id UUID,
    quantity INTEGER,
    unit_price NUMERIC,
    original_price NUMERIC,
    discount_percentage NUMERIC,
    discount_amount NUMERIC,
    customization_price NUMERIC,
    total_price NUMERIC,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    product_name TEXT,
    product_slug TEXT,
    product_image TEXT,
    product_translations JSONB,
    variant_size TEXT,
    variant_color TEXT,
    variant_color_hex TEXT,
    variant_inventory INTEGER,
    variant_translations JSONB,
    has_discount BOOLEAN,
    discounted_price NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ci.id,
        ci.user_id,
        ci.product_id,
        ci.variant_id,
        ci.quantity,
        ci.unit_price,
        -- Calculate original price if there's a discount
        CASE
            WHEN bd.discount_percentage > 0 THEN
                ROUND((p.base_price + COALESCE(pv.price_adjustment, 0))::NUMERIC, 2)
            ELSE
                NULL
        END AS original_price,
        bd.discount_percentage,
        -- Calculate discount amount
        CASE
            WHEN bd.discount_percentage > 0 THEN
                ROUND(((p.base_price + COALESCE(pv.price_adjustment, 0)) * bd.discount_percentage / 100)::NUMERIC, 2)
            ELSE
                NULL
        END AS discount_amount,
        ci.customization_price,
        ci.total_price,
        ci.created_at,
        ci.updated_at,
        p.name AS product_name,
        p.slug AS product_slug,
        p.primary_image_url AS product_image,
        p.translations AS product_translations,
        pv.size AS variant_size,
        pv.color AS variant_color,
        pv.color_hex AS variant_color_hex,
        pv.inventory_count AS variant_inventory,
        pv.translations AS variant_translations,
        CASE WHEN bd.discount_percentage > 0 THEN TRUE ELSE FALSE END AS has_discount,
        bd.final_price AS discounted_price
    FROM cart_items ci
    INNER JOIN products p ON ci.product_id = p.id
    INNER JOIN product_variants pv ON ci.variant_id = pv.id
    LEFT JOIN LATERAL (
        SELECT
            COALESCE(
                -- Check for variant-specific discount
                (SELECT dc.discount_value
                 FROM discount_codes dc
                 WHERE dc.is_active = true
                   AND dc.applicable_to = 'variant'
                   AND pv.id::text = ANY(dc.applicable_ids)
                   AND (dc.valid_from IS NULL OR dc.valid_from <= NOW())
                   AND (dc.valid_until IS NULL OR dc.valid_until >= NOW())
                   AND dc.discount_type = 'percentage'
                 ORDER BY dc.discount_value DESC
                 LIMIT 1),
                -- Check for product-specific discount
                (SELECT dc.discount_value
                 FROM discount_codes dc
                 WHERE dc.is_active = true
                   AND dc.applicable_to = 'product'
                   AND p.id::text = ANY(dc.applicable_ids)
                   AND (dc.valid_from IS NULL OR dc.valid_from <= NOW())
                   AND (dc.valid_until IS NULL OR dc.valid_until >= NOW())
                   AND dc.discount_type = 'percentage'
                 ORDER BY dc.discount_value DESC
                 LIMIT 1),
                -- Check for category discount
                (SELECT dc.discount_value
                 FROM discount_codes dc
                 WHERE dc.is_active = true
                   AND dc.applicable_to = 'category'
                   AND p.category_id::text = ANY(dc.applicable_ids)
                   AND (dc.valid_from IS NULL OR dc.valid_from <= NOW())
                   AND (dc.valid_until IS NULL OR dc.valid_until >= NOW())
                   AND dc.discount_type = 'percentage'
                 ORDER BY dc.discount_value DESC
                 LIMIT 1),
                0
            ) AS discount_percentage,
            ROUND(
                (p.base_price + COALESCE(pv.price_adjustment, 0)) *
                (1 - COALESCE(
                    -- Same discount logic
                    (SELECT dc.discount_value
                     FROM discount_codes dc
                     WHERE dc.is_active = true
                       AND dc.applicable_to = 'variant'
                       AND pv.id::text = ANY(dc.applicable_ids)
                       AND (dc.valid_from IS NULL OR dc.valid_from <= NOW())
                       AND (dc.valid_until IS NULL OR dc.valid_until >= NOW())
                       AND dc.discount_type = 'percentage'
                     ORDER BY dc.discount_value DESC
                     LIMIT 1),
                    (SELECT dc.discount_value
                     FROM discount_codes dc
                     WHERE dc.is_active = true
                       AND dc.applicable_to = 'product'
                       AND p.id::text = ANY(dc.applicable_ids)
                       AND (dc.valid_from IS NULL OR dc.valid_from <= NOW())
                       AND (dc.valid_until IS NULL OR dc.valid_until >= NOW())
                       AND dc.discount_type = 'percentage'
                     ORDER BY dc.discount_value DESC
                     LIMIT 1),
                    (SELECT dc.discount_value
                     FROM discount_codes dc
                     WHERE dc.is_active = true
                       AND dc.applicable_to = 'category'
                       AND p.category_id::text = ANY(dc.applicable_ids)
                       AND (dc.valid_from IS NULL OR dc.valid_from <= NOW())
                       AND (dc.valid_until IS NULL OR dc.valid_until >= NOW())
                       AND dc.discount_type = 'percentage'
                     ORDER BY dc.discount_value DESC
                     LIMIT 1),
                    0
                ) / 100)::NUMERIC, 2
            ) AS final_price
    ) bd ON true
    WHERE ci.user_id = p_user_id
    ORDER BY ci.created_at DESC;
END;
$$;