-- Fix RLS recursion by using a security definer function
-- This function bypasses RLS to get user's unit IDs

-- Create a function that returns user's active unit IDs (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_active_unit_ids()
RETURNS SETOF UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT unit_id
  FROM unit_memberships
  WHERE profile_id = auth.uid()
    AND status = 'active'
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view memberships" ON unit_memberships;
DROP POLICY IF EXISTS "Users can view memberships in their units" ON unit_memberships;

-- Create a simple, non-recursive policy
CREATE POLICY "Users can view memberships"
  ON unit_memberships
  FOR SELECT
  TO authenticated
  USING (
    -- User can see their own membership (direct match, no subquery)
    profile_id = auth.uid()
    -- Or see their pending invite by email
    OR (
      status = 'invited'
      AND email = (SELECT email FROM profiles WHERE id = auth.uid())
    )
    -- Or see other members in their units (using security definer function)
    OR unit_id IN (SELECT get_user_active_unit_ids())
  );

-- Also fix the INSERT policy which may have similar issues
DROP POLICY IF EXISTS "Admins can create memberships" ON unit_memberships;

CREATE POLICY "Admins can create memberships"
  ON unit_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User must be admin of the unit (using function to avoid recursion)
    unit_id IN (
      SELECT unit_id FROM unit_memberships
      WHERE profile_id = auth.uid()
        AND role = 'admin'
        AND status = 'active'
    )
  );

-- Actually, INSERT also needs to use the function
DROP POLICY IF EXISTS "Admins can create memberships" ON unit_memberships;

-- Create admin check function
CREATE OR REPLACE FUNCTION user_is_unit_admin(check_unit_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM unit_memberships
    WHERE profile_id = auth.uid()
      AND unit_id = check_unit_id
      AND role = 'admin'
      AND status = 'active'
  )
$$;

CREATE POLICY "Admins can create memberships"
  ON unit_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (user_is_unit_admin(unit_id));

-- Fix UPDATE policy for accepting invites
DROP POLICY IF EXISTS "Users can accept their own invite" ON unit_memberships;
DROP POLICY IF EXISTS "Admins can update memberships" ON unit_memberships;

CREATE POLICY "Users can accept their own invite"
  ON unit_memberships
  FOR UPDATE
  TO authenticated
  USING (
    status = 'invited'
    AND email = (SELECT email FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND status = 'active'
  );

CREATE POLICY "Admins can update memberships"
  ON unit_memberships
  FOR UPDATE
  TO authenticated
  USING (user_is_unit_admin(unit_id));

-- Fix DELETE policy
DROP POLICY IF EXISTS "Admins can delete memberships" ON unit_memberships;

CREATE POLICY "Admins can delete memberships"
  ON unit_memberships
  FOR DELETE
  TO authenticated
  USING (user_is_unit_admin(unit_id));
