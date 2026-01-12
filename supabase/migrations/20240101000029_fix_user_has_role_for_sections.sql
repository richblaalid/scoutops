-- Migration: Fix user_has_role for section units
-- Description: Update user_has_role to check parent unit membership when target is a section

CREATE OR REPLACE FUNCTION user_has_role(unit UUID, required_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_parent_unit_id UUID;
BEGIN
    -- First check direct membership
    IF EXISTS (
        SELECT 1 FROM unit_memberships
        WHERE unit_id = unit
        AND profile_id = auth.uid()
        AND status = 'active'
        AND role = ANY(required_roles)
    ) THEN
        RETURN true;
    END IF;

    -- Check if this is a section and user has role on parent unit
    SELECT parent_unit_id INTO v_parent_unit_id
    FROM units WHERE id = unit;

    IF v_parent_unit_id IS NOT NULL THEN
        RETURN EXISTS (
            SELECT 1 FROM unit_memberships
            WHERE unit_id = v_parent_unit_id
            AND profile_id = auth.uid()
            AND status = 'active'
            AND role = ANY(required_roles)
        );
    END IF;

    RETURN false;
END;
$$;
