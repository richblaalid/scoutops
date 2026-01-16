-- Add second position field to scouts and roster_adults tables
-- Supports displaying up to 2 current positions per member

-- Add second position to scouts table
ALTER TABLE scouts
ADD COLUMN IF NOT EXISTS current_position_2 TEXT;

COMMENT ON COLUMN scouts.current_position_2 IS 'Secondary leadership position from Scoutbook';

-- Add second position to roster_adults table
ALTER TABLE roster_adults
ADD COLUMN IF NOT EXISTS position_2 TEXT;

COMMENT ON COLUMN roster_adults.position_2 IS 'Secondary position from Scoutbook';

-- Add second position to sync_staged_members for staging preview
ALTER TABLE sync_staged_members
ADD COLUMN IF NOT EXISTS position_2 TEXT;

COMMENT ON COLUMN sync_staged_members.position_2 IS 'Secondary position from Scoutbook sync';
