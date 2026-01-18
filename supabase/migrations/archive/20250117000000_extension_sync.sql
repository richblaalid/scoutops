-- Add sync_source to track how sync was initiated
ALTER TABLE sync_sessions ADD COLUMN IF NOT EXISTS sync_source TEXT DEFAULT 'local';
COMMENT ON COLUMN sync_sessions.sync_source IS 'How sync was initiated: local or extension';

-- Extension auth tokens table
CREATE TABLE extension_auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    is_revoked BOOLEAN DEFAULT false
);

COMMENT ON TABLE extension_auth_tokens IS 'Stores hashed tokens for browser extension authentication';
COMMENT ON COLUMN extension_auth_tokens.token_hash IS 'SHA-256 hash of the actual token';
COMMENT ON COLUMN extension_auth_tokens.expires_at IS '60 day expiration from creation';
COMMENT ON COLUMN extension_auth_tokens.is_revoked IS 'User can manually revoke tokens';

-- Indexes
CREATE INDEX idx_extension_auth_token_hash ON extension_auth_tokens(token_hash);
CREATE INDEX idx_extension_auth_expires ON extension_auth_tokens(expires_at);
CREATE INDEX idx_extension_auth_profile ON extension_auth_tokens(profile_id);
CREATE INDEX idx_extension_auth_unit ON extension_auth_tokens(unit_id);

-- Enable RLS
ALTER TABLE extension_auth_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own tokens" ON extension_auth_tokens
    FOR SELECT
    USING (profile_id = get_current_profile_id());

CREATE POLICY "Users can create tokens for units they admin" ON extension_auth_tokens
    FOR INSERT
    WITH CHECK (
        profile_id = get_current_profile_id()
        AND unit_id IN (
            SELECT unit_id FROM unit_memberships
            WHERE profile_id = get_current_profile_id()
            AND status = 'active'
            AND role IN ('admin', 'treasurer')
        )
    );

CREATE POLICY "Users can update their own tokens" ON extension_auth_tokens
    FOR UPDATE
    USING (profile_id = get_current_profile_id());

CREATE POLICY "Users can delete their own tokens" ON extension_auth_tokens
    FOR DELETE
    USING (profile_id = get_current_profile_id());

-- Grants
GRANT ALL ON extension_auth_tokens TO authenticated;
GRANT ALL ON extension_auth_tokens TO service_role;
