-- Migration: Fix Production RLS Permissions
-- Description: Comprehensive fix for RLS policies and permissions in production
-- This ensures all helper functions have SECURITY DEFINER and proper search_path

-- ============================================
-- STEP 1: Grant necessary table permissions to authenticated users
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================
-- STEP 2: Recreate all helper functions with SECURITY DEFINER
-- These bypass RLS to prevent infinite recursion
-- ============================================

-- get_user_units: Returns unit IDs for current user
CREATE OR REPLACE FUNCTION get_user_units()
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT unit_id FROM unit_memberships
    WHERE profile_id = auth.uid() AND status = 'active';
END;
$$;

-- get_user_active_unit_ids: Alternative name, same purpose
CREATE OR REPLACE FUNCTION get_user_active_unit_ids()
RETURNS SETOF UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT unit_id
  FROM unit_memberships
  WHERE profile_id = auth.uid()
    AND status = 'active'
$$;

-- user_has_role: Check if user has specific role in unit
CREATE OR REPLACE FUNCTION user_has_role(unit UUID, required_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM unit_memberships
        WHERE unit_id = unit
        AND profile_id = auth.uid()
        AND status = 'active'
        AND role = ANY(required_roles)
    );
END;
$$;

-- user_is_unit_admin: Check if user is admin of a specific unit
CREATE OR REPLACE FUNCTION user_is_unit_admin(check_unit_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM unit_memberships
    WHERE profile_id = auth.uid()
      AND unit_id = check_unit_id
      AND role = 'admin'
      AND status = 'active'
  )
$$;

-- get_auth_user_email: Get email from auth JWT (avoids profiles table query)
CREATE OR REPLACE FUNCTION get_auth_user_email()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT auth.jwt()->>'email'
$$;

-- ============================================
-- STEP 3: Fix unit_memberships policies (most critical)
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view memberships" ON unit_memberships;
DROP POLICY IF EXISTS "Users can view memberships in their units" ON unit_memberships;
DROP POLICY IF EXISTS "Admins can manage memberships" ON unit_memberships;
DROP POLICY IF EXISTS "Admins can create memberships" ON unit_memberships;
DROP POLICY IF EXISTS "Users can accept their own invite" ON unit_memberships;
DROP POLICY IF EXISTS "Admins can update memberships" ON unit_memberships;
DROP POLICY IF EXISTS "Admins can delete memberships" ON unit_memberships;

-- SELECT: Users can see their own memberships, invited memberships by email, or other members in their units
CREATE POLICY "Users can view memberships"
  ON unit_memberships
  FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid()
    OR (status = 'invited' AND email = get_auth_user_email())
    OR unit_id IN (SELECT get_user_active_unit_ids())
  );

-- INSERT: Only admins can create memberships
CREATE POLICY "Admins can create memberships"
  ON unit_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (user_is_unit_admin(unit_id));

-- UPDATE: Users can accept their own invite, admins can update any
CREATE POLICY "Users can accept their own invite"
  ON unit_memberships
  FOR UPDATE
  TO authenticated
  USING (
    (status = 'invited' AND email = get_auth_user_email())
    OR user_is_unit_admin(unit_id)
  )
  WITH CHECK (
    (profile_id = auth.uid() AND status = 'active')
    OR user_is_unit_admin(unit_id)
  );

-- DELETE: Only admins can delete
CREATE POLICY "Admins can delete memberships"
  ON unit_memberships
  FOR DELETE
  TO authenticated
  USING (user_is_unit_admin(unit_id));

-- ============================================
-- STEP 4: Fix profiles policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their units" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- Users can view profiles in their units
CREATE POLICY "Users can view profiles in their units"
    ON profiles FOR SELECT
    TO authenticated
    USING (
        id IN (
            SELECT profile_id FROM unit_memberships
            WHERE unit_id IN (SELECT get_user_active_unit_ids())
        )
    );

-- Users can update own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

-- Users can insert own profile (for new signups)
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- ============================================
-- STEP 5: Fix units policies
-- ============================================

DROP POLICY IF EXISTS "Users can view their units" ON units;
DROP POLICY IF EXISTS "Admins can update their units" ON units;

-- Users can view their units
CREATE POLICY "Users can view their units"
    ON units FOR SELECT
    TO authenticated
    USING (id IN (SELECT get_user_units()));

-- Admins can update their units
CREATE POLICY "Admins can update their units"
    ON units FOR UPDATE
    TO authenticated
    USING (user_has_role(id, ARRAY['admin']));

-- ============================================
-- STEP 6: Fix scouts policies
-- ============================================

DROP POLICY IF EXISTS "Users can view scouts in their units" ON scouts;
DROP POLICY IF EXISTS "Leaders can manage scouts" ON scouts;

CREATE POLICY "Users can view scouts in their units"
    ON scouts FOR SELECT
    TO authenticated
    USING (unit_id IN (SELECT get_user_units()));

CREATE POLICY "Leaders can manage scouts"
    ON scouts FOR ALL
    TO authenticated
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer', 'leader']));

-- ============================================
-- STEP 7: Fix scout_accounts policies
-- ============================================

DROP POLICY IF EXISTS "Leaders can view all scout accounts" ON scout_accounts;
DROP POLICY IF EXISTS "Parents can view own scouts accounts" ON scout_accounts;
DROP POLICY IF EXISTS "Treasurers can manage scout accounts" ON scout_accounts;

-- Leaders can see all scout accounts
CREATE POLICY "Leaders can view all scout accounts"
    ON scout_accounts FOR SELECT
    TO authenticated
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer', 'leader']));

-- Parents can see their own scouts' accounts
CREATE POLICY "Parents can view own scouts accounts"
    ON scout_accounts FOR SELECT
    TO authenticated
    USING (
        scout_id IN (
            SELECT scout_id FROM scout_guardians WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Treasurers can manage scout accounts"
    ON scout_accounts FOR ALL
    TO authenticated
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer']));

-- ============================================
-- STEP 8: Fix accounts (chart of accounts) policies
-- ============================================

DROP POLICY IF EXISTS "Users can view accounts in their units" ON accounts;
DROP POLICY IF EXISTS "Treasurers can manage accounts" ON accounts;

CREATE POLICY "Users can view accounts in their units"
    ON accounts FOR SELECT
    TO authenticated
    USING (unit_id IN (SELECT get_user_units()));

CREATE POLICY "Treasurers can manage accounts"
    ON accounts FOR ALL
    TO authenticated
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer']));

-- ============================================
-- STEP 9: Fix Square-related policies
-- ============================================

-- unit_square_credentials
DROP POLICY IF EXISTS "Users can view their unit Square credentials" ON unit_square_credentials;
DROP POLICY IF EXISTS "Admins can manage Square credentials" ON unit_square_credentials;

CREATE POLICY "Users can view their unit Square credentials"
    ON unit_square_credentials FOR SELECT
    TO authenticated
    USING (unit_id IN (SELECT get_user_units()));

CREATE POLICY "Admins can manage Square credentials"
    ON unit_square_credentials FOR ALL
    TO authenticated
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer']));

-- square_transactions
DROP POLICY IF EXISTS "Users can view their unit Square transactions" ON square_transactions;
DROP POLICY IF EXISTS "Admins can manage Square transactions" ON square_transactions;

CREATE POLICY "Users can view their unit Square transactions"
    ON square_transactions FOR SELECT
    TO authenticated
    USING (unit_id IN (SELECT get_user_units()));

CREATE POLICY "Admins can manage Square transactions"
    ON square_transactions FOR ALL
    TO authenticated
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer']));

-- ============================================
-- STEP 10: Fix patrols policies
-- ============================================

DROP POLICY IF EXISTS "Users can view patrols in their units" ON patrols;
DROP POLICY IF EXISTS "Leaders can manage patrols" ON patrols;

CREATE POLICY "Users can view patrols in their units"
    ON patrols FOR SELECT
    TO authenticated
    USING (unit_id IN (SELECT get_user_units()));

CREATE POLICY "Leaders can manage patrols"
    ON patrols FOR ALL
    TO authenticated
    USING (user_has_role(unit_id, ARRAY['admin', 'leader']));

-- ============================================
-- Done
-- ============================================
