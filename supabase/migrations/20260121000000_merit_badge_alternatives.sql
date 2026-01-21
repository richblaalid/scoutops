-- ============================================
-- MERIT BADGE ALTERNATIVES SUPPORT
-- Add fields to support OR options and deep nesting
-- ============================================

-- Add alternative tracking fields to merit badge requirements
-- These match the existing fields on bsa_rank_requirements
ALTER TABLE bsa_merit_badge_requirements
  ADD COLUMN IF NOT EXISTS is_alternative BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS alternatives_group TEXT,
  ADD COLUMN IF NOT EXISTS nesting_depth INTEGER DEFAULT 1;

-- Add original_scoutbook_id to preserve the exact ID from Scoutbook exports
-- This allows us to match requirements like "6A(a)(1)" during import
ALTER TABLE bsa_merit_badge_requirements
  ADD COLUMN IF NOT EXISTS original_scoutbook_id TEXT;

-- Add required_count for parent requirements with alternatives
-- e.g., "Do ONE of the following" = 1, "Do TWO of the following" = 2
ALTER TABLE bsa_merit_badge_requirements
  ADD COLUMN IF NOT EXISTS required_count INTEGER;

-- Update the unique constraint to allow same requirement_number in different option groups
-- This allows us to store both Option A and Option B requirements with same "5a" ID
-- First drop the constraint (which will also drop the associated index)
ALTER TABLE bsa_merit_badge_requirements
  DROP CONSTRAINT IF EXISTS bsa_merit_badge_requirements_version_id_merit_badge_id_requ_key;

-- NOTE: Unique constraint will be added in a separate migration after data cleanup
-- The new constraint (with alternatives_group) allows same requirement_number in different option groups
-- CREATE UNIQUE INDEX bsa_merit_badge_requirements_unique_with_alternatives
--   ON bsa_merit_badge_requirements (version_id, merit_badge_id, requirement_number, COALESCE(alternatives_group, ''));

-- Index for looking up requirements by original Scoutbook ID
CREATE INDEX IF NOT EXISTS idx_bsa_mb_requirements_scoutbook_id
  ON bsa_merit_badge_requirements(original_scoutbook_id)
  WHERE original_scoutbook_id IS NOT NULL;

-- Index for finding alternatives in a group
CREATE INDEX IF NOT EXISTS idx_bsa_mb_requirements_alternatives_group
  ON bsa_merit_badge_requirements(merit_badge_id, alternatives_group)
  WHERE alternatives_group IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN bsa_merit_badge_requirements.is_alternative IS 'True if this is one option in an OR group (e.g., "Do ONE of the following")';
COMMENT ON COLUMN bsa_merit_badge_requirements.alternatives_group IS 'Groups related alternatives together (e.g., "5_options" for all choices under requirement 5)';
COMMENT ON COLUMN bsa_merit_badge_requirements.nesting_depth IS 'Depth level in the hierarchy (1=top, 2=sub-requirement, 3=sub-sub, etc.)';
COMMENT ON COLUMN bsa_merit_badge_requirements.original_scoutbook_id IS 'Original requirement ID from Scoutbook exports (e.g., "6A(a)(1)") for import matching';
COMMENT ON COLUMN bsa_merit_badge_requirements.required_count IS 'Number of alternatives that must be completed (e.g., 1 for "Do ONE", 2 for "Do TWO")';
