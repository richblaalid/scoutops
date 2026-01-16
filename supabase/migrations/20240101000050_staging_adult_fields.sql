-- Migration: Add adult matching fields to sync_staged_members
-- Description: Fields to track matching of adults to existing profiles

-- Add fields for adult tracking
ALTER TABLE sync_staged_members
    ADD COLUMN IF NOT EXISTS existing_profile_id UUID REFERENCES profiles(id),
    ADD COLUMN IF NOT EXISTS matched_profile_id UUID REFERENCES profiles(id),
    ADD COLUMN IF NOT EXISTS match_type TEXT CHECK (match_type IN ('bsa_id', 'name_exact', 'name_fuzzy', 'none'));

-- Comments
COMMENT ON COLUMN sync_staged_members.existing_profile_id IS 'For adults: existing profile ID if updating';
COMMENT ON COLUMN sync_staged_members.matched_profile_id IS 'For adults: matched profile by BSA ID or name (for linking)';
COMMENT ON COLUMN sync_staged_members.match_type IS 'How the adult was matched to profile: bsa_id, name_exact, name_fuzzy, none';
