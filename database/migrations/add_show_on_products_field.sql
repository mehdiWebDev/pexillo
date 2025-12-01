-- Add field to control whether discount shows on product listings
-- This separates checkout codes from product sale prices

-- 1. Add the new field
ALTER TABLE discount_codes
ADD COLUMN IF NOT EXISTS show_on_products BOOLEAN DEFAULT false;

-- 2. Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_discount_codes_show_on_products
ON discount_codes(show_on_products)
WHERE show_on_products = true;

-- 2. Update existing discounts
-- Set all existing discount CODES to NOT show on products (checkout only)
UPDATE discount_codes
SET show_on_products = false
WHERE code IS NOT NULL;

-- 3. Create a comment for clarity
COMMENT ON COLUMN discount_codes.show_on_products IS
'If true, this discount shows as a sale price on product listings. If false, it only works as a checkout code.';

-- 4. Example configurations:

-- First-order discount (checkout code only, not shown on products)
UPDATE discount_codes
SET show_on_products = false
WHERE code = 'WELCOME30';

-- Black Friday Sale (shows on all products)
-- UPDATE discount_codes
-- SET show_on_products = true, code = null
-- WHERE description LIKE '%Black Friday%';

-- 5. Query to check your discounts
SELECT
    code,
    description,
    discount_type,
    discount_value,
    first_purchase_only,
    show_on_products,
    is_active,
    applicable_to
FROM discount_codes
ORDER BY created_at DESC;