-- Allow users to create their own membership when accepting a valid invite
-- This policy enables the invite acceptance flow to work

CREATE POLICY "Users can create own membership via invite"
  ON unit_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User can only create membership for themselves
    profile_id = auth.uid()
    -- And must have a pending, non-expired invite for this unit
    AND EXISTS (
      SELECT 1 FROM unit_invites ui
      WHERE ui.unit_id = unit_memberships.unit_id
        AND ui.email = (SELECT email FROM profiles WHERE id = auth.uid())
        AND ui.status = 'pending'
        AND ui.expires_at > NOW()
    )
  );

-- Also allow users to update invites to 'accepted' status for their own email
CREATE POLICY "Users can accept own invites"
  ON unit_invites
  FOR UPDATE
  TO authenticated
  USING (
    email = (SELECT email FROM profiles WHERE id = auth.uid())
    AND status = 'pending'
  )
  WITH CHECK (
    email = (SELECT email FROM profiles WHERE id = auth.uid())
    AND status = 'accepted'
  );

-- Allow users to create scout_guardian records for themselves via invite
CREATE POLICY "Users can create own guardian links via invite"
  ON scout_guardians
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User can only create guardian links for themselves
    profile_id = auth.uid()
    -- And must have a pending invite that includes this scout
    AND EXISTS (
      SELECT 1 FROM unit_invites ui
      WHERE ui.email = (SELECT email FROM profiles WHERE id = auth.uid())
        AND ui.status = 'pending'
        AND ui.expires_at > NOW()
        AND scout_guardians.scout_id = ANY(ui.scout_ids)
    )
  );
