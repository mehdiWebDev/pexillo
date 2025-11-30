-- Fix for applicable_ids consistency check
-- This migration relaxes the constraint to allow 'user' type and handles empty arrays

-- First, let's drop the existing constraint
ALTER TABLE public.discount_codes
DROP CONSTRAINT IF EXISTS check_applicable_ids_consistency;

-- Add the updated constraint that handles empty arrays, 'user' and 'variant' types
ALTER TABLE public.discount_codes
ADD CONSTRAINT check_applicable_ids_consistency
CHECK (
    (
        -- If applicable_to is 'all' or 'user', applicable_ids should be null
        (applicable_to IN ('all', 'user'))
        AND (applicable_ids IS NULL)
    )
    OR (
        -- If applicable_to is 'product', 'category', or 'variant', applicable_ids can be provided
        -- But we'll handle empty arrays in the application logic
        (applicable_to IN ('product', 'category', 'variant'))
        AND (
            applicable_ids IS NULL
            OR array_length(applicable_ids, 1) >= 0
        )
    )
);

-- Also update the applicable_to check to include 'user' and 'variant'
ALTER TABLE public.discount_codes
DROP CONSTRAINT IF EXISTS discount_codes_applicable_to_check;

ALTER TABLE public.discount_codes
ADD CONSTRAINT discount_codes_applicable_to_check
CHECK (
    applicable_to IN ('all', 'category', 'product', 'variant', 'user')
);

-- Verify the constraints
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.discount_codes'::regclass
AND conname IN ('check_applicable_ids_consistency', 'discount_codes_applicable_to_check');