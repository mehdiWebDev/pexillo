-- Safe migration to update discount_codes table
-- This script checks and adds missing columns one by one

-- First, let's see what columns we currently have (run this to check):
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'discount_codes' ORDER BY ordinal_position;

-- Add missing columns one by one (each can be run independently)

-- 1. Add user_usage_limit if missing
DO $$
BEGIN
    ALTER TABLE public.discount_codes ADD COLUMN user_usage_limit INTEGER DEFAULT 1;
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE 'Column user_usage_limit already exists';
END $$;

-- 2. Add created_by if missing
DO $$
BEGIN
    ALTER TABLE public.discount_codes ADD COLUMN created_by UUID REFERENCES auth.users(id);
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE 'Column created_by already exists';
END $$;

-- 3. Add excluded_categories if missing
DO $$
BEGIN
    ALTER TABLE public.discount_codes ADD COLUMN excluded_categories UUID[];
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE 'Column excluded_categories already exists';
END $$;

-- 4. Add auto_apply if missing
DO $$
BEGIN
    ALTER TABLE public.discount_codes ADD COLUMN auto_apply BOOLEAN DEFAULT false;
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE 'Column auto_apply already exists';
END $$;

-- 5. Add customer_segments if missing
DO $$
BEGIN
    ALTER TABLE public.discount_codes ADD COLUMN customer_segments TEXT[];
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE 'Column customer_segments already exists';
END $$;

-- Now update the check constraint to include free_shipping
DO $$
BEGIN
    -- First drop the old constraint if it exists
    ALTER TABLE public.discount_codes DROP CONSTRAINT IF EXISTS check_discount_value;
    ALTER TABLE public.discount_codes DROP CONSTRAINT IF EXISTS check_discount_percentage_max;
    ALTER TABLE public.discount_codes DROP CONSTRAINT IF EXISTS discount_codes_discount_type_check;
    ALTER TABLE public.discount_codes DROP CONSTRAINT IF EXISTS discount_codes_discount_value_check;

    -- Add the new constraint
    ALTER TABLE public.discount_codes ADD CONSTRAINT check_discount_value CHECK (
        (discount_type = 'percentage' AND discount_value > 0 AND discount_value <= 100)
        OR
        (discount_type = 'fixed_amount' AND discount_value > 0)
        OR
        (discount_type = 'free_shipping')
    );
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error updating constraints: %', SQLERRM;
END $$;

-- Create indexes for new columns (safe - won't error if already exists)
CREATE INDEX IF NOT EXISTS idx_discount_codes_excluded_categories
    ON public.discount_codes USING GIN (excluded_categories);

CREATE INDEX IF NOT EXISTS idx_discount_codes_auto_apply
    ON public.discount_codes (auto_apply, is_active)
    WHERE auto_apply = true AND is_active = true;