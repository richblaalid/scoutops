-- Add scout_ids column to unit_invites for parent role invitations
-- This allows admins to specify which scouts a parent should be linked to

ALTER TABLE unit_invites
ADD COLUMN scout_ids UUID[] DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN unit_invites.scout_ids IS 'Array of scout IDs to link when parent accepts invite';
