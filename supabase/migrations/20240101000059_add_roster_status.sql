-- Add 'roster' to unit_memberships status CHECK constraint
-- This status is used for adults imported from roster who haven't been invited yet

-- Drop existing constraint
ALTER TABLE unit_memberships DROP CONSTRAINT IF EXISTS unit_memberships_status_check;

-- Add new constraint with 'roster' status
ALTER TABLE unit_memberships ADD CONSTRAINT unit_memberships_status_check
  CHECK (status IN ('roster', 'invited', 'active', 'inactive'));
