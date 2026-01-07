-- Migration: Create Functions and Triggers
-- Description: Automated balance updates, timestamps, and audit logging

-- ============================================
-- AUTO-UPDATE TIMESTAMPS
-- ============================================
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

-- ============================================
-- UPDATE SCOUT ACCOUNT BALANCE ON JOURNAL LINE INSERT
-- ============================================
CREATE OR REPLACE FUNCTION update_scout_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if this line is tagged to a scout account
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

-- ============================================
-- REVERSE SCOUT ACCOUNT BALANCE ON JOURNAL LINE DELETE
-- ============================================
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

-- ============================================
-- AUTO-CREATE PROFILE ON USER SIGNUP
-- ============================================
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

-- ============================================
-- AUTO-CREATE SCOUT ACCOUNT WHEN SCOUT IS CREATED
-- ============================================
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

-- ============================================
-- AUDIT LOGGING FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    v_unit_id UUID;
    v_old_values JSONB;
    v_new_values JSONB;
BEGIN
    -- Try to get unit_id from the record
    IF TG_OP = 'DELETE' THEN
        v_unit_id := CASE
            WHEN TG_TABLE_NAME IN ('units') THEN OLD.id
            WHEN OLD ? 'unit_id' THEN (OLD->>'unit_id')::UUID
            ELSE NULL
        END;
        v_old_values := to_jsonb(OLD);
        v_new_values := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        v_unit_id := CASE
            WHEN TG_TABLE_NAME IN ('units') THEN NEW.id
            WHEN NEW ? 'unit_id' THEN (NEW->>'unit_id')::UUID
            ELSE NULL
        END;
        v_old_values := NULL;
        v_new_values := to_jsonb(NEW);
    ELSE -- UPDATE
        v_unit_id := CASE
            WHEN TG_TABLE_NAME IN ('units') THEN NEW.id
            WHEN NEW ? 'unit_id' THEN (NEW->>'unit_id')::UUID
            ELSE NULL
        END;
        v_old_values := to_jsonb(OLD);
        v_new_values := to_jsonb(NEW);
    END IF;

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
        CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
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

-- ============================================
-- VALIDATE JOURNAL ENTRY BALANCE
-- ============================================
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

-- ============================================
-- CREATE DEFAULT CHART OF ACCOUNTS FOR A UNIT
-- ============================================
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

-- ============================================
-- AUTO-CREATE DEFAULT ACCOUNTS ON UNIT CREATION
-- ============================================
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
