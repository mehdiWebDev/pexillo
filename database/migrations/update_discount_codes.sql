-- Migration to update existing discount_codes table with new columns
-- Run this if you already have the discount_codes table

-- Add new columns if they don't exist
DO $$
BEGIN
    -- Add user_usage_limit column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'discount_codes'
                   AND column_name = 'user_usage_limit') THEN
        ALTER TABLE public.discount_codes
        ADD COLUMN user_usage_limit INTEGER DEFAULT 1;
    END IF;

    -- Add created_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'discount_codes'
                   AND column_name = 'created_by') THEN
        ALTER TABLE public.discount_codes
        ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;

    -- Add excluded_categories column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'discount_codes'
                   AND column_name = 'excluded_categories') THEN
        ALTER TABLE public.discount_codes
        ADD COLUMN excluded_categories UUID[];
    END IF;

    -- Add auto_apply column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'discount_codes'
                   AND column_name = 'auto_apply') THEN
        ALTER TABLE public.discount_codes
        ADD COLUMN auto_apply BOOLEAN DEFAULT false;
    END IF;

    -- Add customer_segments column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'discount_codes'
                   AND column_name = 'customer_segments') THEN
        ALTER TABLE public.discount_codes
        ADD COLUMN customer_segments TEXT[];
    END IF;
END $$;

-- Update discount_type constraint to include free_shipping
ALTER TABLE public.discount_codes
DROP CONSTRAINT IF EXISTS discount_codes_discount_type_check;

ALTER TABLE public.discount_codes
DROP CONSTRAINT IF EXISTS check_discount_value;

ALTER TABLE public.discount_codes
ADD CONSTRAINT check_discount_value CHECK (
    (discount_type = 'percentage' AND discount_value > 0 AND discount_value <= 100)
    OR
    (discount_type = 'fixed_amount' AND discount_value > 0)
    OR
    (discount_type = 'free_shipping')
);

-- Create indexes for new columns if they don't exist
CREATE INDEX IF NOT EXISTS idx_discount_codes_excluded_categories
  ON public.discount_codes USING GIN (excluded_categories);

CREATE INDEX IF NOT EXISTS idx_discount_codes_auto_apply
  ON public.discount_codes (auto_apply, is_active)
  WHERE auto_apply = true AND is_active = true;

-- Create discount_usage table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.discount_usage (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  discount_id UUID REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  amount_saved NUMERIC(10, 2) NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT discount_usage_unique UNIQUE (discount_id, order_id)
);

-- Create indexes for discount_usage if they don't exist
CREATE INDEX IF NOT EXISTS idx_discount_usage_user
  ON public.discount_usage (user_id, discount_id);

CREATE INDEX IF NOT EXISTS idx_discount_usage_discount
  ON public.discount_usage (discount_id);

-- Enable RLS if not already enabled
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_usage ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Public can view active discounts" ON public.discount_codes;
DROP POLICY IF EXISTS "Authenticated users can validate discounts" ON public.discount_codes;
DROP POLICY IF EXISTS "Admins can manage discounts" ON public.discount_codes;
DROP POLICY IF EXISTS "Users can view own discount usage" ON public.discount_usage;
DROP POLICY IF EXISTS "System can track discount usage" ON public.discount_usage;
DROP POLICY IF EXISTS "Admins can view all discount usage" ON public.discount_usage;

-- RLS Policies for discount_codes
-- Public can view active discounts
CREATE POLICY "Public can view active discounts" ON public.discount_codes
  FOR SELECT
  USING (is_active = true AND valid_from <= NOW() AND (valid_until IS NULL OR valid_until > NOW()));

-- Authenticated users can check discount codes
CREATE POLICY "Authenticated users can validate discounts" ON public.discount_codes
  FOR SELECT
  TO authenticated
  USING (true);

-- Admins can manage all discounts
CREATE POLICY "Admins can manage discounts" ON public.discount_codes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- RLS Policies for discount_usage
-- Users can view their own usage
CREATE POLICY "Users can view own discount usage" ON public.discount_usage
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- System can insert usage records
CREATE POLICY "System can track discount usage" ON public.discount_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can view all usage
CREATE POLICY "Admins can view all discount usage" ON public.discount_usage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Grant permissions
GRANT SELECT ON public.discount_codes TO anon;
GRANT ALL ON public.discount_codes TO authenticated;
GRANT ALL ON public.discount_usage TO authenticated;