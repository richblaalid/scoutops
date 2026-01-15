-- Migration: Roster Import Schema
-- Description: Add fields needed for BSA roster import (adults and scouts)

-- ============================================
-- SCOUTS TABLE: Add roster import fields
-- ============================================
ALTER TABLE scouts
  ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  ADD COLUMN IF NOT EXISTS date_joined DATE,
  ADD COLUMN IF NOT EXISTS health_form_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS health_form_expires DATE,
  ADD COLUMN IF NOT EXISTS swim_classification VARCHAR(20) CHECK (swim_classification IN ('swimmer', 'beginner', 'non-swimmer')),
  ADD COLUMN IF NOT EXISTS swim_class_date DATE;

COMMENT ON COLUMN scouts.gender IS 'Scout gender from BSA roster';
COMMENT ON COLUMN scouts.date_joined IS 'Date scout joined the unit';
COMMENT ON COLUMN scouts.health_form_status IS 'BSA health form status (current, expired, none)';
COMMENT ON COLUMN scouts.swim_classification IS 'BSA swim classification (swimmer, beginner, non-swimmer)';

-- ============================================
-- PROFILES TABLE: Add roster import fields
-- ============================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS bsa_member_id VARCHAR(20),
  ADD COLUMN IF NOT EXISTS date_joined DATE,
  ADD COLUMN IF NOT EXISTS health_form_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS health_form_expires DATE,
  ADD COLUMN IF NOT EXISTS swim_classification VARCHAR(20) CHECK (swim_classification IN ('swimmer', 'beginner', 'non-swimmer')),
  ADD COLUMN IF NOT EXISTS swim_class_date DATE;

COMMENT ON COLUMN profiles.bsa_member_id IS 'BSA member ID for adult members';
COMMENT ON COLUMN profiles.date_joined IS 'Date member joined the unit';
COMMENT ON COLUMN profiles.health_form_status IS 'BSA health form status';
COMMENT ON COLUMN profiles.swim_classification IS 'BSA swim classification';

-- ============================================
-- UNIT MEMBERSHIPS: Add position field
-- ============================================
ALTER TABLE unit_memberships
  ADD COLUMN IF NOT EXISTS current_position VARCHAR(100);

COMMENT ON COLUMN unit_memberships.current_position IS 'Current leadership position (e.g., Scoutmaster, Committee Chair)';

-- ============================================
-- ADULT TRAININGS TABLE: Track BSA trainings
-- ============================================
CREATE TABLE IF NOT EXISTS adult_trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  training_code VARCHAR(50) NOT NULL,
  training_name VARCHAR(255) NOT NULL,
  completed_at DATE,
  expires_at DATE,
  is_current BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, unit_id, training_code)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_adult_trainings_profile ON adult_trainings(profile_id);
CREATE INDEX IF NOT EXISTS idx_adult_trainings_unit ON adult_trainings(unit_id);
CREATE INDEX IF NOT EXISTS idx_adult_trainings_expiring ON adult_trainings(expires_at) WHERE is_current = true;

-- Enable RLS
ALTER TABLE adult_trainings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view trainings in their units"
  ON adult_trainings FOR SELECT
  USING (
    unit_id IN (
      SELECT unit_id FROM unit_memberships
      WHERE profile_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Admins can manage trainings"
  ON adult_trainings FOR ALL
  USING (
    unit_id IN (
      SELECT unit_id FROM unit_memberships
      WHERE profile_id = auth.uid() AND status = 'active' AND role IN ('admin', 'treasurer')
    )
  );

COMMENT ON TABLE adult_trainings IS 'Tracks BSA training completions for adult leaders';
