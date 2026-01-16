-- Add second position field to scouts and profiles tables
-- Supports displaying up to 2 current positions per member

-- Add second position to scouts table
ALTER TABLE scouts
ADD COLUMN IF NOT EXISTS current_position_2 TEXT;

COMMENT ON COLUMN scouts.current_position_2 IS 'Secondary leadership position from Scoutbook';

-- Add position fields to profiles for adults
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS position TEXT,
ADD COLUMN IF NOT EXISTS position_2 TEXT;

COMMENT ON COLUMN profiles.position IS 'Primary position from Scoutbook (for adults)';
COMMENT ON COLUMN profiles.position_2 IS 'Secondary position from Scoutbook (for adults)';

-- Add second position to sync_staged_members for staging preview
ALTER TABLE sync_staged_members
ADD COLUMN IF NOT EXISTS position_2 TEXT;

COMMENT ON COLUMN sync_staged_members.position_2 IS 'Secondary position from Scoutbook sync';
