-- Migration: Fix auth.uid() to profile_id pattern
-- Description: Updates all functions and policies that incorrectly use auth.uid()
-- where they should use profile lookups via get_current_profile_id()
--
-- Background: profiles.id is decoupled from auth.users.id
-- - profiles.user_id links to auth.users.id (nullable for imported adults)
-- - profiles.id is the profile UUID used in unit_memberships.profile_id
-- - auth.uid() returns auth user ID, NOT profile ID

-- ============================================
-- STEP 1: Ensure get_current_profile_id exists (from migration 54)
-- ============================================
CREATE OR REPLACE FUNCTION get_current_profile_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================
-- STEP 2: Fix all helper functions
-- ============================================

-- get_user_units: Returns unit IDs for current user
-- Note: Inlines profile lookup to avoid nested function permission issues
CREATE OR REPLACE FUNCTION get_user_units()
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile_id UUID;
BEGIN
    SELECT id INTO v_profile_id FROM profiles WHERE user_id = auth.uid() LIMIT 1;

    RETURN QUERY
    SELECT unit_id FROM unit_memberships
    WHERE profile_id = v_profile_id AND status = 'active';
END;
$$;

-- get_user_active_unit_ids: Alternative name, same purpose
-- Note: Inlines profile lookup to avoid nested function permission issues
CREATE OR REPLACE FUNCTION get_user_active_unit_ids()
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile_id UUID;
BEGIN
    -- Inline the profile lookup (don't call get_current_profile_id to avoid permission issues)
    SELECT id INTO v_profile_id FROM profiles WHERE user_id = auth.uid() LIMIT 1;

    RETURN QUERY
    SELECT unit_id FROM unit_memberships
    WHERE profile_id = v_profile_id AND status = 'active';
END;
$$;

-- user_has_role: Check if user has specific role in unit
-- Note: Inlines profile lookup to avoid nested function permission issues
CREATE OR REPLACE FUNCTION user_has_role(unit UUID, required_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile_id UUID;
BEGIN
    SELECT id INTO v_profile_id FROM profiles WHERE user_id = auth.uid() LIMIT 1;

    RETURN EXISTS (
        SELECT 1 FROM unit_memberships
        WHERE unit_id = unit
        AND profile_id = v_profile_id
        AND status = 'active'
        AND role = ANY(required_roles)
    );
END;
$$;

-- user_is_unit_admin: Check if user is admin of a specific unit
-- Note: Inlines profile lookup to avoid nested function permission issues
CREATE OR REPLACE FUNCTION user_is_unit_admin(check_unit_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile_id UUID;
BEGIN
    SELECT id INTO v_profile_id FROM profiles WHERE user_id = auth.uid() LIMIT 1;

    RETURN EXISTS (
        SELECT 1 FROM unit_memberships
        WHERE profile_id = v_profile_id
          AND unit_id = check_unit_id
          AND role = 'admin'
          AND status = 'active'
    );
END;
$$;

-- ============================================
-- STEP 3: Fix unit_memberships policies
-- ============================================

DROP POLICY IF EXISTS "Users can view memberships" ON unit_memberships;
DROP POLICY IF EXISTS "Users can view own memberships" ON unit_memberships;
DROP POLICY IF EXISTS "Users can accept their own invite" ON unit_memberships;

-- SELECT: Users can see memberships in their units (uses helper function)
CREATE POLICY "Users can view memberships"
  ON unit_memberships
  FOR SELECT
  TO authenticated
  USING (
    profile_id = get_current_profile_id()
    OR (status = 'invited' AND email = get_auth_user_email())
    OR unit_id IN (SELECT get_user_active_unit_ids())
  );

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
    (profile_id = get_current_profile_id() AND status = 'active')
    OR user_is_unit_admin(unit_id)
  );

-- ============================================
-- STEP 4: Fix profiles policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their units" ON profiles;
DROP POLICY IF EXISTS "Users can view non-user profiles linked as guardians" ON profiles;

-- Users can view their own profile (by user_id, not id)
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

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

-- Users can view non-user profiles linked as guardians
CREATE POLICY "Users can view non-user profiles linked as guardians"
    ON profiles FOR SELECT
    TO authenticated
    USING (
        user_id IS NULL AND
        id IN (
            SELECT profile_id FROM scout_guardians
            WHERE scout_id IN (
                SELECT id FROM scouts WHERE unit_id IN (SELECT get_user_units())
            )
        )
    );

-- Users can update own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Users can insert own profile (for new signups)
-- Note: profile.id is auto-generated, user_id links to auth
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
