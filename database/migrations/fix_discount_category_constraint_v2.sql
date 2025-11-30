-- Fix discount_category constraint to match all UI options
-- The constraint is missing 'promotional' and 'referral' options that are in the UI

-- Drop the existing constraint
ALTER TABLE public.discount_codes
DROP CONSTRAINT IF EXISTS discount_codes_discount_category_check;

-- Add the updated constraint with all options from the UI
ALTER TABLE public.discount_codes
ADD CONSTRAINT discount_codes_discount_category_check
CHECK (
    discount_category IS NULL
    OR discount_category IN (
        'seasonal',
        'clearance',
        'new_customer',
        'loyalty',
        'flash_sale',
        'promotional',
        'referral',
        'other'
    )
);

-- Verify the constraint was updated
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.discount_codes'::regclass
AND conname = 'discount_codes_discount_category_check';