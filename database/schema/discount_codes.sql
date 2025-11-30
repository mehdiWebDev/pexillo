-- Discount Codes Table Schema
-- This table manages all discount codes for the e-commerce platform

-- Ensure UUID extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing table if needed (be careful in production!)
-- DROP TABLE IF EXISTS public.discount_codes CASCADE;

-- Create the discount_codes table
CREATE TABLE IF NOT EXISTS public.discount_codes (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL,
  discount_value NUMERIC(10, 2) NOT NULL,
  minimum_purchase NUMERIC(10, 2) DEFAULT 0,
  maximum_discount NUMERIC(10, 2),
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  user_usage_limit INTEGER DEFAULT 1, -- New: limit per user
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  applicable_to TEXT DEFAULT 'all',
  applicable_ids UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id), -- New: track who created
  priority INTEGER DEFAULT 0,
  stackable BOOLEAN DEFAULT false,
  first_purchase_only BOOLEAN DEFAULT false,
  minimum_items INTEGER,
  excluded_products UUID[],
  excluded_categories UUID[], -- New: exclude categories
  campaign_name TEXT,
  discount_category TEXT,
  auto_apply BOOLEAN DEFAULT false, -- New: auto-apply at checkout
  customer_segments TEXT[], -- New: target specific customer groups

  CONSTRAINT discount_codes_pkey PRIMARY KEY (id),
  CONSTRAINT discount_codes_code_key UNIQUE (code),

  -- Check discount value based on type
  CONSTRAINT check_discount_value CHECK (
    (discount_type = 'percentage' AND discount_value > 0 AND discount_value <= 100)
    OR
    (discount_type = 'fixed_amount' AND discount_value > 0)
    OR
    (discount_type = 'free_shipping')
  ),

  -- Check minimum purchase is positive
  CONSTRAINT check_minimum_purchase_positive CHECK (minimum_purchase >= 0),

  -- Check priority range
  CONSTRAINT check_priority_range CHECK (priority >= 0 AND priority <= 100),

  -- Check usage within limit
  CONSTRAINT check_usage_within_limit CHECK (
    usage_limit IS NULL OR usage_count <= usage_limit
  ),

  -- Check applicable_ids consistency
  CONSTRAINT check_applicable_ids_consistency CHECK (
    (applicable_to = 'all' AND applicable_ids IS NULL)
    OR
    (applicable_to IN ('product', 'category') AND applicable_ids IS NOT NULL AND array_length(applicable_ids, 1) > 0)
    OR
    (applicable_to = 'user' AND applicable_ids IS NOT NULL)
  ),

  -- Check discount category
  CONSTRAINT discount_codes_discount_category_check CHECK (
    discount_category IS NULL OR discount_category IN (
      'seasonal', 'clearance', 'new_customer', 'loyalty',
      'flash_sale', 'promotional', 'referral', 'other'
    )
  ),

  -- Check discount type
  CONSTRAINT discount_codes_discount_type_check CHECK (
    discount_type IN ('percentage', 'fixed_amount', 'free_shipping')
  ),

  -- Check minimum items
  CONSTRAINT discount_codes_minimum_items_check CHECK (
    minimum_items IS NULL OR minimum_items > 0
  ),

  -- Check applicable_to values
  CONSTRAINT discount_codes_applicable_to_check CHECK (
    applicable_to IN ('all', 'category', 'product', 'user')
  ),

  -- Check date validity
  CONSTRAINT check_discount_dates CHECK (
    valid_until IS NULL OR valid_from < valid_until
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_discount_active_dates
  ON public.discount_codes (is_active, valid_from, valid_until)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_discount_code_upper
  ON public.discount_codes (UPPER(code));

CREATE INDEX IF NOT EXISTS idx_discount_codes_active_priority
  ON public.discount_codes (is_active, priority DESC, valid_from, valid_until)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_discount_codes_applicable_ids
  ON public.discount_codes USING GIN (applicable_ids);

CREATE INDEX IF NOT EXISTS idx_discount_codes_excluded_products
  ON public.discount_codes USING GIN (excluded_products);

CREATE INDEX IF NOT EXISTS idx_discount_codes_excluded_categories
  ON public.discount_codes USING GIN (excluded_categories);

CREATE INDEX IF NOT EXISTS idx_discount_codes_category
  ON public.discount_codes (discount_category)
  WHERE discount_category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_discount_codes_campaign
  ON public.discount_codes (campaign_name)
  WHERE campaign_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_discount_codes_auto_apply
  ON public.discount_codes (auto_apply, is_active)
  WHERE auto_apply = true AND is_active = true;

-- Create table for tracking discount usage per user
CREATE TABLE IF NOT EXISTS public.discount_usage (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  discount_id UUID REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  amount_saved NUMERIC(10, 2) NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT discount_usage_unique UNIQUE (discount_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_discount_usage_user
  ON public.discount_usage (user_id, discount_id);

CREATE INDEX IF NOT EXISTS idx_discount_usage_discount
  ON public.discount_usage (discount_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_discount_codes_updated_at
  BEFORE UPDATE ON public.discount_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_usage ENABLE ROW LEVEL SECURITY;

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