-- Add void support for billing records and charges
-- Allows admins/treasurers to void billing charges with proper accounting reversals

-- Add void columns to billing_records
ALTER TABLE billing_records
ADD COLUMN IF NOT EXISTS is_void BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS void_reason TEXT,
ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES profiles(id);

-- Add void columns to billing_charges
ALTER TABLE billing_charges
ADD COLUMN IF NOT EXISTS is_void BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS void_reason TEXT,
ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS void_journal_entry_id UUID REFERENCES journal_entries(id);

-- Indexes for filtering non-voided records efficiently
CREATE INDEX IF NOT EXISTS idx_billing_records_void ON billing_records(is_void) WHERE is_void = false;
CREATE INDEX IF NOT EXISTS idx_billing_charges_void ON billing_charges(is_void) WHERE is_void = false;

-- Function to void a single billing charge
-- Creates reversal journal entries to adjust scout account balance
CREATE OR REPLACE FUNCTION void_billing_charge(
    p_billing_charge_id UUID,
    p_void_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_charge RECORD;
    v_billing_record RECORD;
    v_journal_entry_id UUID;
    v_receivable_account_id UUID;
    v_income_account_id UUID;
    v_scout_name TEXT;
    v_reversal_description TEXT;
BEGIN
    -- Get charge details with locking
    SELECT
        bc.*,
        br.unit_id,
        br.description as billing_description,
        br.journal_entry_id as original_je_id,
        s.first_name,
        s.last_name
    INTO v_charge
    FROM billing_charges bc
    JOIN billing_records br ON br.id = bc.billing_record_id
    JOIN scout_accounts sa ON sa.id = bc.scout_account_id
    JOIN scouts s ON s.id = sa.scout_id
    WHERE bc.id = p_billing_charge_id
    FOR UPDATE OF bc;

    IF v_charge IS NULL THEN
        RAISE EXCEPTION 'Billing charge not found';
    END IF;

    IF v_charge.is_void THEN
        RAISE EXCEPTION 'Charge is already voided';
    END IF;

    IF v_charge.is_paid THEN
        RAISE EXCEPTION 'Cannot void a paid charge. Refund the payment first.';
    END IF;

    -- Verify user has permission
    IF NOT user_has_role(v_charge.unit_id, ARRAY['admin', 'treasurer']) THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    -- Get accounts
    SELECT id INTO v_receivable_account_id
    FROM accounts WHERE unit_id = v_charge.unit_id AND code = '1200';

    SELECT id INTO v_income_account_id
    FROM accounts WHERE unit_id = v_charge.unit_id AND code = '4100';

    IF v_receivable_account_id IS NULL OR v_income_account_id IS NULL THEN
        RAISE EXCEPTION 'Required accounts not found';
    END IF;

    v_scout_name := v_charge.first_name || ' ' || v_charge.last_name;
    v_reversal_description := 'VOID: ' || v_charge.billing_description || ' - ' || v_scout_name;

    -- Create reversal journal entry
    INSERT INTO journal_entries (unit_id, entry_date, description, entry_type, is_posted, created_by)
    VALUES (v_charge.unit_id, CURRENT_DATE, v_reversal_description, 'adjustment', true, auth.uid())
    RETURNING id INTO v_journal_entry_id;

    -- Create reversal journal lines (opposite of original)
    -- Credit to Accounts Receivable (reverse the debit) - reduces what scout owes
    INSERT INTO journal_lines (journal_entry_id, account_id, scout_account_id, debit, credit, memo)
    VALUES (
        v_journal_entry_id,
        v_receivable_account_id,
        v_charge.scout_account_id,
        0,
        v_charge.amount,
        'Void charge: ' || v_charge.billing_description
    );

    -- Debit to Income (reverse the credit) - reduces income
    INSERT INTO journal_lines (journal_entry_id, account_id, scout_account_id, debit, credit, memo)
    VALUES (
        v_journal_entry_id,
        v_income_account_id,
        NULL,
        v_charge.amount,
        0,
        'Void charge: ' || v_charge.billing_description
    );

    -- Mark charge as voided
    UPDATE billing_charges
    SET is_void = true,
        void_reason = p_void_reason,
        voided_at = NOW(),
        voided_by = auth.uid(),
        void_journal_entry_id = v_journal_entry_id
    WHERE id = p_billing_charge_id;

    -- Check if all charges in the billing record are voided
    IF NOT EXISTS (
        SELECT 1 FROM billing_charges
        WHERE billing_record_id = v_charge.billing_record_id
        AND is_void = false
    ) THEN
        -- Mark the entire billing record as voided
        UPDATE billing_records
        SET is_void = true,
            void_reason = 'All charges voided',
            voided_at = NOW(),
            voided_by = auth.uid()
        WHERE id = v_charge.billing_record_id;

        -- Mark original journal entry as void (for display purposes)
        UPDATE journal_entries
        SET is_void = true, void_reason = p_void_reason
        WHERE id = v_charge.original_je_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'void_journal_entry_id', v_journal_entry_id
    );

EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Function to void an entire billing record (all charges)
CREATE OR REPLACE FUNCTION void_billing_record(
    p_billing_record_id UUID,
    p_void_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_record RECORD;
    v_charge RECORD;
    v_result JSONB;
    v_voided_count INT := 0;
BEGIN
    -- Get billing record
    SELECT * INTO v_record FROM billing_records WHERE id = p_billing_record_id;

    IF v_record IS NULL THEN
        RAISE EXCEPTION 'Billing record not found';
    END IF;

    IF v_record.is_void THEN
        RAISE EXCEPTION 'Billing record is already voided';
    END IF;

    -- Check if any charges are paid
    IF EXISTS (
        SELECT 1 FROM billing_charges
        WHERE billing_record_id = p_billing_record_id
        AND is_paid = true
        AND is_void = false
    ) THEN
        RAISE EXCEPTION 'Cannot void billing record with paid charges. Void individual unpaid charges or refund payments first.';
    END IF;

    -- Void each non-voided charge
    FOR v_charge IN
        SELECT id FROM billing_charges
        WHERE billing_record_id = p_billing_record_id
        AND is_void = false
    LOOP
        PERFORM void_billing_charge(v_charge.id, p_void_reason);
        v_voided_count := v_voided_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'voided_charges', v_voided_count
    );

EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Function to update billing record description only
CREATE OR REPLACE FUNCTION update_billing_description(
    p_billing_record_id UUID,
    p_new_description TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_record RECORD;
BEGIN
    SELECT * INTO v_record FROM billing_records WHERE id = p_billing_record_id;

    IF v_record IS NULL THEN
        RAISE EXCEPTION 'Billing record not found';
    END IF;

    IF v_record.is_void THEN
        RAISE EXCEPTION 'Cannot edit voided billing record';
    END IF;

    IF NOT user_has_role(v_record.unit_id, ARRAY['admin', 'treasurer']) THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    -- Update billing record description
    UPDATE billing_records SET description = p_new_description WHERE id = p_billing_record_id;

    -- Update journal entry description (preserve prefix)
    UPDATE journal_entries
    SET description =
        CASE
            WHEN description LIKE 'Fair Share:%' THEN 'Fair Share: ' || p_new_description
            WHEN description LIKE 'Fixed Charge:%' THEN 'Fixed Charge: ' || p_new_description
            ELSE p_new_description
        END
    WHERE id = v_record.journal_entry_id;

    RETURN jsonb_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION void_billing_charge TO authenticated;
GRANT EXECUTE ON FUNCTION void_billing_record TO authenticated;
GRANT EXECUTE ON FUNCTION update_billing_description TO authenticated;
