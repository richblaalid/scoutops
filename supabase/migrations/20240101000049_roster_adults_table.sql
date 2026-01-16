-- Migration: Roster Adults Table
-- Description: Stores adult roster members imported from Scoutbook
-- Adults are stored here first, then can be invited as app users later

-- ============================================
-- ROSTER ADULTS TABLE
-- ============================================
CREATE TABLE roster_adults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,

    -- BSA Data (from Scoutbook)
    bsa_member_id TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    member_type TEXT NOT NULL CHECK (member_type IN ('LEADER', 'P 18+')),
    age TEXT,
    patrol TEXT,
    position TEXT,
    renewal_status TEXT,
    expiration_date TEXT,

    -- Linking to app user (when invited)
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    linked_at TIMESTAMPTZ,

    -- Sync tracking
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    sync_session_id UUID REFERENCES sync_sessions(id) ON DELETE SET NULL,

    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- One record per BSA member per unit
    UNIQUE(unit_id, bsa_member_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_roster_adults_unit ON roster_adults(unit_id);
CREATE INDEX idx_roster_adults_bsa_id ON roster_adults(bsa_member_id);
CREATE INDEX idx_roster_adults_profile ON roster_adults(profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX idx_roster_adults_active ON roster_adults(unit_id, is_active) WHERE is_active = true;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE roster_adults ENABLE ROW LEVEL SECURITY;

-- Unit members can view roster adults
CREATE POLICY "roster_adults_select" ON roster_adults
    FOR SELECT USING (
        unit_id IN (
            SELECT unit_id FROM unit_memberships
            WHERE profile_id = auth.uid() AND status = 'active'
        )
    );

-- Admins and treasurers can insert
CREATE POLICY "roster_adults_insert" ON roster_adults
    FOR INSERT WITH CHECK (
        unit_id IN (
            SELECT unit_id FROM unit_memberships
            WHERE profile_id = auth.uid()
            AND status = 'active'
            AND role IN ('admin', 'treasurer')
        )
    );

-- Admins and treasurers can update
CREATE POLICY "roster_adults_update" ON roster_adults
    FOR UPDATE USING (
        unit_id IN (
            SELECT unit_id FROM unit_memberships
            WHERE profile_id = auth.uid()
            AND status = 'active'
            AND role IN ('admin', 'treasurer')
        )
    );

-- Only admins can delete
CREATE POLICY "roster_adults_delete" ON roster_adults
    FOR DELETE USING (
        unit_id IN (
            SELECT unit_id FROM unit_memberships
            WHERE profile_id = auth.uid()
            AND status = 'active'
            AND role = 'admin'
        )
    );

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE roster_adults IS 'Adult roster members imported from Scoutbook, separate from app users until invited';
COMMENT ON COLUMN roster_adults.member_type IS 'BSA member type: LEADER (registered leaders) or P 18+ (parents/guardians)';
COMMENT ON COLUMN roster_adults.profile_id IS 'Links to profile when adult is invited and becomes an app user';
COMMENT ON COLUMN roster_adults.linked_at IS 'Timestamp when adult was linked to a profile (invited to app)';
