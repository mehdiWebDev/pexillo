-- Add discount fields to cart_items table
ALTER TABLE cart_items
ADD COLUMN IF NOT EXISTS original_price NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2);

-- Add comment for documentation
COMMENT ON COLUMN cart_items.original_price IS 'Original price before discount';
COMMENT ON COLUMN cart_items.discount_percentage IS 'Discount percentage applied';
COMMENT ON COLUMN cart_items.discount_amount IS 'Amount saved per unit';