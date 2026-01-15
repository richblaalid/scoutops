-- Add profile linking for scout role users
-- This enables scouts to log in and access their own account

-- Add profile_id column to scouts table (one-to-one link)
ALTER TABLE scouts
  ADD COLUMN profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add index for profile lookups
CREATE INDEX idx_scouts_profile ON scouts(profile_id) WHERE profile_id IS NOT NULL;

-- Ensure unique profile per unit (a profile can only be one scout in a unit)
CREATE UNIQUE INDEX idx_scouts_profile_unit ON scouts(profile_id, unit_id) WHERE profile_id IS NOT NULL;

-- Add linked_scout_id column to unit_memberships for scout role invites
-- Similar to scout_ids for parents, but singular for scout role
ALTER TABLE unit_memberships
  ADD COLUMN linked_scout_id UUID REFERENCES scouts(id) ON DELETE SET NULL;

-- Add check constraint to ensure linked_scout_id is only used for scout role
ALTER TABLE unit_memberships
  ADD CONSTRAINT chk_linked_scout_for_scout_role
  CHECK (linked_scout_id IS NULL OR role = 'scout');

-- Update the RLS policy for scouts to allow scout users to see their own scout record
DROP POLICY IF EXISTS "Users can view scouts in their units" ON scouts;

CREATE POLICY "Users can view scouts in their units"
  ON scouts FOR SELECT
  USING (
    -- Unit members can see scouts in their units
    EXISTS (
      SELECT 1 FROM unit_memberships
      WHERE unit_memberships.unit_id = scouts.unit_id
        AND unit_memberships.profile_id = auth.uid()
        AND unit_memberships.status = 'active'
    )
    OR
    -- Scout can see their own record
    profile_id = auth.uid()
  );

-- Allow scouts to update limited fields on their own record
DROP POLICY IF EXISTS "Scouts can update own record" ON scouts;

CREATE POLICY "Scouts can update own record"
  ON scouts FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Add comment documenting the relationship
COMMENT ON COLUMN scouts.profile_id IS 'Links to the user profile when a scout has their own login. One-to-one relationship.';
COMMENT ON COLUMN unit_memberships.linked_scout_id IS 'For scout role invites, specifies which scout record this user represents.';
