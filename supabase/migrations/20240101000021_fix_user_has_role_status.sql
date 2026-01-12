-- Fix user_has_role function to use 'status' column instead of 'is_active'
-- The unit_memberships table was updated to use 'status' column ('invited', 'active', 'inactive')
-- but the user_has_role function was still checking 'is_active = true'

-- Update the user_has_role function to use status = 'active'
CREATE OR REPLACE FUNCTION user_has_role(unit UUID, required_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM unit_memberships
        WHERE unit_id = unit
        AND profile_id = auth.uid()
        AND status = 'active'
        AND role = ANY(required_roles)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update get_user_units to use status = 'active' for consistency
CREATE OR REPLACE FUNCTION get_user_units()
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT unit_id FROM unit_memberships
    WHERE profile_id = auth.uid() AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
