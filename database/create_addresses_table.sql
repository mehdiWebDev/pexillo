-- Create addresses table for storing user shipping/billing addresses
CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label VARCHAR(50) NOT NULL DEFAULT 'home', -- home, work, other
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  province VARCHAR(50) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(2) NOT NULL DEFAULT 'CA',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS addresses_user_id_idx ON addresses(user_id);

-- Create index on is_default for faster default address lookups
CREATE INDEX IF NOT EXISTS addresses_is_default_idx ON addresses(user_id, is_default);

-- Enable Row Level Security
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own addresses
CREATE POLICY "Users can view own addresses"
  ON addresses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own addresses
CREATE POLICY "Users can insert own addresses"
  ON addresses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own addresses
CREATE POLICY "Users can update own addresses"
  ON addresses
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own addresses
CREATE POLICY "Users can delete own addresses"
  ON addresses
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to ensure only one default address per user
CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Unset all other default addresses for this user
    UPDATE addresses
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure only one default address
DROP TRIGGER IF EXISTS ensure_single_default_address_trigger ON addresses;
CREATE TRIGGER ensure_single_default_address_trigger
  BEFORE INSERT OR UPDATE ON addresses
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_address();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_addresses_updated_at_trigger ON addresses;
CREATE TRIGGER update_addresses_updated_at_trigger
  BEFORE UPDATE ON addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_addresses_updated_at();
