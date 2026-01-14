-- Migration: Fix units policy for JOIN queries
-- Description: Ensure units are accessible during membership JOIN queries

-- First, ensure the helper function exists with SECURITY DEFINER
-- This function bypasses RLS when checking user's unit access
CREATE OR REPLACE FUNCTION get_user_unit_ids_secure()
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

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their units" ON units;
DROP POLICY IF EXISTS "Users can view units they are invited to" ON units;

-- Policy using SECURITY DEFINER function (recommended approach)
CREATE POLICY "Users can view their units"
    ON units FOR SELECT
    TO authenticated
    USING (id IN (SELECT get_user_unit_ids_secure()));

-- Also allow viewing units user is invited to
CREATE POLICY "Users can view units they are invited to"
    ON units FOR SELECT
    TO authenticated
    USING (
        id IN (
            SELECT unit_id
            FROM unit_memberships
            WHERE email = (auth.jwt()->>'email')
            AND status = 'invited'
        )
    );
