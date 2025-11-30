-- Fix RLS policies for discount_codes table
-- This allows admins to properly manage discount codes

-- First, drop existing policies
DROP POLICY IF EXISTS "Public can view active discounts" ON public.discount_codes;
DROP POLICY IF EXISTS "Authenticated users can validate discounts" ON public.discount_codes;
DROP POLICY IF EXISTS "Admins can manage discounts" ON public.discount_codes;

-- Enable RLS
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

-- Create new policies with proper permissions

-- 1. Public can view active discounts (for validation)
CREATE POLICY "Public can view active discounts"
ON public.discount_codes
FOR SELECT
TO anon, authenticated
USING (
  is_active = true
  AND valid_from <= NOW()
  AND (valid_until IS NULL OR valid_until > NOW())
);

-- 2. Service role bypass (for API operations)
CREATE POLICY "Service role bypass"
ON public.discount_codes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3. Admins can view all discounts
CREATE POLICY "Admins can view all discounts"
ON public.discount_codes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- 4. Admins can insert discounts
CREATE POLICY "Admins can insert discounts"
ON public.discount_codes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- 5. Admins can update discounts
CREATE POLICY "Admins can update discounts"
ON public.discount_codes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- 6. Admins can delete discounts
CREATE POLICY "Admins can delete discounts"
ON public.discount_codes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Also fix policies for discount_usage table
ALTER TABLE public.discount_usage ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own discount usage" ON public.discount_usage;
DROP POLICY IF EXISTS "System can track discount usage" ON public.discount_usage;
DROP POLICY IF EXISTS "Admins can view all discount usage" ON public.discount_usage;

-- Create new policies for discount_usage

-- 1. Service role bypass
CREATE POLICY "Service role bypass usage"
ON public.discount_usage
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 2. Users can view their own usage
CREATE POLICY "Users can view own discount usage"
ON public.discount_usage
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 3. Users can insert their own usage (through API)
CREATE POLICY "Users can track own usage"
ON public.discount_usage
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 4. Admins can view all usage
CREATE POLICY "Admins can view all discount usage"
ON public.discount_usage
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Grant necessary permissions
GRANT ALL ON public.discount_codes TO authenticated;
GRANT ALL ON public.discount_usage TO authenticated;
GRANT SELECT ON public.discount_codes TO anon;