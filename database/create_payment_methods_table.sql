-- Create payment_methods table for storing user payment method references
-- Note: We only store references (Stripe payment method IDs), not actual card data
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT NOT NULL UNIQUE,
  card_brand TEXT NOT NULL, -- visa, mastercard, amex, etc.
  card_last4 TEXT NOT NULL,
  card_exp_month INTEGER NOT NULL,
  card_exp_year INTEGER NOT NULL,
  cardholder_name TEXT NOT NULL,
  billing_address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS payment_methods_user_id_idx ON payment_methods(user_id);

-- Create index on is_default for faster default payment method lookups
CREATE INDEX IF NOT EXISTS payment_methods_is_default_idx ON payment_methods(user_id, is_default);

-- Create index on stripe_payment_method_id for lookups
CREATE INDEX IF NOT EXISTS payment_methods_stripe_pm_id_idx ON payment_methods(stripe_payment_method_id);

-- Enable Row Level Security
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own payment methods
CREATE POLICY "Users can view own payment methods"
  ON payment_methods
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own payment methods
CREATE POLICY "Users can insert own payment methods"
  ON payment_methods
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own payment methods
CREATE POLICY "Users can update own payment methods"
  ON payment_methods
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own payment methods
CREATE POLICY "Users can delete own payment methods"
  ON payment_methods
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to ensure only one default payment method per user
CREATE OR REPLACE FUNCTION ensure_single_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Unset all other default payment methods for this user
    UPDATE payment_methods
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure only one default payment method
DROP TRIGGER IF EXISTS ensure_single_default_payment_method_trigger ON payment_methods;
CREATE TRIGGER ensure_single_default_payment_method_trigger
  BEFORE INSERT OR UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_payment_method();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_payment_methods_updated_at_trigger ON payment_methods;
CREATE TRIGGER update_payment_methods_updated_at_trigger
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_methods_updated_at();
