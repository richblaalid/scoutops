-- Migration: Refund Journal Entry
-- Description: Create function to properly record refunds in accounting

-- ============================================
-- REFUND JOURNAL ENTRY FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION create_refund_journal_entry(
    p_unit_id UUID,
    p_scout_account_id UUID,
    p_refund_amount_cents INTEGER,
    p_square_refund_id TEXT,
    p_original_square_payment_id TEXT,
    p_refund_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_journal_entry_id UUID;
    v_bank_account_id UUID;
    v_receivable_account_id UUID;
    v_scout_name TEXT;
    v_refund_amount DECIMAL(10,2);
BEGIN
    -- Convert cents to dollars
    v_refund_amount := p_refund_amount_cents / 100.0;

    -- Get scout name for description
    SELECT s.first_name || ' ' || s.last_name INTO v_scout_name
    FROM scout_accounts sa
    JOIN scouts s ON s.id = sa.scout_id
    WHERE sa.id = p_scout_account_id;

    IF v_scout_name IS NULL THEN
        v_scout_name := 'Unknown Scout';
    END IF;

    -- Get required account IDs
    SELECT id INTO v_bank_account_id
    FROM accounts
    WHERE unit_id = p_unit_id AND code = '1000';

    SELECT id INTO v_receivable_account_id
    FROM accounts
    WHERE unit_id = p_unit_id AND code = '1200';

    IF v_bank_account_id IS NULL OR v_receivable_account_id IS NULL THEN
        RAISE EXCEPTION 'Required accounts (1000, 1200) not found for unit';
    END IF;

    -- Create reversal journal entry
    INSERT INTO journal_entries (
        unit_id,
        entry_date,
        description,
        entry_type,
        reference,
        is_posted
    )
    VALUES (
        p_unit_id,
        CURRENT_DATE,
        'Refund for ' || v_scout_name || COALESCE(' - ' || p_refund_reason, ''),
        'refund',
        p_square_refund_id,
        true
    )
    RETURNING id INTO v_journal_entry_id;

    -- Credit bank (reduces bank balance - money went out)
    INSERT INTO journal_lines (
        journal_entry_id,
        account_id,
        scout_account_id,
        debit,
        credit,
        memo,
        target_balance
    )
    VALUES (
        v_journal_entry_id,
        v_bank_account_id,
        NULL,
        0,
        v_refund_amount,
        'Refund processed - ' || p_original_square_payment_id,
        NULL
    );

    -- Debit receivable (increases what scout owes - reverses the payment credit)
    INSERT INTO journal_lines (
        journal_entry_id,
        account_id,
        scout_account_id,
        debit,
        credit,
        memo,
        target_balance
    )
    VALUES (
        v_journal_entry_id,
        v_receivable_account_id,
        p_scout_account_id,
        v_refund_amount,
        0,
        'Payment refunded',
        'billing'
    );

    RETURN jsonb_build_object(
        'success', true,
        'journal_entry_id', v_journal_entry_id,
        'refund_amount', v_refund_amount,
        'scout_name', v_scout_name
    );

EXCEPTION WHEN OTHERS THEN
    -- Re-raise exception - transaction automatically rolls back
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Grant execute permission (service role for webhooks)
GRANT EXECUTE ON FUNCTION create_refund_journal_entry TO service_role;

-- Add helpful comment
COMMENT ON FUNCTION create_refund_journal_entry IS
'Creates accounting entries for payment refunds. Credits bank (money out),
debits scout receivable (reverses payment credit). Called from Square webhooks.';
