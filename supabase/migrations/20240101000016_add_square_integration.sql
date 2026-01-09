-- Migration: Add Square Integration Tables
-- Description: OAuth credentials, synced transactions, and payment links for Square integration

-- ============================================
-- UNIT SQUARE CREDENTIALS
-- OAuth tokens per unit (encrypted at rest)
-- ============================================
CREATE TABLE unit_square_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    merchant_id VARCHAR(255) NOT NULL,
    location_id VARCHAR(255),
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT NOT NULL,
    token_expires_at TIMESTAMPTZ NOT NULL,
    environment VARCHAR(20) DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
    is_active BOOLEAN DEFAULT true,
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(unit_id)
);

-- ============================================
-- SQUARE TRANSACTIONS
-- Synced from Square for reconciliation
-- ============================================
CREATE TABLE square_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    square_payment_id VARCHAR(255) NOT NULL,
    square_order_id VARCHAR(255),
    amount_money INTEGER NOT NULL,  -- in cents
    fee_money INTEGER DEFAULT 0,    -- in cents
    net_money INTEGER NOT NULL,     -- in cents
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL,
    source_type VARCHAR(50),        -- CARD, CASH, etc.
    card_brand VARCHAR(50),
    last_4 VARCHAR(4),
    receipt_url TEXT,
    receipt_number VARCHAR(100),
    payment_id UUID REFERENCES payments(id),
    scout_account_id UUID REFERENCES scout_accounts(id),
    is_reconciled BOOLEAN DEFAULT false,
    square_created_at TIMESTAMPTZ NOT NULL,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(unit_id, square_payment_id)
);

-- ============================================
-- PAYMENT LINKS
-- For shareable payment URLs
-- ============================================
CREATE TABLE payment_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    scout_account_id UUID REFERENCES scout_accounts(id),
    billing_charge_id UUID REFERENCES billing_charges(id),
    amount INTEGER NOT NULL,        -- in cents
    description TEXT,
    token VARCHAR(64) NOT NULL UNIQUE,  -- secure URL token
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
    payment_id UUID REFERENCES payments(id),
    expires_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_square_credentials_unit ON unit_square_credentials(unit_id);
CREATE INDEX idx_square_credentials_merchant ON unit_square_credentials(merchant_id);
CREATE INDEX idx_square_transactions_unit ON square_transactions(unit_id);
CREATE INDEX idx_square_transactions_payment ON square_transactions(square_payment_id);
CREATE INDEX idx_square_transactions_reconciled ON square_transactions(unit_id, is_reconciled);
CREATE INDEX idx_square_transactions_created ON square_transactions(square_created_at);
CREATE INDEX idx_payment_links_unit ON payment_links(unit_id);
CREATE INDEX idx_payment_links_token ON payment_links(token);
CREATE INDEX idx_payment_links_status ON payment_links(status, expires_at);

-- ============================================
-- ENABLE RLS
-- ============================================
ALTER TABLE unit_square_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE square_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: UNIT SQUARE CREDENTIALS
-- Only admins can manage Square credentials
-- ============================================
CREATE POLICY "Admins can view Square credentials"
    ON unit_square_credentials FOR SELECT
    USING (user_has_role(unit_id, ARRAY['admin']));

CREATE POLICY "Admins can manage Square credentials"
    ON unit_square_credentials FOR ALL
    USING (user_has_role(unit_id, ARRAY['admin']));

-- ============================================
-- RLS POLICIES: SQUARE TRANSACTIONS
-- Leaders can view, treasurers can manage
-- ============================================
CREATE POLICY "Leaders can view Square transactions"
    ON square_transactions FOR SELECT
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer', 'leader']));

CREATE POLICY "Treasurers can manage Square transactions"
    ON square_transactions FOR ALL
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer']));

-- ============================================
-- RLS POLICIES: PAYMENT LINKS
-- Leaders can view, treasurers can create
-- Parents can view their own scouts' links
-- ============================================
CREATE POLICY "Leaders can view payment links"
    ON payment_links FOR SELECT
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer', 'leader']));

CREATE POLICY "Parents can view own scouts payment links"
    ON payment_links FOR SELECT
    USING (
        scout_account_id IN (
            SELECT sa.id FROM scout_accounts sa
            JOIN scout_guardians sg ON sg.scout_id = sa.scout_id
            WHERE sg.profile_id = auth.uid()
        )
    );

CREATE POLICY "Treasurers can manage payment links"
    ON payment_links FOR ALL
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer']));

-- ============================================
-- PUBLIC ACCESS FOR PAYMENT LINKS
-- Allow anonymous access to payment links by token (for parent checkout)
-- ============================================
CREATE POLICY "Anyone can view payment links by token"
    ON payment_links FOR SELECT
    USING (true);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_square_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_square_credentials_timestamp
    BEFORE UPDATE ON unit_square_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_square_updated_at();

CREATE TRIGGER trigger_update_square_transactions_timestamp
    BEFORE UPDATE ON square_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_square_updated_at();

CREATE TRIGGER trigger_update_payment_links_timestamp
    BEFORE UPDATE ON payment_links
    FOR EACH ROW
    EXECUTE FUNCTION update_square_updated_at();
