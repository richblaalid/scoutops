-- Migration: Add current_position to scouts table
-- Description: Store scout leadership positions (SPL, Patrol Leader, etc.)

ALTER TABLE scouts
  ADD COLUMN IF NOT EXISTS current_position VARCHAR(100);

COMMENT ON COLUMN scouts.current_position IS 'Current leadership position (e.g., Senior Patrol Leader, Patrol Leader, Quartermaster)';
