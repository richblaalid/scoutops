-- Create atomic billing function that handles all operations in a single transaction
-- This ensures that if any step fails, all changes are rolled back

CREATE OR REPLACE FUNCTION create_billing_with_journal(
    p_unit_id UUID,
    p_description TEXT,
    p_total_amount DECIMAL(10,2),
    p_billing_date DATE,
    p_billing_type TEXT, -- 'split' or 'fixed'
    p_per_scout_amount DECIMAL(10,2),
    p_scout_accounts JSONB -- Array of {scoutId, accountId, scoutName}
)
RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_billing_with_journal TO authenticated;
