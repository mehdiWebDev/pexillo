-- Function to track discount usage when orders are created or updated
CREATE OR REPLACE FUNCTION track_discount_usage()
RETURNS TRIGGER AS $$
BEGIN
    -- Track usage when discount_code_id is present and payment is completed
    -- This handles both INSERT with completed payment and UPDATE to completed
    IF NEW.discount_code_id IS NOT NULL THEN

        -- For INSERT: track if payment is already completed
        IF TG_OP = 'INSERT' AND NEW.payment_status = 'completed' THEN
            -- Update usage count
            UPDATE discount_codes
            SET usage_count = COALESCE(usage_count, 0) + 1
            WHERE id = NEW.discount_code_id;

            -- Log usage
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

            RAISE NOTICE 'Discount usage tracked for order % (INSERT)', NEW.order_number;

        -- For UPDATE: track when payment status changes to completed
        ELSIF TG_OP = 'UPDATE' AND NEW.payment_status = 'completed' AND
              (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN

            -- Update usage count
            UPDATE discount_codes
            SET usage_count = COALESCE(usage_count, 0) + 1
            WHERE id = NEW.discount_code_id;

            -- Log usage
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

            RAISE NOTICE 'Discount usage tracked for order % (UPDATE)', NEW.order_number;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS track_discount_on_order ON orders;

CREATE TRIGGER track_discount_on_order
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION track_discount_usage();