-- Migration: Simplify membership invites
-- Description: Move invite functionality into unit_memberships table with status field
-- This eliminates the need for a separate unit_invites table

-- ============================================
-- MODIFY UNIT_MEMBERSHIPS TABLE
-- ============================================

-- Make profile_id nullable (will be null for invited members)
ALTER TABLE unit_memberships ALTER COLUMN profile_id DROP NOT NULL;

-- Add new columns for invite functionality
ALTER TABLE unit_memberships ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE unit_memberships ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
  CHECK (status IN ('invited', 'active', 'inactive'));
ALTER TABLE unit_memberships ADD COLUMN IF NOT EXISTS scout_ids UUID[] DEFAULT NULL;
ALTER TABLE unit_memberships ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES profiles(id);
ALTER TABLE unit_memberships ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;
ALTER TABLE unit_memberships ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE unit_memberships ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Drop the old unique constraint
ALTER TABLE unit_memberships DROP CONSTRAINT IF EXISTS unit_memberships_unit_id_profile_id_key;

-- Add new unique constraints:
-- 1. Only one active/invited membership per profile per unit (when profile exists)
-- 2. Only one pending invite per email per unit (when profile is null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unit_memberships_unit_profile
  ON unit_memberships(unit_id, profile_id)
  WHERE profile_id IS NOT NULL AND status != 'inactive';

CREATE UNIQUE INDEX IF NOT EXISTS idx_unit_memberships_unit_email_invited
  ON unit_memberships(unit_id, email)
  WHERE profile_id IS NULL AND status = 'invited';

-- Add index for email lookups (for accepting invites)
CREATE INDEX IF NOT EXISTS idx_unit_memberships_email ON unit_memberships(email) WHERE email IS NOT NULL;

-- ============================================
-- UPDATE RLS POLICIES
-- ============================================

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can view memberships" ON unit_memberships;
DROP POLICY IF EXISTS "Users can view memberships in their units" ON unit_memberships;
DROP POLICY IF EXISTS "Users can create own membership via invite" ON unit_memberships;
DROP POLICY IF EXISTS "Admins can view memberships" ON unit_memberships;
DROP POLICY IF EXISTS "Admins can update memberships" ON unit_memberships;
DROP POLICY IF EXISTS "Admins can delete memberships" ON unit_memberships;
DROP POLICY IF EXISTS "Admins can manage memberships" ON unit_memberships;

-- Policy: Users can view memberships in their units
CREATE POLICY "Users can view memberships in their units"
  ON unit_memberships
  FOR SELECT
  TO authenticated
  USING (
    -- User can see memberships in units they belong to
    unit_id IN (
      SELECT um.unit_id FROM unit_memberships um
      WHERE um.profile_id = auth.uid() AND um.status = 'active'
    )
    -- Or they can see their own invited membership by email
    OR (
      status = 'invited'
      AND email = (SELECT email FROM profiles WHERE id = auth.uid())
    )
  );

-- Policy: Admins can create memberships (including invites)
CREATE POLICY "Admins can create memberships"
  ON unit_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must be an admin of the unit
    EXISTS (
      SELECT 1 FROM unit_memberships um
      WHERE um.unit_id = unit_memberships.unit_id
        AND um.profile_id = auth.uid()
        AND um.role = 'admin'
        AND um.status = 'active'
    )
  );

-- Policy: Users can update their own invited membership to accept it
CREATE POLICY "Users can accept their own invite"
  ON unit_memberships
  FOR UPDATE
  TO authenticated
  USING (
    -- Can only update invited memberships that match user's email
    status = 'invited'
    AND email = (SELECT email FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    -- Can only set their profile_id and change status to active
    profile_id = auth.uid()
    AND status = 'active'
  );

-- Policy: Admins can update memberships in their units
CREATE POLICY "Admins can update memberships"
  ON unit_memberships
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM unit_memberships um
      WHERE um.unit_id = unit_memberships.unit_id
        AND um.profile_id = auth.uid()
        AND um.role = 'admin'
        AND um.status = 'active'
    )
  );

-- Policy: Admins can delete memberships in their units
CREATE POLICY "Admins can delete memberships"
  ON unit_memberships
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM unit_memberships um
      WHERE um.unit_id = unit_memberships.unit_id
        AND um.profile_id = auth.uid()
        AND um.role = 'admin'
        AND um.status = 'active'
    )
  );

-- ============================================
-- MIGRATE EXISTING DATA (if any invites exist)
-- ============================================

-- Move pending invites to memberships table
INSERT INTO unit_memberships (unit_id, email, role, status, scout_ids, invited_by, invited_at, expires_at)
SELECT
  unit_id,
  email,
  role,
  'invited',
  scout_ids,
  invited_by,
  created_at,
  expires_at
FROM unit_invites
WHERE status = 'pending'
ON CONFLICT DO NOTHING;

-- ============================================
-- DROP UNIT_INVITES TABLE (optional - can keep for history)
-- ============================================
-- Uncomment to drop the invites table after migration
-- DROP TABLE IF EXISTS unit_invites CASCADE;
