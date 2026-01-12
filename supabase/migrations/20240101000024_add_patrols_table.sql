-- Migration: Add patrols table for managed patrol lists
-- This replaces the free-text patrol field on scouts with a lookup table

-- Create patrols table
CREATE TABLE patrols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(unit_id, name)
);

-- Enable RLS
ALTER TABLE patrols ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can view patrols in their unit
CREATE POLICY "Users can view patrols in their unit"
    ON patrols FOR SELECT
    USING (unit_id IN (
        SELECT unit_id FROM unit_memberships WHERE profile_id = auth.uid() AND status = 'active'
    ));

-- RLS policy: Admins can insert patrols
CREATE POLICY "Admins can insert patrols"
    ON patrols FOR INSERT
    WITH CHECK (unit_id IN (
        SELECT unit_id FROM unit_memberships
        WHERE profile_id = auth.uid() AND role = 'admin' AND status = 'active'
    ));

-- RLS policy: Admins can update patrols
CREATE POLICY "Admins can update patrols"
    ON patrols FOR UPDATE
    USING (unit_id IN (
        SELECT unit_id FROM unit_memberships
        WHERE profile_id = auth.uid() AND role = 'admin' AND status = 'active'
    ));

-- RLS policy: Admins can delete patrols
CREATE POLICY "Admins can delete patrols"
    ON patrols FOR DELETE
    USING (unit_id IN (
        SELECT unit_id FROM unit_memberships
        WHERE profile_id = auth.uid() AND role = 'admin' AND status = 'active'
    ));

-- Migrate existing patrol data from scouts table
-- This extracts unique patrol names per unit and creates patrol records
INSERT INTO patrols (unit_id, name)
SELECT DISTINCT unit_id, patrol
FROM scouts
WHERE patrol IS NOT NULL AND patrol != ''
ON CONFLICT (unit_id, name) DO NOTHING;

-- Add patrol_id foreign key to scouts table
ALTER TABLE scouts ADD COLUMN patrol_id UUID REFERENCES patrols(id) ON DELETE SET NULL;

-- Populate patrol_id from existing patrol text
UPDATE scouts s
SET patrol_id = p.id
FROM patrols p
WHERE s.patrol = p.name AND s.unit_id = p.unit_id;

-- Create index for performance
CREATE INDEX idx_patrols_unit_id ON patrols(unit_id);
CREATE INDEX idx_scouts_patrol_id ON scouts(patrol_id);

-- Add updated_at trigger for patrols
CREATE TRIGGER update_patrols_updated_at
    BEFORE UPDATE ON patrols
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
