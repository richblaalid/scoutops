-- Migration: Fix patrols RLS policies for section units
-- Description: Update patrols policies to allow admins to manage patrols in section units

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view patrols in their unit" ON patrols;
DROP POLICY IF EXISTS "Admins can insert patrols" ON patrols;
DROP POLICY IF EXISTS "Admins can update patrols" ON patrols;
DROP POLICY IF EXISTS "Admins can delete patrols" ON patrols;

-- Recreate with section support using get_user_units() and user_has_role()
-- These functions already handle parent-child unit relationships

CREATE POLICY "Users can view patrols in their unit"
    ON patrols FOR SELECT
    USING (unit_id IN (SELECT get_user_units()));

CREATE POLICY "Admins can manage patrols"
    ON patrols FOR ALL
    USING (user_has_role(unit_id, ARRAY['admin']));
