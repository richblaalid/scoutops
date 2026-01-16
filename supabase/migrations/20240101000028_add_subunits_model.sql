-- Migration: Add Sub-Units Model
-- Description: Refactor linked troops to use parent/child unit hierarchy
-- instead of separate units linked via unit_groups

-- ============================================
-- MODIFY UNITS TABLE
-- Add parent reference and section flag
-- ============================================
ALTER TABLE units ADD COLUMN IF NOT EXISTS parent_unit_id UUID REFERENCES units(id) ON DELETE CASCADE;
ALTER TABLE units ADD COLUMN IF NOT EXISTS is_section BOOLEAN DEFAULT false;

-- Index for efficient parent-child queries
CREATE INDEX IF NOT EXISTS idx_units_parent_unit_id ON units(parent_unit_id) WHERE parent_unit_id IS NOT NULL;

-- ============================================
-- MODIFY UNIT_MEMBERSHIPS TABLE
-- Allow section-specific leader assignments
-- ============================================
ALTER TABLE unit_memberships ADD COLUMN IF NOT EXISTS section_unit_id UUID REFERENCES units(id) ON DELETE SET NULL;

-- Index for section-specific queries
CREATE INDEX IF NOT EXISTS idx_unit_memberships_section ON unit_memberships(section_unit_id) WHERE section_unit_id IS NOT NULL;

-- ============================================
-- NEW FUNCTION: Get all sections of a unit
-- Returns section IDs, or the unit itself if no sections
-- ============================================
CREATE OR REPLACE FUNCTION get_unit_sections(p_unit_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT id FROM units WHERE parent_unit_id = p_unit_id
    UNION ALL
    SELECT p_unit_id WHERE NOT EXISTS (
        SELECT 1 FROM units WHERE parent_unit_id = p_unit_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- ============================================
-- NEW FUNCTION: Get parent unit
-- Returns parent_unit_id or self if not a section
-- ============================================
CREATE OR REPLACE FUNCTION get_parent_unit(p_unit_id UUID)
RETURNS UUID AS $$
DECLARE
    v_parent_id UUID;
BEGIN
    SELECT COALESCE(parent_unit_id, p_unit_id) INTO v_parent_id
    FROM units WHERE id = p_unit_id;
    RETURN v_parent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- ============================================
-- NEW FUNCTION: Create section units
-- Creates boys and/or girls sections under a parent unit
-- ============================================
CREATE OR REPLACE FUNCTION create_unit_sections(
    p_parent_unit_id UUID,
    p_boys_number TEXT DEFAULT NULL,
    p_girls_number TEXT DEFAULT NULL
)
RETURNS TABLE(boys_section_id UUID, girls_section_id UUID) AS $$
DECLARE
    v_parent RECORD;
    v_boys_id UUID;
    v_girls_id UUID;
BEGIN
    -- Get parent unit info
    SELECT * INTO v_parent FROM units WHERE id = p_parent_unit_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parent unit not found';
    END IF;

    -- Create boys section if number provided
    IF p_boys_number IS NOT NULL AND p_boys_number != '' THEN
        INSERT INTO units (
            name, unit_number, unit_type, unit_gender, parent_unit_id, is_section,
            council, district, chartered_org, processing_fee_percent,
            processing_fee_fixed, pass_fees_to_payer
        ) VALUES (
            v_parent.name || ' (Boys)',
            p_boys_number,
            v_parent.unit_type,
            'boys',
            p_parent_unit_id,
            true,
            v_parent.council,
            v_parent.district,
            v_parent.chartered_org,
            v_parent.processing_fee_percent,
            v_parent.processing_fee_fixed,
            v_parent.pass_fees_to_payer
        ) RETURNING id INTO v_boys_id;
    END IF;

    -- Create girls section if number provided
    IF p_girls_number IS NOT NULL AND p_girls_number != '' THEN
        INSERT INTO units (
            name, unit_number, unit_type, unit_gender, parent_unit_id, is_section,
            council, district, chartered_org, processing_fee_percent,
            processing_fee_fixed, pass_fees_to_payer
        ) VALUES (
            v_parent.name || ' (Girls)',
            p_girls_number,
            v_parent.unit_type,
            'girls',
            p_parent_unit_id,
            true,
            v_parent.council,
            v_parent.district,
            v_parent.chartered_org,
            v_parent.processing_fee_percent,
            v_parent.processing_fee_fixed,
            v_parent.pass_fees_to_payer
        ) RETURNING id INTO v_girls_id;
    END IF;

    RETURN QUERY SELECT v_boys_id, v_girls_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- ============================================
-- UPDATE get_user_units() FUNCTION
-- Now includes sections of units user has membership to
-- ============================================
CREATE OR REPLACE FUNCTION get_user_units()
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    -- Direct memberships
    SELECT unit_id FROM unit_memberships
    WHERE profile_id = auth.uid() AND status = 'active'
    UNION
    -- Sections of units user has membership to
    SELECT u.id FROM units u
    WHERE u.parent_unit_id IN (
        SELECT unit_id FROM unit_memberships
        WHERE profile_id = auth.uid() AND status = 'active'
    )
    UNION
    -- Units via group membership (keep for backwards compat during transition)
    SELECT u.id FROM units u
    JOIN group_memberships gm ON gm.unit_group_id = u.unit_group_id
    WHERE gm.profile_id = auth.uid()
      AND gm.is_active = true
      AND u.unit_group_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- ============================================
-- RLS: Allow users to see sections of their units
-- (existing policies use get_user_units() so they'll work automatically)
-- ============================================

-- Add policy for sections on scouts table if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'scouts' AND policyname = 'Users can view scouts in unit sections'
    ) THEN
        CREATE POLICY "Users can view scouts in unit sections"
            ON scouts FOR SELECT
            USING (unit_id IN (SELECT get_user_units()));
    END IF;
END $$;
