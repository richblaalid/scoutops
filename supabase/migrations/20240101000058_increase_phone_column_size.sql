-- Increase phone column sizes to accommodate formatted phone numbers
-- e.g., "(555) 123-4567" or "+1 555-123-4567"

ALTER TABLE profiles
  ALTER COLUMN phone_primary TYPE VARCHAR(30),
  ALTER COLUMN phone_secondary TYPE VARCHAR(30);
