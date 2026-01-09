-- ============================================
-- CHUCKBOX COMBINED MIGRATIONS
-- Run this file in the Supabase SQL Editor
-- ============================================

-- Migration 1: Create Core Tables
-- Description: Units, profiles, memberships, scouts, and guardians

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- UNITS (Troops/Packs)
-- ============================================
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    unit_number VARCHAR(20) NOT NULL,
    unit_type VARCHAR(20) NOT NULL CHECK (unit_type IN ('troop', 'pack', 'crew', 'ship')),
    council VARCHAR(255),
    district VARCHAR(255),
    chartered_org VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- UNIT MEMBERSHIPS (links users to units with roles)
-- ============================================
CREATE TABLE unit_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'treasurer', 'leader', 'parent', 'scout')),
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(unit_id, profile_id)
);

-- ============================================
-- SCOUTS (youth members)
-- ============================================
CREATE TABLE scouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    bsa_member_id VARCHAR(20),
    patrol VARCHAR(100),
    rank VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SCOUT-GUARDIAN RELATIONSHIPS
-- ============================================
CREATE TABLE scout_guardians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scout_id UUID NOT NULL REFERENCES scouts(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    relationship VARCHAR(50) DEFAULT 'parent',
    is_primary BOOLEAN DEFAULT false,
    UNIQUE(scout_id, profile_id)
);

-- ============================================
-- INDEXES (Core Tables)
-- ============================================
CREATE INDEX idx_unit_memberships_profile ON unit_memberships(profile_id);
CREATE INDEX idx_unit_memberships_unit ON unit_memberships(unit_id);
CREATE INDEX idx_scouts_unit ON scouts(unit_id);
CREATE INDEX idx_scout_guardians_scout ON scout_guardians(scout_id);
CREATE INDEX idx_scout_guardians_profile ON scout_guardians(profile_id);

-- ============================================
-- Migration 2: Create Financial Tables
-- ============================================

-- CHART OF ACCOUNTS
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN (
        'asset', 'liability', 'equity', 'income', 'expense'
    )),
    parent_id UUID REFERENCES accounts(id),
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(unit_id, code)
);

-- SCOUT INDIVIDUAL ACCOUNTS (sub-ledger)
CREATE TABLE scout_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scout_id UUID NOT NULL REFERENCES scouts(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(scout_id)
);

-- JOURNAL ENTRIES (transaction headers)
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    description TEXT NOT NULL,
    reference VARCHAR(100),
    entry_type VARCHAR(50),
    is_posted BOOLEAN DEFAULT false,
    is_void BOOLEAN DEFAULT false,
    void_reason TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    posted_at TIMESTAMPTZ
);

-- JOURNAL ENTRY LINES (debits and credits)
CREATE TABLE journal_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id),
    scout_account_id UUID REFERENCES scout_accounts(id),
    debit DECIMAL(10,2) DEFAULT 0.00,
    credit DECIMAL(10,2) DEFAULT 0.00,
    memo TEXT,
    CHECK (debit >= 0 AND credit >= 0),
    CHECK (NOT (debit > 0 AND credit > 0))
);

-- INDEXES (Financial Tables)
CREATE INDEX idx_accounts_unit ON accounts(unit_id);
CREATE INDEX idx_scout_accounts_scout ON scout_accounts(scout_id);
CREATE INDEX idx_scout_accounts_unit ON scout_accounts(unit_id);
CREATE INDEX idx_journal_entries_unit ON journal_entries(unit_id);
CREATE INDEX idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX idx_journal_lines_entry ON journal_lines(journal_entry_id);
CREATE INDEX idx_journal_lines_account ON journal_lines(account_id);
CREATE INDEX idx_journal_lines_scout_account ON journal_lines(scout_account_id);

-- ============================================
-- Migration 3: Create Events and Billing Tables
-- ============================================

-- EVENTS (campouts, meetings, etc.)
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50),
    location VARCHAR(255),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    cost_per_scout DECIMAL(10,2),
    cost_per_adult DECIMAL(10,2),
    max_participants INTEGER,
    rsvp_deadline TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EVENT RSVPs
CREATE TABLE event_rsvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    scout_id UUID REFERENCES scouts(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('going', 'not_going', 'maybe')),
    is_driver BOOLEAN DEFAULT false,
    vehicle_seats INTEGER,
    notes TEXT,
    responded_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (scout_id IS NOT NULL OR profile_id IS NOT NULL)
);

-- FAIR SHARE BILLING RECORDS
CREATE TABLE billing_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    billing_date DATE NOT NULL,
    journal_entry_id UUID REFERENCES journal_entries(id),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDIVIDUAL CHARGES FROM BILLING
CREATE TABLE billing_charges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    billing_record_id UUID NOT NULL REFERENCES billing_records(id) ON DELETE CASCADE,
    scout_account_id UUID NOT NULL REFERENCES scout_accounts(id),
    amount DECIMAL(10,2) NOT NULL,
    is_paid BOOLEAN DEFAULT false
);

-- INDEXES (Events/Billing Tables)
CREATE INDEX idx_events_unit ON events(unit_id);
CREATE INDEX idx_events_dates ON events(start_date, end_date);
CREATE INDEX idx_event_rsvps_event ON event_rsvps(event_id);
CREATE INDEX idx_billing_records_unit ON billing_records(unit_id);
CREATE INDEX idx_billing_records_event ON billing_records(event_id);
CREATE INDEX idx_billing_charges_record ON billing_charges(billing_record_id);
CREATE INDEX idx_billing_charges_scout ON billing_charges(scout_account_id);

-- ============================================
-- Migration 4: Create Payments and Audit Tables
-- ============================================

-- PAYMENTS (Square Integration)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    scout_account_id UUID REFERENCES scout_accounts(id),
    amount DECIMAL(10,2) NOT NULL,
    fee_amount DECIMAL(10,2) DEFAULT 0.00,
    net_amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    square_payment_id VARCHAR(255),
    square_receipt_url TEXT,
    status VARCHAR(20) DEFAULT 'completed',
    journal_entry_id UUID REFERENCES journal_entries(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INVENTORY ITEMS (Fundraising) - Phase 0 stub
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(50),
    category VARCHAR(100),
    unit_cost DECIMAL(10,2),
    sale_price DECIMAL(10,2),
    quantity_on_hand INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INVENTORY CHECKOUTS
CREATE TABLE inventory_checkouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
    scout_id UUID NOT NULL REFERENCES scouts(id),
    quantity_out INTEGER NOT NULL,
    quantity_returned INTEGER DEFAULT 0,
    quantity_sold INTEGER DEFAULT 0,
    checked_out_at TIMESTAMPTZ DEFAULT NOW(),
    returned_at TIMESTAMPTZ,
    settled_at TIMESTAMPTZ,
    notes TEXT
);

-- AUDIT LOG
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    performed_by UUID REFERENCES profiles(id),
    performed_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES (Payments/Audit Tables)
CREATE INDEX idx_payments_unit ON payments(unit_id);
CREATE INDEX idx_payments_scout_account ON payments(scout_account_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_inventory_items_unit ON inventory_items(unit_id);
CREATE INDEX idx_inventory_checkouts_item ON inventory_checkouts(inventory_item_id);
CREATE INDEX idx_inventory_checkouts_scout ON inventory_checkouts(scout_id);
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_unit ON audit_log(unit_id);
CREATE INDEX idx_audit_log_performed_at ON audit_log(performed_at);

-- ============================================
-- Migration 5: Create Row Level Security Policies
-- ============================================

-- ENABLE RLS ON ALL TABLES
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scout_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scout_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- HELPER FUNCTION: Get user's units
CREATE OR REPLACE FUNCTION get_user_units()
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT unit_id FROM unit_memberships
    WHERE profile_id = auth.uid() AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- HELPER FUNCTION: Check if user has role in unit
CREATE OR REPLACE FUNCTION user_has_role(unit UUID, required_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM unit_memberships
        WHERE unit_id = unit
        AND profile_id = auth.uid()
        AND is_active = true
        AND role = ANY(required_roles)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid());

CREATE POLICY "Users can view profiles in their units"
    ON profiles FOR SELECT
    USING (
        id IN (
            SELECT profile_id FROM unit_memberships
            WHERE unit_id IN (SELECT get_user_units())
        )
    );

-- UNITS POLICIES
CREATE POLICY "Users can view their units"
    ON units FOR SELECT
    USING (id IN (SELECT get_user_units()));

CREATE POLICY "Admins can update their units"
    ON units FOR UPDATE
    USING (user_has_role(id, ARRAY['admin']));

-- UNIT MEMBERSHIPS POLICIES
CREATE POLICY "Users can view memberships in their units"
    ON unit_memberships FOR SELECT
    USING (unit_id IN (SELECT get_user_units()));

CREATE POLICY "Admins can manage memberships"
    ON unit_memberships FOR ALL
    USING (user_has_role(unit_id, ARRAY['admin']));

-- SCOUTS POLICIES
CREATE POLICY "Users can view scouts in their units"
    ON scouts FOR SELECT
    USING (unit_id IN (SELECT get_user_units()));

CREATE POLICY "Leaders can manage scouts"
    ON scouts FOR ALL
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer', 'leader']));

-- SCOUT GUARDIANS POLICIES
CREATE POLICY "Users can view guardians in their units"
    ON scout_guardians FOR SELECT
    USING (
        scout_id IN (
            SELECT id FROM scouts WHERE unit_id IN (SELECT get_user_units())
        )
    );

CREATE POLICY "Leaders can manage guardians"
    ON scout_guardians FOR ALL
    USING (
        scout_id IN (
            SELECT id FROM scouts
            WHERE user_has_role(unit_id, ARRAY['admin', 'treasurer', 'leader'])
        )
    );

-- ACCOUNTS POLICIES (Chart of Accounts)
CREATE POLICY "Users can view accounts in their units"
    ON accounts FOR SELECT
    USING (unit_id IN (SELECT get_user_units()));

CREATE POLICY "Treasurers can manage accounts"
    ON accounts FOR ALL
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer']));

-- SCOUT ACCOUNTS POLICIES
CREATE POLICY "Leaders can view all scout accounts"
    ON scout_accounts FOR SELECT
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer', 'leader']));

CREATE POLICY "Parents can view own scouts accounts"
    ON scout_accounts FOR SELECT
    USING (
        scout_id IN (
            SELECT scout_id FROM scout_guardians WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Treasurers can manage scout accounts"
    ON scout_accounts FOR ALL
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer']));

-- JOURNAL ENTRIES POLICIES
CREATE POLICY "Leaders can view journal entries"
    ON journal_entries FOR SELECT
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer', 'leader']));

CREATE POLICY "Treasurers can manage journal entries"
    ON journal_entries FOR ALL
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer']));

-- JOURNAL LINES POLICIES
CREATE POLICY "Leaders can view journal lines"
    ON journal_lines FOR SELECT
    USING (
        journal_entry_id IN (
            SELECT id FROM journal_entries
            WHERE user_has_role(unit_id, ARRAY['admin', 'treasurer', 'leader'])
        )
    );

CREATE POLICY "Treasurers can manage journal lines"
    ON journal_lines FOR ALL
    USING (
        journal_entry_id IN (
            SELECT id FROM journal_entries
            WHERE user_has_role(unit_id, ARRAY['admin', 'treasurer'])
        )
    );

-- EVENTS POLICIES
CREATE POLICY "Users can view events in their units"
    ON events FOR SELECT
    USING (unit_id IN (SELECT get_user_units()));

CREATE POLICY "Leaders can manage events"
    ON events FOR ALL
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer', 'leader']));

-- EVENT RSVPS POLICIES
CREATE POLICY "Users can view RSVPs in their units"
    ON event_rsvps FOR SELECT
    USING (
        event_id IN (
            SELECT id FROM events WHERE unit_id IN (SELECT get_user_units())
        )
    );

CREATE POLICY "Users can manage own RSVPs"
    ON event_rsvps FOR ALL
    USING (profile_id = auth.uid());

CREATE POLICY "Parents can manage their scouts RSVPs"
    ON event_rsvps FOR ALL
    USING (
        scout_id IN (
            SELECT scout_id FROM scout_guardians WHERE profile_id = auth.uid()
        )
    );

-- BILLING RECORDS POLICIES
CREATE POLICY "Leaders can view billing records"
    ON billing_records FOR SELECT
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer', 'leader']));

CREATE POLICY "Treasurers can manage billing records"
    ON billing_records FOR ALL
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer']));

-- BILLING CHARGES POLICIES
CREATE POLICY "Leaders can view billing charges"
    ON billing_charges FOR SELECT
    USING (
        billing_record_id IN (
            SELECT id FROM billing_records
            WHERE user_has_role(unit_id, ARRAY['admin', 'treasurer', 'leader'])
        )
    );

CREATE POLICY "Parents can view own scouts billing charges"
    ON billing_charges FOR SELECT
    USING (
        scout_account_id IN (
            SELECT sa.id FROM scout_accounts sa
            JOIN scout_guardians sg ON sg.scout_id = sa.scout_id
            WHERE sg.profile_id = auth.uid()
        )
    );

CREATE POLICY "Treasurers can manage billing charges"
    ON billing_charges FOR ALL
    USING (
        billing_record_id IN (
            SELECT id FROM billing_records
            WHERE user_has_role(unit_id, ARRAY['admin', 'treasurer'])
        )
    );

-- PAYMENTS POLICIES
CREATE POLICY "Leaders can view payments"
    ON payments FOR SELECT
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer', 'leader']));

CREATE POLICY "Parents can view own scouts payments"
    ON payments FOR SELECT
    USING (
        scout_account_id IN (
            SELECT sa.id FROM scout_accounts sa
            JOIN scout_guardians sg ON sg.scout_id = sa.scout_id
            WHERE sg.profile_id = auth.uid()
        )
    );

CREATE POLICY "Treasurers can manage payments"
    ON payments FOR ALL
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer']));

-- INVENTORY POLICIES
CREATE POLICY "Users can view inventory in their units"
    ON inventory_items FOR SELECT
    USING (unit_id IN (SELECT get_user_units()));

CREATE POLICY "Leaders can manage inventory"
    ON inventory_items FOR ALL
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer', 'leader']));

CREATE POLICY "Users can view checkouts in their units"
    ON inventory_checkouts FOR SELECT
    USING (
        inventory_item_id IN (
            SELECT id FROM inventory_items WHERE unit_id IN (SELECT get_user_units())
        )
    );

CREATE POLICY "Leaders can manage checkouts"
    ON inventory_checkouts FOR ALL
    USING (
        inventory_item_id IN (
            SELECT id FROM inventory_items
            WHERE user_has_role(unit_id, ARRAY['admin', 'treasurer', 'leader'])
        )
    );

-- AUDIT LOG POLICIES
CREATE POLICY "Admins can view audit log"
    ON audit_log FOR SELECT
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer']));

-- ============================================
-- Migration 6: Create Functions and Triggers
-- ============================================

-- AUTO-UPDATE TIMESTAMPS
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_units_updated_at
    BEFORE UPDATE ON units
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_scouts_updated_at
    BEFORE UPDATE ON scouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_scout_accounts_updated_at
    BEFORE UPDATE ON scout_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- UPDATE SCOUT ACCOUNT BALANCE ON JOURNAL LINE INSERT
CREATE OR REPLACE FUNCTION update_scout_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.scout_account_id IS NOT NULL THEN
        UPDATE scout_accounts
        SET balance = balance + (NEW.credit - NEW.debit),
            updated_at = NOW()
        WHERE id = NEW.scout_account_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_scout_balance_insert
    AFTER INSERT ON journal_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_scout_account_balance();

-- REVERSE SCOUT ACCOUNT BALANCE ON JOURNAL LINE DELETE
CREATE OR REPLACE FUNCTION reverse_scout_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.scout_account_id IS NOT NULL THEN
        UPDATE scout_accounts
        SET balance = balance - (OLD.credit - OLD.debit),
            updated_at = NOW()
        WHERE id = OLD.scout_account_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reverse_scout_balance_delete
    BEFORE DELETE ON journal_lines
    FOR EACH ROW
    EXECUTE FUNCTION reverse_scout_account_balance();

-- AUTO-CREATE PROFILE ON USER SIGNUP
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- AUTO-CREATE SCOUT ACCOUNT WHEN SCOUT IS CREATED
CREATE OR REPLACE FUNCTION create_scout_account()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO scout_accounts (scout_id, unit_id, balance)
    VALUES (NEW.id, NEW.unit_id, 0.00);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_scout_account
    AFTER INSERT ON scouts
    FOR EACH ROW
    EXECUTE FUNCTION create_scout_account();

-- AUDIT LOGGING FUNCTION
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    v_unit_id UUID;
    v_old_values JSONB;
    v_new_values JSONB;
    v_record_jsonb JSONB;
BEGIN
    -- Convert record to JSONB for inspection (can't use ? operator on record type)
    IF TG_OP = 'DELETE' THEN
        v_record_jsonb := to_jsonb(OLD);
        v_old_values := v_record_jsonb;
        v_new_values := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        v_record_jsonb := to_jsonb(NEW);
        v_old_values := NULL;
        v_new_values := v_record_jsonb;
    ELSE -- UPDATE
        v_record_jsonb := to_jsonb(NEW);
        v_old_values := to_jsonb(OLD);
        v_new_values := v_record_jsonb;
    END IF;

    -- Try to get unit_id from the JSONB record
    v_unit_id := CASE
        WHEN TG_TABLE_NAME = 'units' THEN (v_record_jsonb->>'id')::UUID
        WHEN v_record_jsonb ? 'unit_id' THEN (v_record_jsonb->>'unit_id')::UUID
        ELSE NULL
    END;

    INSERT INTO audit_log (
        unit_id,
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        performed_by
    ) VALUES (
        v_unit_id,
        TG_TABLE_NAME,
        (v_record_jsonb->>'id')::UUID,
        TG_OP,
        v_old_values,
        v_new_values,
        auth.uid()
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for financial tables
CREATE TRIGGER audit_journal_entries
    AFTER INSERT OR UPDATE OR DELETE ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_journal_lines
    AFTER INSERT OR UPDATE OR DELETE ON journal_lines
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_payments
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_billing_records
    AFTER INSERT OR UPDATE OR DELETE ON billing_records
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_scout_accounts
    AFTER INSERT OR UPDATE OR DELETE ON scout_accounts
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- VALIDATE JOURNAL ENTRY BALANCE
CREATE OR REPLACE FUNCTION validate_journal_entry_balance(entry_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    total_debits DECIMAL(10,2);
    total_credits DECIMAL(10,2);
BEGIN
    SELECT
        COALESCE(SUM(debit), 0),
        COALESCE(SUM(credit), 0)
    INTO total_debits, total_credits
    FROM journal_lines
    WHERE journal_entry_id = entry_id;

    RETURN total_debits = total_credits;
END;
$$ LANGUAGE plpgsql;

-- CREATE DEFAULT CHART OF ACCOUNTS FOR A UNIT
CREATE OR REPLACE FUNCTION create_default_accounts(p_unit_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO accounts (unit_id, code, name, account_type, is_system) VALUES
    -- Assets
    (p_unit_id, '1000', 'Bank Account - Checking', 'asset', true),
    (p_unit_id, '1010', 'Bank Account - Savings', 'asset', false),
    (p_unit_id, '1100', 'Accounts Receivable', 'asset', true),
    (p_unit_id, '1200', 'Scout Accounts Receivable', 'asset', true),
    (p_unit_id, '1300', 'Inventory - Fundraising', 'asset', false),

    -- Liabilities
    (p_unit_id, '2000', 'Scout Account Balances', 'liability', true),
    (p_unit_id, '2100', 'Accounts Payable', 'liability', false),

    -- Income
    (p_unit_id, '4000', 'Dues Income', 'income', true),
    (p_unit_id, '4100', 'Camping Fees', 'income', true),
    (p_unit_id, '4200', 'Fundraising Income - Popcorn', 'income', false),
    (p_unit_id, '4210', 'Fundraising Income - Camp Cards', 'income', false),
    (p_unit_id, '4300', 'Donations', 'income', false),
    (p_unit_id, '4900', 'Other Income', 'income', false),

    -- Expenses
    (p_unit_id, '5000', 'Camping Expenses', 'expense', true),
    (p_unit_id, '5100', 'Equipment & Supplies', 'expense', false),
    (p_unit_id, '5200', 'Awards & Recognition', 'expense', true),
    (p_unit_id, '5300', 'Training', 'expense', false),
    (p_unit_id, '5400', 'Insurance', 'expense', false),
    (p_unit_id, '5500', 'Charter Fees', 'expense', false),
    (p_unit_id, '5600', 'Payment Processing Fees', 'expense', true),
    (p_unit_id, '5900', 'Other Expenses', 'expense', false);
END;
$$ LANGUAGE plpgsql;

-- AUTO-CREATE DEFAULT ACCOUNTS ON UNIT CREATION
CREATE OR REPLACE FUNCTION setup_new_unit()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_default_accounts(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_setup_new_unit
    AFTER INSERT ON units
    FOR EACH ROW
    EXECUTE FUNCTION setup_new_unit();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
