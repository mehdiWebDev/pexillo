-- Simple version: Track discount usage immediately on order creation
-- Since in your flow, payment is confirmed BEFORE the order is created,
-- we can track usage right away on INSERT

CREATE OR REPLACE FUNCTION track_discount_usage()
RETURNS TRIGGER AS $$
BEGIN
    -- Track usage on INSERT if discount code is present
    IF TG_OP = 'INSERT' AND NEW.discount_code_id IS NOT NULL THEN

        -- Update usage count
        UPDATE discount_codes
        SET usage_count = COALESCE(usage_count, 0) + 1
        WHERE id = NEW.discount_code_id;

        -- Create usage record
        INSERT INTO discount_usage (
            discount_id,
            user_id,
            order_id,
            amount_saved
        ) VALUES (
            NEW.discount_code_id,
            NEW.user_id,
            NEW.id,
            COALESCE(NEW.discount_amount, 0)
        ) ON CONFLICT (discount_id, order_id) DO NOTHING;

    -- Also handle UPDATE case for orders created without discount but added later
    ELSIF TG_OP = 'UPDATE' AND NEW.discount_code_id IS NOT NULL AND OLD.discount_code_id IS NULL THEN

        -- Update usage count
        UPDATE discount_codes
        SET usage_count = COALESCE(usage_count, 0) + 1
        WHERE id = NEW.discount_code_id;

        -- Create usage record
        INSERT INTO discount_usage (
            discount_id,
            user_id,
            order_id,
            amount_saved
        ) VALUES (
            NEW.discount_code_id,
            NEW.user_id,
            NEW.id,
            COALESCE(NEW.discount_amount, 0)
        ) ON CONFLICT (discount_id, order_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS track_discount_on_order ON orders;

CREATE TRIGGER track_discount_on_order
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION track_discount_usage();