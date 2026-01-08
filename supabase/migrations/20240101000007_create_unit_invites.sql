-- Unit Invites table for managing member invitations
CREATE TABLE unit_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'treasurer', 'leader', 'parent', 'scout')),
  invited_by UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ
);

-- Create index for faster lookups by email and status
CREATE INDEX idx_unit_invites_email_status ON unit_invites(email, status);
CREATE INDEX idx_unit_invites_unit_id ON unit_invites(unit_id);

-- Prevent duplicate pending invites for the same email in the same unit
CREATE UNIQUE INDEX idx_unit_invites_unique_pending
  ON unit_invites(unit_id, email)
  WHERE status = 'pending';

-- Enable RLS
ALTER TABLE unit_invites ENABLE ROW LEVEL SECURITY;

-- Admins can view all invites for their unit
CREATE POLICY "Admins can view unit invites"
  ON unit_invites
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM unit_memberships um
      WHERE um.unit_id = unit_invites.unit_id
        AND um.profile_id = auth.uid()
        AND um.role = 'admin'
        AND um.is_active = true
    )
  );

-- Admins can create invites for their unit
CREATE POLICY "Admins can create unit invites"
  ON unit_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM unit_memberships um
      WHERE um.unit_id = unit_invites.unit_id
        AND um.profile_id = auth.uid()
        AND um.role = 'admin'
        AND um.is_active = true
    )
  );

-- Admins can update invites (cancel, resend)
CREATE POLICY "Admins can update unit invites"
  ON unit_invites
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM unit_memberships um
      WHERE um.unit_id = unit_invites.unit_id
        AND um.profile_id = auth.uid()
        AND um.role = 'admin'
        AND um.is_active = true
    )
  );

-- Admins can delete invites
CREATE POLICY "Admins can delete unit invites"
  ON unit_invites
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM unit_memberships um
      WHERE um.unit_id = unit_invites.unit_id
        AND um.profile_id = auth.uid()
        AND um.role = 'admin'
        AND um.is_active = true
    )
  );

-- Users can view their own pending invites (by email match)
CREATE POLICY "Users can view own pending invites"
  ON unit_invites
  FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND status = 'pending'
  );

-- Service role can update invites (for accepting invites during auth callback)
-- This is handled by the default service role access
