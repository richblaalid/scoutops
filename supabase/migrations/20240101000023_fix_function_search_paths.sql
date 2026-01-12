-- Migration: Fix Function Search Paths
-- Description: Add SET search_path = public to all functions to address security warnings
-- This prevents potential search_path manipulation attacks

-- ============================================
-- FUNCTIONS FROM 000006_create_functions_triggers.sql
-- ============================================

-- 1. update_updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 2. update_scout_account_balance
CREATE OR REPLACE FUNCTION update_scout_account_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;

-- 3. reverse_scout_account_balance
CREATE OR REPLACE FUNCTION reverse_scout_account_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF OLD.scout_account_id IS NOT NULL THEN
        UPDATE scout_accounts
        SET balance = balance - (OLD.credit - OLD.debit),
            updated_at = NOW()
        WHERE id = OLD.scout_account_id;
    END IF;
    RETURN OLD;
END;
$$;

-- 4. handle_new_user (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$;

-- 5. create_scout_account
CREATE OR REPLACE FUNCTION create_scout_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    INSERT INTO scout_accounts (scout_id, unit_id, balance)
    VALUES (NEW.id, NEW.unit_id, 0.00);
    RETURN NEW;
END;
$$;

-- 6. log_audit_event (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- 7. validate_journal_entry_balance
CREATE OR REPLACE FUNCTION validate_journal_entry_balance(entry_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;

-- 8. create_default_accounts
CREATE OR REPLACE FUNCTION create_default_accounts(p_unit_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;

-- 9. setup_new_unit
CREATE OR REPLACE FUNCTION setup_new_unit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    PERFORM create_default_accounts(NEW.id);
    RETURN NEW;
END;
$$;

-- ============================================
-- FUNCTIONS FROM 000014_fix_rls_recursion.sql
-- ============================================

-- 10. get_user_active_unit_ids (SECURITY DEFINER, SQL)
CREATE OR REPLACE FUNCTION get_user_active_unit_ids()
RETURNS SETOF UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT unit_id
  FROM unit_memberships
  WHERE profile_id = auth.uid()
    AND status = 'active'
$$;

-- 11. user_is_unit_admin (SECURITY DEFINER, SQL)
CREATE OR REPLACE FUNCTION user_is_unit_admin(check_unit_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM unit_memberships
    WHERE profile_id = auth.uid()
      AND unit_id = check_unit_id
      AND role = 'admin'
      AND status = 'active'
  )
$$;

-- ============================================
-- FUNCTIONS FROM 000016_add_square_integration.sql
-- ============================================

-- 12. update_square_updated_at
CREATE OR REPLACE FUNCTION update_square_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ============================================
-- FUNCTIONS FROM 000021_fix_user_has_role_status.sql
-- ============================================

-- 13. user_has_role (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION user_has_role(unit UUID, required_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM unit_memberships
        WHERE unit_id = unit
        AND profile_id = auth.uid()
        AND status = 'active'
        AND role = ANY(required_roles)
    );
END;
$$;

-- 14. get_user_units (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION get_user_units()
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT unit_id FROM unit_memberships
    WHERE profile_id = auth.uid() AND status = 'active';
END;
$$;

-- ============================================
-- FUNCTIONS FROM 000022_create_billing_transaction.sql
-- ============================================

-- 15. create_billing_with_journal (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION create_billing_with_journal(
    p_unit_id UUID,
    p_description TEXT,
    p_total_amount DECIMAL(10,2),
    p_billing_date DATE,
    p_billing_type TEXT, -- 'split' or 'fixed'
    p_per_scout_amount DECIMAL(10,2),
    p_scout_accounts JSONB -- Array of {scoutId, accountId, scoutName}
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_billing_record_id UUID;
    v_journal_entry_id UUID;
    v_receivable_account_id UUID;
    v_income_account_id UUID;
    v_scout JSONB;
    v_entry_description TEXT;
BEGIN
    -- Verify user has permission (admin or treasurer)
    IF NOT user_has_role(p_unit_id, ARRAY['admin', 'treasurer']) THEN
        RAISE EXCEPTION 'Permission denied: user is not admin or treasurer for this unit';
    END IF;

    -- Get the required accounts
    SELECT id INTO v_receivable_account_id
    FROM accounts
    WHERE unit_id = p_unit_id AND code = '1200';

    SELECT id INTO v_income_account_id
    FROM accounts
    WHERE unit_id = p_unit_id AND code = '4100';

    IF v_receivable_account_id IS NULL OR v_income_account_id IS NULL THEN
        RAISE EXCEPTION 'Required accounts (1200, 4100) not found for unit';
    END IF;

    -- Create billing record
    INSERT INTO billing_records (unit_id, description, total_amount, billing_date)
    VALUES (p_unit_id, p_description, p_total_amount, p_billing_date)
    RETURNING id INTO v_billing_record_id;

    -- Create billing charges for each scout
    FOR v_scout IN SELECT * FROM jsonb_array_elements(p_scout_accounts)
    LOOP
        INSERT INTO billing_charges (billing_record_id, scout_account_id, amount, is_paid)
        VALUES (
            v_billing_record_id,
            (v_scout->>'accountId')::UUID,
            p_per_scout_amount,
            false
        );
    END LOOP;

    -- Create journal entry
    v_entry_description := CASE
        WHEN p_billing_type = 'split' THEN 'Fair Share: ' || p_description
        ELSE 'Fixed Charge: ' || p_description
    END;

    INSERT INTO journal_entries (unit_id, entry_date, description, entry_type, is_posted, created_by)
    VALUES (p_unit_id, p_billing_date, v_entry_description, 'charge', true, auth.uid())
    RETURNING id INTO v_journal_entry_id;

    -- Create journal lines - debit each scout's account
    FOR v_scout IN SELECT * FROM jsonb_array_elements(p_scout_accounts)
    LOOP
        INSERT INTO journal_lines (journal_entry_id, account_id, scout_account_id, debit, credit, memo)
        VALUES (
            v_journal_entry_id,
            v_receivable_account_id,
            (v_scout->>'accountId')::UUID,
            p_per_scout_amount,
            0,
            (v_scout->>'scoutName') || ' - ' || p_description
        );
    END LOOP;

    -- Credit income account for total amount
    INSERT INTO journal_lines (journal_entry_id, account_id, scout_account_id, debit, credit, memo)
    VALUES (
        v_journal_entry_id,
        v_income_account_id,
        NULL,
        0,
        p_total_amount,
        p_description
    );

    -- Update billing record with journal entry ID
    UPDATE billing_records
    SET journal_entry_id = v_journal_entry_id
    WHERE id = v_billing_record_id;

    -- Return success with IDs
    RETURN jsonb_build_object(
        'success', true,
        'billing_record_id', v_billing_record_id,
        'journal_entry_id', v_journal_entry_id
    );

EXCEPTION WHEN OTHERS THEN
    -- Re-raise the exception (transaction will be rolled back automatically)
    RAISE;
END;
$$;

-- Note: can_access_journal_line function was not found in migrations.
-- If it exists in production, it should be updated separately.
