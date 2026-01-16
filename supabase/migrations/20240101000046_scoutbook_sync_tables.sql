-- Migration: Scoutbook Sync Tables
-- Description: Tables for tracking sync sessions and storing synced advancement data

-- ============================================
-- SYNC SESSIONS (tracks each sync operation)
-- ============================================
CREATE TABLE sync_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'cancelled')) DEFAULT 'running',
    pages_visited INTEGER DEFAULT 0,
    records_extracted INTEGER DEFAULT 0,
    error_log JSONB DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SYNC SNAPSHOTS (stores page snapshots for debugging)
-- ============================================
CREATE TABLE sync_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_session_id UUID NOT NULL REFERENCES sync_sessions(id) ON DELETE CASCADE,
    page_url TEXT NOT NULL,
    page_type TEXT NOT NULL CHECK (page_type IN ('login', 'roster', 'youthProfile', 'rankRequirements', 'meritBadge', 'unknown')),
    accessibility_tree JSONB NOT NULL,
    screenshot_url TEXT,
    captured_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SNAPSHOT FINGERPRINTS (for change detection)
-- ============================================
CREATE TABLE snapshot_fingerprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_type TEXT NOT NULL UNIQUE,
    structure_hash TEXT NOT NULL,
    key_elements JSONB NOT NULL,
    sample_snapshot JSONB,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SCOUT ADVANCEMENTS (synced from Scoutbook)
-- ============================================
CREATE TABLE scout_advancements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scout_id UUID NOT NULL REFERENCES scouts(id) ON DELETE CASCADE,
    bsa_member_id TEXT,
    current_rank TEXT,
    last_rank_scouts_bsa TEXT,
    last_rank_cub_scout TEXT,
    date_joined TEXT,
    membership_status TEXT,
    advancement_data JSONB DEFAULT '{}'::jsonb,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    sync_session_id UUID REFERENCES sync_sessions(id) ON DELETE SET NULL,
    UNIQUE(scout_id)
);

-- ============================================
-- SCOUT RANK REQUIREMENTS (detailed progress)
-- ============================================
CREATE TABLE scout_rank_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scout_id UUID NOT NULL REFERENCES scouts(id) ON DELETE CASCADE,
    rank_name TEXT NOT NULL,
    requirements_version TEXT,
    percent_complete INTEGER DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('not_started', 'started', 'approved', 'awarded')) DEFAULT 'not_started',
    completed_date TEXT,
    requirements JSONB DEFAULT '[]'::jsonb,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    sync_session_id UUID REFERENCES sync_sessions(id) ON DELETE SET NULL,
    UNIQUE(scout_id, rank_name)
);

-- ============================================
-- SCOUT LEADERSHIP POSITIONS (synced)
-- ============================================
CREATE TABLE scout_leadership_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scout_id UUID NOT NULL REFERENCES scouts(id) ON DELETE CASCADE,
    position TEXT NOT NULL,
    days INTEGER DEFAULT 0,
    is_current BOOLEAN DEFAULT false,
    unit_name TEXT,
    date_range TEXT,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    sync_session_id UUID REFERENCES sync_sessions(id) ON DELETE SET NULL
);

-- ============================================
-- SCOUT ACTIVITY LOGS (synced camping, hiking, service)
-- ============================================
CREATE TABLE scout_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scout_id UUID NOT NULL REFERENCES scouts(id) ON DELETE CASCADE,
    camping_nights INTEGER DEFAULT 0,
    hiking_miles DECIMAL(10, 2) DEFAULT 0,
    service_hours DECIMAL(10, 2) DEFAULT 0,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    sync_session_id UUID REFERENCES sync_sessions(id) ON DELETE SET NULL,
    UNIQUE(scout_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_sync_sessions_unit ON sync_sessions(unit_id);
CREATE INDEX idx_sync_sessions_status ON sync_sessions(status);
CREATE INDEX idx_sync_sessions_created_by ON sync_sessions(created_by);
CREATE INDEX idx_sync_snapshots_session ON sync_snapshots(sync_session_id);
CREATE INDEX idx_sync_snapshots_page_type ON sync_snapshots(page_type);
CREATE INDEX idx_scout_advancements_scout ON scout_advancements(scout_id);
CREATE INDEX idx_scout_advancements_bsa_id ON scout_advancements(bsa_member_id);
CREATE INDEX idx_scout_rank_requirements_scout ON scout_rank_requirements(scout_id);
CREATE INDEX idx_scout_rank_requirements_rank ON scout_rank_requirements(rank_name);
CREATE INDEX idx_scout_leadership_positions_scout ON scout_leadership_positions(scout_id);
CREATE INDEX idx_scout_activity_logs_scout ON scout_activity_logs(scout_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE sync_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshot_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE scout_advancements ENABLE ROW LEVEL SECURITY;
ALTER TABLE scout_rank_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE scout_leadership_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scout_activity_logs ENABLE ROW LEVEL SECURITY;

-- Sync sessions: Unit members can view, admins/treasurers can create
CREATE POLICY "sync_sessions_select" ON sync_sessions
    FOR SELECT USING (
        unit_id IN (
            SELECT unit_id FROM unit_memberships
            WHERE profile_id = get_current_profile_id() AND is_active = true
        )
    );

CREATE POLICY "sync_sessions_insert" ON sync_sessions
    FOR INSERT WITH CHECK (
        unit_id IN (
            SELECT unit_id FROM unit_memberships
            WHERE profile_id = get_current_profile_id()
            AND is_active = true
            AND role IN ('admin', 'treasurer')
        )
    );

CREATE POLICY "sync_sessions_update" ON sync_sessions
    FOR UPDATE USING (
        unit_id IN (
            SELECT unit_id FROM unit_memberships
            WHERE profile_id = get_current_profile_id()
            AND is_active = true
            AND role IN ('admin', 'treasurer')
        )
    );

-- Sync snapshots: Admins only (debugging data)
CREATE POLICY "sync_snapshots_select" ON sync_snapshots
    FOR SELECT USING (
        sync_session_id IN (
            SELECT id FROM sync_sessions WHERE unit_id IN (
                SELECT unit_id FROM unit_memberships
                WHERE profile_id = get_current_profile_id()
                AND is_active = true
                AND role IN ('admin', 'treasurer')
            )
        )
    );

CREATE POLICY "sync_snapshots_insert" ON sync_snapshots
    FOR INSERT WITH CHECK (
        sync_session_id IN (
            SELECT id FROM sync_sessions WHERE unit_id IN (
                SELECT unit_id FROM unit_memberships
                WHERE profile_id = get_current_profile_id()
                AND is_active = true
                AND role IN ('admin', 'treasurer')
            )
        )
    );

-- Snapshot fingerprints: System-level, no user access needed (used by sync service)
CREATE POLICY "snapshot_fingerprints_select" ON snapshot_fingerprints
    FOR SELECT USING (true);

-- Scout advancements: Viewable by unit members, writable by admins/treasurers
CREATE POLICY "scout_advancements_select" ON scout_advancements
    FOR SELECT USING (
        scout_id IN (
            SELECT s.id FROM scouts s
            JOIN unit_memberships um ON s.unit_id = um.unit_id
            WHERE um.profile_id = get_current_profile_id() AND um.is_active = true
        )
    );

CREATE POLICY "scout_advancements_insert" ON scout_advancements
    FOR INSERT WITH CHECK (
        scout_id IN (
            SELECT s.id FROM scouts s
            JOIN unit_memberships um ON s.unit_id = um.unit_id
            WHERE um.profile_id = get_current_profile_id()
            AND um.is_active = true
            AND um.role IN ('admin', 'treasurer')
        )
    );

CREATE POLICY "scout_advancements_update" ON scout_advancements
    FOR UPDATE USING (
        scout_id IN (
            SELECT s.id FROM scouts s
            JOIN unit_memberships um ON s.unit_id = um.unit_id
            WHERE um.profile_id = get_current_profile_id()
            AND um.is_active = true
            AND um.role IN ('admin', 'treasurer')
        )
    );

-- Scout rank requirements: Same as advancements
CREATE POLICY "scout_rank_requirements_select" ON scout_rank_requirements
    FOR SELECT USING (
        scout_id IN (
            SELECT s.id FROM scouts s
            JOIN unit_memberships um ON s.unit_id = um.unit_id
            WHERE um.profile_id = get_current_profile_id() AND um.is_active = true
        )
    );

CREATE POLICY "scout_rank_requirements_insert" ON scout_rank_requirements
    FOR INSERT WITH CHECK (
        scout_id IN (
            SELECT s.id FROM scouts s
            JOIN unit_memberships um ON s.unit_id = um.unit_id
            WHERE um.profile_id = get_current_profile_id()
            AND um.is_active = true
            AND um.role IN ('admin', 'treasurer')
        )
    );

CREATE POLICY "scout_rank_requirements_update" ON scout_rank_requirements
    FOR UPDATE USING (
        scout_id IN (
            SELECT s.id FROM scouts s
            JOIN unit_memberships um ON s.unit_id = um.unit_id
            WHERE um.profile_id = get_current_profile_id()
            AND um.is_active = true
            AND um.role IN ('admin', 'treasurer')
        )
    );

-- Scout leadership positions: Same pattern
CREATE POLICY "scout_leadership_positions_select" ON scout_leadership_positions
    FOR SELECT USING (
        scout_id IN (
            SELECT s.id FROM scouts s
            JOIN unit_memberships um ON s.unit_id = um.unit_id
            WHERE um.profile_id = get_current_profile_id() AND um.is_active = true
        )
    );

CREATE POLICY "scout_leadership_positions_insert" ON scout_leadership_positions
    FOR INSERT WITH CHECK (
        scout_id IN (
            SELECT s.id FROM scouts s
            JOIN unit_memberships um ON s.unit_id = um.unit_id
            WHERE um.profile_id = get_current_profile_id()
            AND um.is_active = true
            AND um.role IN ('admin', 'treasurer')
        )
    );

CREATE POLICY "scout_leadership_positions_update" ON scout_leadership_positions
    FOR UPDATE USING (
        scout_id IN (
            SELECT s.id FROM scouts s
            JOIN unit_memberships um ON s.unit_id = um.unit_id
            WHERE um.profile_id = get_current_profile_id()
            AND um.is_active = true
            AND um.role IN ('admin', 'treasurer')
        )
    );

CREATE POLICY "scout_leadership_positions_delete" ON scout_leadership_positions
    FOR DELETE USING (
        scout_id IN (
            SELECT s.id FROM scouts s
            JOIN unit_memberships um ON s.unit_id = um.unit_id
            WHERE um.profile_id = get_current_profile_id()
            AND um.is_active = true
            AND um.role IN ('admin', 'treasurer')
        )
    );

-- Scout activity logs: Same pattern
CREATE POLICY "scout_activity_logs_select" ON scout_activity_logs
    FOR SELECT USING (
        scout_id IN (
            SELECT s.id FROM scouts s
            JOIN unit_memberships um ON s.unit_id = um.unit_id
            WHERE um.profile_id = get_current_profile_id() AND um.is_active = true
        )
    );

CREATE POLICY "scout_activity_logs_insert" ON scout_activity_logs
    FOR INSERT WITH CHECK (
        scout_id IN (
            SELECT s.id FROM scouts s
            JOIN unit_memberships um ON s.unit_id = um.unit_id
            WHERE um.profile_id = get_current_profile_id()
            AND um.is_active = true
            AND um.role IN ('admin', 'treasurer')
        )
    );

CREATE POLICY "scout_activity_logs_update" ON scout_activity_logs
    FOR UPDATE USING (
        scout_id IN (
            SELECT s.id FROM scouts s
            JOIN unit_memberships um ON s.unit_id = um.unit_id
            WHERE um.profile_id = get_current_profile_id()
            AND um.is_active = true
            AND um.role IN ('admin', 'treasurer')
        )
    );

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE sync_sessions IS 'Tracks Scoutbook sync operations for auditing and debugging';
COMMENT ON TABLE sync_snapshots IS 'Stores page accessibility snapshots for debugging sync issues';
COMMENT ON TABLE snapshot_fingerprints IS 'Tracks page structure for detecting Scoutbook changes';
COMMENT ON TABLE scout_advancements IS 'Scout advancement summary synced from Scoutbook';
COMMENT ON TABLE scout_rank_requirements IS 'Detailed rank requirement progress synced from Scoutbook';
COMMENT ON TABLE scout_leadership_positions IS 'Leadership positions synced from Scoutbook';
COMMENT ON TABLE scout_activity_logs IS 'Activity logs (camping, hiking, service) synced from Scoutbook';
