-- Fix the membership SELECT policy to allow users to see their own membership
-- The previous policy had a circular reference issue

DROP POLICY IF EXISTS "Users can view memberships in their units" ON unit_memberships;

-- Policy: Users can view their own membership OR memberships in units they belong to
CREATE POLICY "Users can view memberships"
  ON unit_memberships
  FOR SELECT
  TO authenticated
  USING (
    -- User can always see their own membership (by profile_id)
    profile_id = auth.uid()
    -- Or they can see their pending invite (by email)
    OR (
      status = 'invited'
      AND email = (SELECT email FROM profiles WHERE id = auth.uid())
    )
    -- Or they can see other members in units where they are active
    OR (
      unit_id IN (
        SELECT um.unit_id FROM unit_memberships um
        WHERE um.profile_id = auth.uid() AND um.status = 'active'
      )
    )
  );
