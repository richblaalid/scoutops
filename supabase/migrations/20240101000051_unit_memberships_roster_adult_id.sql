-- Add roster_adult_id to unit_memberships for linking invites to roster adults
ALTER TABLE unit_memberships
ADD COLUMN IF NOT EXISTS roster_adult_id UUID REFERENCES roster_adults(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_unit_memberships_roster_adult_id
ON unit_memberships(roster_adult_id)
WHERE roster_adult_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN unit_memberships.roster_adult_id IS 'Links to roster_adults record when invite originates from roster import';
