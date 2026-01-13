-- Migration: Remove Section Units
-- Description: BSA coed troop rules no longer require separation of data.
-- Leaders are universal to all scouts. This removes section units and
-- consolidates all data to parent units.

-- ============================================
-- STEP 1: Migrate scouts to parent units
-- ============================================
UPDATE scouts s
SET unit_id = u.parent_unit_id
FROM units u
WHERE s.unit_id = u.id
  AND u.parent_unit_id IS NOT NULL;

-- ============================================
-- STEP 2: Migrate scout_accounts to parent units
-- ============================================
UPDATE scout_accounts sa
SET unit_id = u.parent_unit_id
FROM units u
WHERE sa.unit_id = u.id
  AND u.parent_unit_id IS NOT NULL;

-- ============================================
-- STEP 3: Migrate patrols to parent units
-- ============================================
UPDATE patrols p
SET unit_id = u.parent_unit_id
FROM units u
WHERE p.unit_id = u.id
  AND u.parent_unit_id IS NOT NULL;

-- ============================================
-- STEP 4: Clear section_unit_id from memberships
-- ============================================
UPDATE unit_memberships
SET section_unit_id = NULL
WHERE section_unit_id IS NOT NULL;

-- ============================================
-- STEP 5: Delete section units
-- ============================================
DELETE FROM units WHERE parent_unit_id IS NOT NULL;

-- ============================================
-- STEP 6: Drop section-related columns
-- ============================================
ALTER TABLE units DROP COLUMN IF EXISTS is_section;
ALTER TABLE units DROP COLUMN IF EXISTS parent_unit_id;
ALTER TABLE unit_memberships DROP COLUMN IF EXISTS section_unit_id;

-- Drop indexes that no longer apply
DROP INDEX IF EXISTS idx_units_parent_unit_id;
DROP INDEX IF EXISTS idx_unit_memberships_section;

-- ============================================
-- STEP 7: Drop section-related functions
-- ============================================
DROP FUNCTION IF EXISTS get_unit_sections(UUID);
DROP FUNCTION IF EXISTS get_parent_unit(UUID);
DROP FUNCTION IF EXISTS create_unit_sections(UUID, TEXT, TEXT);

-- ============================================
-- STEP 8: Simplify user_has_role function
-- No longer needs to check parent unit
-- ============================================
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

-- ============================================
-- STEP 9: Simplify get_user_units function
-- No longer needs to include sections
-- ============================================
CREATE OR REPLACE FUNCTION get_user_units()
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    -- Direct memberships only
    SELECT unit_id FROM unit_memberships
    WHERE profile_id = auth.uid() AND is_active = true
    UNION
    -- Units via group membership (keep for backwards compat)
    SELECT u.id FROM units u
    JOIN group_memberships gm ON gm.unit_group_id = u.unit_group_id
    WHERE gm.profile_id = auth.uid()
      AND gm.is_active = true
      AND u.unit_group_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- ============================================
-- STEP 10: Drop section-specific RLS policy if exists
-- ============================================
DROP POLICY IF EXISTS "Users can view scouts in unit sections" ON scouts;
