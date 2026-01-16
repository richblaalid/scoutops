-- Add extended profile fields for user account settings
-- This migration adds contact info, address, and soft delete capability

-- Rename existing phone to phone_primary for consistency
ALTER TABLE profiles RENAME COLUMN phone TO phone_primary;

-- Add new columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS email_secondary VARCHAR(255),
  ADD COLUMN IF NOT EXISTS phone_secondary VARCHAR(30),
  ADD COLUMN IF NOT EXISTS address_street VARCHAR(255),
  ADD COLUMN IF NOT EXISTS address_city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS address_state VARCHAR(50),
  ADD COLUMN IF NOT EXISTS address_zip VARCHAR(20),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Migrate existing full_name to first_name/last_name where possible
UPDATE profiles
SET
  first_name = split_part(full_name, ' ', 1),
  last_name = CASE
    WHEN position(' ' in full_name) > 0
    THEN substring(full_name from position(' ' in full_name) + 1)
    ELSE NULL
  END
WHERE full_name IS NOT NULL AND first_name IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.is_active IS 'Soft delete flag - false means account is deactivated';
