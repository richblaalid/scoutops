-- Migration: Add sync_staged_members table for preview-before-import flow
-- This table holds extracted Scoutbook data until user confirms the import

-- Create staging table for roster members
CREATE TABLE IF NOT EXISTS sync_staged_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sync_sessions(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,

  -- Raw data from Scoutbook
  bsa_member_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  member_type TEXT NOT NULL, -- 'YOUTH', 'LEADER', 'P 18+'
  age TEXT,
  rank TEXT,
  patrol TEXT,
  position TEXT,
  renewal_status TEXT,
  expiration_date TEXT,

  -- Import analysis
  change_type TEXT NOT NULL, -- 'create', 'update', 'skip'
  existing_scout_id UUID REFERENCES scouts(id), -- If update, the existing scout
  changes JSONB, -- For updates: { field: { old: x, new: y }, ... }
  skip_reason TEXT, -- For skips: 'adult', 'duplicate', etc.

  -- Selection
  is_selected BOOLEAN DEFAULT true, -- User can deselect to skip

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient lookups
CREATE INDEX idx_sync_staged_session ON sync_staged_members(session_id);
CREATE INDEX idx_sync_staged_unit ON sync_staged_members(unit_id);

-- Add status to sync_sessions to track staging state
-- 'running' -> 'staged' -> 'completed' or 'cancelled'
-- (The existing status column already supports this, just documenting the new state)

COMMENT ON TABLE sync_staged_members IS 'Temporary storage for Scoutbook roster data pending user confirmation';
COMMENT ON COLUMN sync_staged_members.change_type IS 'create = new scout, update = existing scout with changes, skip = adult or no changes';
COMMENT ON COLUMN sync_staged_members.changes IS 'JSON object showing field-level changes for updates: { "rank": { "old": "First Class", "new": "Star" } }';
COMMENT ON COLUMN sync_staged_members.is_selected IS 'User can deselect rows to exclude from import';

-- RLS Policies
ALTER TABLE sync_staged_members ENABLE ROW LEVEL SECURITY;

-- Users can view staged members for their unit
CREATE POLICY "Users can view staged members for their unit"
  ON sync_staged_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM unit_memberships
      WHERE unit_memberships.unit_id = sync_staged_members.unit_id
        AND unit_memberships.profile_id = get_current_profile_id()
        AND unit_memberships.is_active = true
    )
  );

-- Only admins/treasurers can modify staged members
CREATE POLICY "Admins can modify staged members"
  ON sync_staged_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM unit_memberships
      WHERE unit_memberships.unit_id = sync_staged_members.unit_id
        AND unit_memberships.profile_id = get_current_profile_id()
        AND unit_memberships.role IN ('admin', 'treasurer')
        AND unit_memberships.is_active = true
    )
  );
