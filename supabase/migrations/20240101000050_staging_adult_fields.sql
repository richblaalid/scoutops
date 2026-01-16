-- Migration: Add adult matching fields to sync_staged_members
-- Description: Fields to track matching of adults to existing roster_adults and profiles

-- Add fields for adult matching
ALTER TABLE sync_staged_members
    ADD COLUMN IF NOT EXISTS existing_roster_adult_id UUID REFERENCES roster_adults(id),
    ADD COLUMN IF NOT EXISTS matched_profile_id UUID REFERENCES profiles(id),
    ADD COLUMN IF NOT EXISTS match_type TEXT CHECK (match_type IN ('bsa_id', 'name_exact', 'name_fuzzy', 'none'));

-- Comments
COMMENT ON COLUMN sync_staged_members.existing_roster_adult_id IS 'For adult updates: the existing roster_adult record';
COMMENT ON COLUMN sync_staged_members.matched_profile_id IS 'For adults: matched profile by BSA ID or name';
COMMENT ON COLUMN sync_staged_members.match_type IS 'How the adult was matched to profile: bsa_id, name_exact, name_fuzzy, none';
