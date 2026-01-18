-- Add renewal status and expiration date fields to scouts table
-- These track BSA registration status from Scoutbook sync

ALTER TABLE scouts
ADD COLUMN IF NOT EXISTS renewal_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS expiration_date VARCHAR(20);

COMMENT ON COLUMN scouts.renewal_status IS 'BSA registration status (Current, Eligible for Renewal, Expired)';
COMMENT ON COLUMN scouts.expiration_date IS 'BSA membership expiration date';

-- Grant permissions
GRANT ALL ON scouts TO authenticated;
GRANT ALL ON scouts TO service_role;
