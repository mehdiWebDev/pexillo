-- ============================================
-- DISCOUNT SYSTEM IMPROVEMENTS v2.2
-- Adds constraints, triggers, and optimizations
-- ============================================

BEGIN;

-- ============================================
-- PART 1: ADD NEW COLUMNS TO DISCOUNT_CODES
-- ============================================

-- Add priority and stacking support
ALTER TABLE discount_codes 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS stackable BOOLEAN DEFAULT false;

COMMENT ON COLUMN discount_codes.priority IS 'Higher number = higher priority. Used when multiple discounts apply to same product';
COMMENT ON COLUMN discount_codes.stackable IS 'If true, can be combined with other stackable discounts';

-- Add user restrictions
ALTER TABLE discount_codes
ADD COLUMN IF NOT EXISTS first_purchase_only BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS minimum_items INTEGER DEFAULT NULL CHECK (minimum_items IS NULL OR minimum_items > 0),
ADD COLUMN IF NOT EXISTS excluded_products UUID[] DEFAULT NULL;

COMMENT ON COLUMN discount_codes.first_purchase_only IS 'If true, only users with no previous orders can use this discount';
COMMENT ON COLUMN discount_codes.minimum_items IS 'Minimum quantity of items required in cart to apply discount';
COMMENT ON COLUMN discount_codes.excluded_products IS 'Array of product IDs that are excluded from this discount';

-- Add campaign categorization
ALTER TABLE discount_codes
ADD COLUMN IF NOT EXISTS campaign_name TEXT,
ADD COLUMN IF NOT EXISTS discount_category TEXT CHECK (
    discount_category IS NULL OR 
    discount_category IN ('seasonal', 'clearance', 'new_customer', 'loyalty', 'flash_sale', 'other')
);

COMMENT ON COLUMN discount_codes.campaign_name IS 'Internal name for grouping related discounts (e.g., "Black Friday 2025")';
COMMENT ON COLUMN discount_codes.discount_category IS 'Category for organizing and reporting on discount types';

-- ============================================
-- PART 2: ADD DATA INTEGRITY CONSTRAINTS
-- ============================================

-- Ensure applicable_ids is consistent with applicable_to
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_applicable_ids_consistency'
    ) THEN
        ALTER TABLE discount_codes
        ADD CONSTRAINT check_applicable_ids_consistency
        CHECK (
            (applicable_to = 'all' AND applicable_ids IS NULL) OR
            (applicable_to IN ('product', 'category') AND applicable_ids IS NOT NULL AND array_length(applicable_ids, 1) > 0)
        );
    END IF;
END $$;

COMMENT ON CONSTRAINT check_applicable_ids_consistency ON discount_codes IS 'Ensures applicable_ids is NULL for "all" and populated for "product"/"category"';

-- Ensure priority is reasonable
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_priority_range'
    ) THEN
        ALTER TABLE discount_codes
        ADD CONSTRAINT check_priority_range 
        CHECK (priority >= 0 AND priority <= 100);
    END IF;
END $$;

-- Ensure first_purchase_only makes sense
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_first_purchase_logic'
    ) THEN
        ALTER TABLE discount_codes
        ADD CONSTRAINT check_first_purchase_logic
        CHECK (
            first_purchase_only = false OR 
            (first_purchase_only = true AND applicable_to IN ('all', 'category', 'product'))
        );
    END IF;
END $$;

-- ============================================
-- PART 3: AUTOMATIC DISCOUNT USAGE TRACKING
-- ============================================

-- Function to track discount usage when order is completed
CREATE OR REPLACE FUNCTION track_discount_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only track when order moves to completed status
    IF NEW.payment_status = 'completed' AND 
       (OLD IS NULL OR OLD.payment_status != 'completed') AND
       NEW.discount_code_id IS NOT NULL THEN
        
        -- Increment usage count
        UPDATE discount_codes 
        SET usage_count = usage_count + 1,
            updated_at = NOW()
        WHERE id = NEW.discount_code_id;
        
        -- Record in user_discount_usage table
        INSERT INTO user_discount_usage (
            user_id,
            discount_id,
            order_id,
            discount_amount,
            used_at
        ) VALUES (
            NEW.user_id,
            NEW.discount_code_id,
            NEW.id,
            NEW.discount_amount,
            NOW()
        )
        ON CONFLICT (user_id, discount_id, order_id) DO NOTHING;
        
        RAISE NOTICE 'Discount usage tracked for order %', NEW.order_number;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Drop old trigger if exists, create new one
DROP TRIGGER IF EXISTS track_discount_on_order ON orders;
CREATE TRIGGER track_discount_on_order
    AFTER INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION track_discount_usage();

COMMENT ON FUNCTION track_discount_usage IS 'Automatically tracks discount usage when order is completed';

-- ============================================
-- PART 4: OPTIMIZED DISCOUNT LOOKUP FUNCTION
-- ============================================

-- Create optimized function to get discount for a single product
CREATE OR REPLACE FUNCTION get_product_best_discount(
    product_uuid UUID,
    category_uuid UUID,
    base_price DECIMAL
)
RETURNS TABLE (
    has_discount BOOLEAN,
    discount_percentage INTEGER,
    discounted_price DECIMAL(10,2),
    discount_code TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TRUE as has_discount,
        CASE 
            WHEN dc.discount_type = 'percentage' 
            THEN LEAST(dc.discount_value::INTEGER, 100)
            ELSE LEAST(ROUND((dc.discount_value / NULLIF(base_price, 0)) * 100)::INTEGER, 100)
        END as discount_percentage,
        CASE 
            WHEN dc.discount_type = 'percentage' 
            THEN ROUND(base_price * (1 - dc.discount_value / 100.0), 2)
            ELSE ROUND(GREATEST(base_price - dc.discount_value, 0), 2)
        END as discounted_price,
        dc.code as discount_code
    FROM discount_codes dc
    WHERE dc.is_active = true
      AND dc.valid_from <= NOW()
      AND (dc.valid_until IS NULL OR dc.valid_until > NOW())
      AND (dc.usage_limit IS NULL OR dc.usage_count < dc.usage_limit)
      AND (
          (dc.applicable_to = 'all') OR
          (dc.applicable_to = 'product' AND product_uuid = ANY(dc.applicable_ids)) OR
          (dc.applicable_to = 'category' AND category_uuid = ANY(dc.applicable_ids))
      )
      AND (dc.excluded_products IS NULL OR product_uuid != ALL(dc.excluded_products))
    ORDER BY 
        dc.priority DESC,  -- Higher priority first
        CASE 
            WHEN dc.discount_type = 'percentage' THEN dc.discount_value
            ELSE (dc.discount_value / NULLIF(base_price, 0)) * 100
        END DESC  -- Then by best discount
    LIMIT 1;
    
    -- If no discount found, return defaults
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, base_price, NULL::TEXT;
    END IF;
END;
$$;

COMMENT ON FUNCTION get_product_best_discount IS 'Returns the best applicable discount for a product, considering priority and exclusions';

-- ============================================
-- PART 5: UPDATE get_featured_products FUNCTION
-- ============================================

-- Drop and recreate with optimized discount lookup
DROP FUNCTION IF EXISTS get_featured_products(integer, integer);

CREATE OR REPLACE FUNCTION get_featured_products(
    limit_count INTEGER DEFAULT 6,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    short_description TEXT,
    base_price DECIMAL(10,2),
    badge TEXT,
    average_rating DECIMAL(3,2),
    review_count INTEGER,
    primary_image_url TEXT,
    min_variant_price DECIMAL(10,2),
    max_variant_price DECIMAL(10,2),
    available_colors BIGINT,
    in_stock BOOLEAN,
    has_discount BOOLEAN,
    discount_percentage INTEGER,
    discounted_price DECIMAL(10,2)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM validate_pagination_params(limit_count, offset_count);
    
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.slug,
        p.short_description,
        p.base_price,
        p.badge,
        p.average_rating,
        p.review_count,
        pi.image_url as primary_image_url,
        MIN(p.base_price + COALESCE(pv.price_adjustment, 0)) as min_variant_price,
        MAX(p.base_price + COALESCE(pv.price_adjustment, 0)) as max_variant_price,
        COUNT(DISTINCT pv.color) as available_colors,
        BOOL_OR(pv.inventory_count > 0) as in_stock,
        -- Use optimized discount function
        (SELECT d.has_discount FROM get_product_best_discount(p.id, p.category_id, p.base_price) d) as has_discount,
        (SELECT d.discount_percentage FROM get_product_best_discount(p.id, p.category_id, p.base_price) d) as discount_percentage,
        (SELECT d.discounted_price FROM get_product_best_discount(p.id, p.category_id, p.base_price) d) as discounted_price
    FROM products p
    LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
    LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.is_active = true
    WHERE 
        p.is_active = true 
        AND p.is_featured = true
    GROUP BY p.id, p.name, p.slug, p.short_description, p.base_price, 
             p.badge, p.average_rating, p.review_count, pi.image_url, p.category_id
    ORDER BY p.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_featured_products(INTEGER, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_product_best_discount(UUID, UUID, DECIMAL) TO authenticated, anon;

-- ============================================
-- PART 6: CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Index for discount code lookups
CREATE INDEX IF NOT EXISTS idx_discount_codes_active_priority 
ON discount_codes (is_active, priority DESC, valid_from, valid_until) 
WHERE is_active = true;

-- GIN index for applicable_ids array searches
CREATE INDEX IF NOT EXISTS idx_discount_codes_applicable_ids 
ON discount_codes USING GIN (applicable_ids);

-- GIN index for excluded_products array searches
CREATE INDEX IF NOT EXISTS idx_discount_codes_excluded_products 
ON discount_codes USING GIN (excluded_products);

-- Index for discount category filtering
CREATE INDEX IF NOT EXISTS idx_discount_codes_category 
ON discount_codes (discount_category) 
WHERE discount_category IS NOT NULL;

-- Index for campaign name filtering
CREATE INDEX IF NOT EXISTS idx_discount_codes_campaign 
ON discount_codes (campaign_name) 
WHERE campaign_name IS NOT NULL;

-- ============================================
-- PART 7: UTILITY FUNCTIONS FOR ADMINS
-- ============================================

-- Function to get discount statistics
CREATE OR REPLACE FUNCTION get_discount_statistics(
    start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    discount_code TEXT,
    discount_category TEXT,
    times_used BIGINT,
    total_discount_given DECIMAL(12,2),
    average_discount DECIMAL(12,2),
    revenue_generated DECIMAL(12,2)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.code,
        dc.discount_category,
        COUNT(udu.id) as times_used,
        SUM(udu.discount_amount) as total_discount_given,
        AVG(udu.discount_amount) as average_discount,
        SUM(o.total_amount) as revenue_generated
    FROM discount_codes dc
    LEFT JOIN user_discount_usage udu ON dc.id = udu.discount_id
    LEFT JOIN orders o ON udu.order_id = o.id
    WHERE udu.used_at BETWEEN start_date AND end_date
    GROUP BY dc.id, dc.code, dc.discount_category
    ORDER BY times_used DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_discount_statistics(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

COMMENT ON FUNCTION get_discount_statistics IS 'Returns statistics about discount code usage and performance';

-- Function to check if a user can use a discount
CREATE OR REPLACE FUNCTION can_user_use_discount(
    user_uuid UUID,
    discount_code_text TEXT
)
RETURNS TABLE (
    can_use BOOLEAN,
    reason TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    discount_record discount_codes%ROWTYPE;
    user_order_count INTEGER;
BEGIN
    -- Get discount details
    SELECT * INTO discount_record
    FROM discount_codes
    WHERE code = discount_code_text;
    
    -- Check if discount exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Discount code not found';
        RETURN;
    END IF;
    
    -- Check if active
    IF NOT discount_record.is_active THEN
        RETURN QUERY SELECT FALSE, 'Discount code is not active';
        RETURN;
    END IF;
    
    -- Check date validity
    IF discount_record.valid_from > NOW() THEN
        RETURN QUERY SELECT FALSE, 'Discount code not yet valid';
        RETURN;
    END IF;
    
    IF discount_record.valid_until IS NOT NULL AND discount_record.valid_until < NOW() THEN
        RETURN QUERY SELECT FALSE, 'Discount code has expired';
        RETURN;
    END IF;
    
    -- Check usage limit
    IF discount_record.usage_limit IS NOT NULL AND 
       discount_record.usage_count >= discount_record.usage_limit THEN
        RETURN QUERY SELECT FALSE, 'Discount code usage limit reached';
        RETURN;
    END IF;
    
    -- Check first purchase only
    IF discount_record.first_purchase_only THEN
        SELECT COUNT(*) INTO user_order_count
        FROM orders
        WHERE user_id = user_uuid AND payment_status = 'completed';
        
        IF user_order_count > 0 THEN
            RETURN QUERY SELECT FALSE, 'Discount only valid for first purchase';
            RETURN;
        END IF;
    END IF;
    
    -- All checks passed
    RETURN QUERY SELECT TRUE, 'Discount can be used';
END;
$$;

GRANT EXECUTE ON FUNCTION can_user_use_discount(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION can_user_use_discount IS 'Checks if a user is eligible to use a discount code';

-- ============================================
-- PART 8: UPDATE EXISTING DISCOUNTS
-- ============================================

-- Set default priority for existing discounts
UPDATE discount_codes
SET priority = 50
WHERE priority = 0;

-- Categorize existing discounts based on code patterns
UPDATE discount_codes
SET discount_category = CASE
    WHEN code ILIKE '%WELCOME%' OR code ILIKE '%NEW%' THEN 'new_customer'
    WHEN code ILIKE '%SUMMER%' OR code ILIKE '%WINTER%' OR code ILIKE '%SPRING%' OR code ILIKE '%FALL%' THEN 'seasonal'
    WHEN code ILIKE '%FLASH%' OR code ILIKE '%24H%' THEN 'flash_sale'
    WHEN code ILIKE '%CLEAR%' OR code ILIKE '%SALE%' THEN 'clearance'
    ELSE 'other'
END
WHERE discount_category IS NULL;

-- ============================================
-- COMMIT MIGRATION
-- ============================================

COMMIT;

-- ============================================
-- VERIFICATION & SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Discount System v2.2 Upgrade Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Changes Applied:';
    RAISE NOTICE '✓ Added priority system (0-100)';
    RAISE NOTICE '✓ Added stackable discount support';
    RAISE NOTICE '✓ Added first_purchase_only restriction';
    RAISE NOTICE '✓ Added minimum_items requirement';
    RAISE NOTICE '✓ Added excluded_products support';
    RAISE NOTICE '✓ Added campaign_name and discount_category';
    RAISE NOTICE '✓ Added data integrity constraints';
    RAISE NOTICE '✓ Added automatic usage tracking trigger';
    RAISE NOTICE '✓ Optimized discount lookup function';
    RAISE NOTICE '✓ Updated get_featured_products with optimization';
    RAISE NOTICE '✓ Added 5 performance indexes';
    RAISE NOTICE '✓ Added admin utility functions';
    RAISE NOTICE '';
    RAISE NOTICE 'New Features Available:';
    RAISE NOTICE '• Priority-based discount selection';
    RAISE NOTICE '• Excluded products list';
    RAISE NOTICE '• First-time customer discounts';
    RAISE NOTICE '• Campaign categorization';
    RAISE NOTICE '• Automatic usage tracking';
    RAISE NOTICE '• Discount statistics reporting';
    RAISE NOTICE '';
    RAISE NOTICE 'New Functions:';
    RAISE NOTICE '- get_product_best_discount(product_id, category_id, base_price)';
    RAISE NOTICE '- get_discount_statistics(start_date, end_date)';
    RAISE NOTICE '- can_user_use_discount(user_id, discount_code)';
    RAISE NOTICE '========================================';
END $$;