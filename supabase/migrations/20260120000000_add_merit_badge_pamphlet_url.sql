-- Add pamphlet_url column to bsa_merit_badges table
-- This stores the URL to the official BSA merit badge pamphlet PDF

ALTER TABLE bsa_merit_badges
ADD COLUMN IF NOT EXISTS pamphlet_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN bsa_merit_badges.pamphlet_url IS 'URL to the official BSA merit badge pamphlet PDF on filestore.scouting.org';
