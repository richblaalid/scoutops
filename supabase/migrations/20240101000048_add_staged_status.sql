-- Migration: Add 'staged' status to sync_sessions
-- Description: Allows sync sessions to have a 'staged' status for preview before commit

-- Drop the old constraint and add new one with 'staged' status
ALTER TABLE sync_sessions DROP CONSTRAINT IF EXISTS sync_sessions_status_check;
ALTER TABLE sync_sessions ADD CONSTRAINT sync_sessions_status_check
    CHECK (status IN ('running', 'completed', 'failed', 'cancelled', 'staged'));
