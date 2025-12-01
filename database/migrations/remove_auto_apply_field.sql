-- Remove auto_apply field from discount_codes table
-- This migration removes the auto_apply functionality to prevent double discounting
-- Product/variant specific discounts are already applied to item prices

-- Drop the auto_apply column
ALTER TABLE public.discount_codes
DROP COLUMN IF EXISTS auto_apply;

-- Update the validate_discount_code function to remove auto_apply logic
-- The function has already been updated to include stackable field
-- No further changes needed to the function

-- Note: Product and variant-specific discounts are automatically applied
-- through the product pricing, not through the discount code system
-- This prevents double discounting issues