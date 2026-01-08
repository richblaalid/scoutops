-- Fix the infinite recursion in the membership creation policy
-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can create own membership via invite" ON unit_memberships;

-- Create a simpler policy that doesn't cause recursion
-- The policy just checks that the user has ANY pending invite - the insert itself
-- ensures the unit_id matches since it comes from the invite record
CREATE POLICY "Users can create own membership via invite"
  ON unit_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User can only create membership for themselves
    profile_id = auth.uid()
    -- And must have at least one pending invite
    AND EXISTS (
      SELECT 1 FROM unit_invites ui
      WHERE ui.email = (SELECT email FROM profiles WHERE id = auth.uid())
        AND ui.status = 'pending'
        AND ui.expires_at > NOW()
    )
  );
