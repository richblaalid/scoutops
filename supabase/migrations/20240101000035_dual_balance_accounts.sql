-- Migration: Dual-Balance Scout Accounts
-- Description: Separate scout finances into billing_balance (debt) and funds_balance (savings)

-- ============================================
-- PHASE 1: SCHEMA CHANGES
-- ============================================

-- Rename existing balance column for clarity
ALTER TABLE scout_accounts RENAME COLUMN balance TO billing_balance;

-- Add funds_balance column (cannot go negative)
ALTER TABLE scout_accounts
ADD COLUMN funds_balance DECIMAL(10,2) DEFAULT 0.00 NOT NULL;

ALTER TABLE scout_accounts
ADD CONSTRAINT funds_balance_non_negative CHECK (funds_balance >= 0);

-- Add target_balance column to journal_lines to specify which balance to affect
-- Values: 'billing' (default), 'funds'
ALTER TABLE journal_lines
ADD COLUMN target_balance VARCHAR(20) DEFAULT 'billing';

-- ============================================
-- PHASE 2: NEW CHART OF ACCOUNTS
-- ============================================

-- Add Scout Funds accounts to all existing units
DO $$
DECLARE
    v_unit_id UUID;
BEGIN
    FOR v_unit_id IN SELECT id FROM units LOOP
        INSERT INTO accounts (unit_id, code, name, account_type, is_system)
        VALUES
            (v_unit_id, '1210', 'Scout Funds Receivable', 'asset', true),
            (v_unit_id, '2010', 'Scout Funds Payable', 'liability', true)
        ON CONFLICT (unit_id, code) DO NOTHING;
    END LOOP;
END $$;

-- ============================================
-- PHASE 3: UPDATE TRIGGERS
-- ============================================

-- Replace balance update trigger with dual-balance logic
CREATE OR REPLACE FUNCTION update_scout_account_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_amount DECIMAL(10,2);
    v_target VARCHAR(20);
BEGIN
    IF NEW.scout_account_id IS NOT NULL THEN
        v_amount := NEW.credit - NEW.debit;
        v_target := COALESCE(NEW.target_balance, 'billing');

        IF v_target = 'billing' THEN
            UPDATE scout_accounts
            SET billing_balance = billing_balance + v_amount,
                updated_at = NOW()
            WHERE id = NEW.scout_account_id;
        ELSIF v_target = 'funds' THEN
            UPDATE scout_accounts
            SET funds_balance = GREATEST(0, funds_balance + v_amount),
                updated_at = NOW()
            WHERE id = NEW.scout_account_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

-- Update reverse trigger for journal line delete
CREATE OR REPLACE FUNCTION reverse_scout_account_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_amount DECIMAL(10,2);
    v_target VARCHAR(20);
BEGIN
    IF OLD.scout_account_id IS NOT NULL THEN
        v_amount := OLD.credit - OLD.debit;
        v_target := COALESCE(OLD.target_balance, 'billing');

        IF v_target = 'billing' THEN
            UPDATE scout_accounts
            SET billing_balance = billing_balance - v_amount,
                updated_at = NOW()
            WHERE id = OLD.scout_account_id;
        ELSIF v_target = 'funds' THEN
            UPDATE scout_accounts
            SET funds_balance = GREATEST(0, funds_balance - v_amount),
                updated_at = NOW()
            WHERE id = OLD.scout_account_id;
        END IF;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

-- Update create_scout_account trigger to initialize both balances
CREATE OR REPLACE FUNCTION create_scout_account()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO scout_accounts (scout_id, unit_id, billing_balance, funds_balance)
    VALUES (NEW.id, NEW.unit_id, 0.00, 0.00);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

-- ============================================
-- PHASE 4: DATA MIGRATION
-- ============================================

-- Migrate existing positive balances to funds_balance
-- Scouts with positive balance get that moved to funds (they had credit)
-- Negative balances stay as billing debt
UPDATE scout_accounts
SET funds_balance = CASE WHEN billing_balance > 0 THEN billing_balance ELSE 0 END,
    billing_balance = CASE WHEN billing_balance > 0 THEN 0 ELSE billing_balance END
WHERE billing_balance != 0;

-- ============================================
-- PHASE 5: NEW RPC FUNCTIONS
-- ============================================

-- Transfer funds from Scout Funds to pay Billing
CREATE OR REPLACE FUNCTION transfer_funds_to_billing(
    p_scout_account_id UUID,
    p_amount DECIMAL(10,2),
    p_description TEXT DEFAULT 'Transfer from Scout Funds'
)
RETURNS JSONB AS $$
DECLARE
    v_account RECORD;
    v_unit_id UUID;
    v_journal_entry_id UUID;
    v_funds_account_id UUID;
    v_billing_account_id UUID;
    v_scout_name TEXT;
BEGIN
    -- Get scout account with lock
    SELECT sa.*, s.first_name, s.last_name, s.unit_id
    INTO v_account
    FROM scout_accounts sa
    JOIN scouts s ON s.id = sa.scout_id
    WHERE sa.id = p_scout_account_id
    FOR UPDATE;

    IF v_account IS NULL THEN
        RAISE EXCEPTION 'Scout account not found';
    END IF;

    v_unit_id := v_account.unit_id;
    v_scout_name := v_account.first_name || ' ' || v_account.last_name;

    IF v_account.funds_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient funds. Available: $%, Requested: $%',
            v_account.funds_balance, p_amount;
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Transfer amount must be positive';
    END IF;

    SELECT id INTO v_funds_account_id FROM accounts WHERE unit_id = v_unit_id AND code = '1210';
    SELECT id INTO v_billing_account_id FROM accounts WHERE unit_id = v_unit_id AND code = '1200';

    IF v_funds_account_id IS NULL THEN
        RAISE EXCEPTION 'Scout Funds account (1210) not found for unit';
    END IF;

    IF v_billing_account_id IS NULL THEN
        RAISE EXCEPTION 'Scout Billing account (1200) not found for unit';
    END IF;

    -- Create journal entry
    INSERT INTO journal_entries (unit_id, entry_date, description, entry_type, is_posted, created_by)
    VALUES (v_unit_id, CURRENT_DATE, p_description || ' - ' || v_scout_name, 'funds_transfer', true, auth.uid())
    RETURNING id INTO v_journal_entry_id;

    -- Debit from funds (reduce funds_balance)
    INSERT INTO journal_lines (journal_entry_id, account_id, scout_account_id, debit, credit, memo, target_balance)
    VALUES (v_journal_entry_id, v_funds_account_id, p_scout_account_id, p_amount, 0, 'Transfer to billing', 'funds');

    -- Credit to billing (increase billing_balance toward zero)
    INSERT INTO journal_lines (journal_entry_id, account_id, scout_account_id, debit, credit, memo, target_balance)
    VALUES (v_journal_entry_id, v_billing_account_id, p_scout_account_id, 0, p_amount, 'Transfer from scout funds', 'billing');

    RETURN jsonb_build_object(
        'success', true,
        'journal_entry_id', v_journal_entry_id,
        'amount_transferred', p_amount,
        'new_funds_balance', v_account.funds_balance - p_amount,
        'new_billing_balance', v_account.billing_balance + p_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Auto-transfer overpayment to funds (called after payments)
CREATE OR REPLACE FUNCTION auto_transfer_overpayment(
    p_scout_account_id UUID,
    p_amount DECIMAL(10,2)
)
RETURNS VOID AS $$
DECLARE
    v_unit_id UUID;
    v_journal_entry_id UUID;
    v_funds_account_id UUID;
    v_billing_account_id UUID;
BEGIN
    SELECT unit_id INTO v_unit_id FROM scout_accounts WHERE id = p_scout_account_id;

    IF v_unit_id IS NULL THEN
        RAISE EXCEPTION 'Scout account not found';
    END IF;

    SELECT id INTO v_funds_account_id FROM accounts WHERE unit_id = v_unit_id AND code = '1210';
    SELECT id INTO v_billing_account_id FROM accounts WHERE unit_id = v_unit_id AND code = '1200';

    IF v_funds_account_id IS NULL OR v_billing_account_id IS NULL THEN
        RAISE EXCEPTION 'Required accounts not found for unit';
    END IF;

    INSERT INTO journal_entries (unit_id, entry_date, description, entry_type, is_posted)
    VALUES (v_unit_id, CURRENT_DATE, 'Overpayment transferred to Scout Funds', 'adjustment', true)
    RETURNING id INTO v_journal_entry_id;

    -- Debit from billing (reduce the positive billing_balance)
    INSERT INTO journal_lines (journal_entry_id, account_id, scout_account_id, debit, credit, memo, target_balance)
    VALUES (v_journal_entry_id, v_billing_account_id, p_scout_account_id, p_amount, 0, 'Overpayment to funds', 'billing');

    -- Credit to funds (increase funds_balance)
    INSERT INTO journal_lines (journal_entry_id, account_id, scout_account_id, debit, credit, memo, target_balance)
    VALUES (v_journal_entry_id, v_funds_account_id, p_scout_account_id, 0, p_amount, 'Overpayment from billing', 'funds');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Credit fundraising earnings to scout funds
CREATE OR REPLACE FUNCTION credit_fundraising_to_scout(
    p_scout_account_id UUID,
    p_amount DECIMAL(10,2),
    p_description TEXT,
    p_fundraiser_type TEXT DEFAULT 'general'
)
RETURNS JSONB AS $$
DECLARE
    v_account RECORD;
    v_unit_id UUID;
    v_journal_entry_id UUID;
    v_funds_account_id UUID;
    v_income_account_id UUID;
    v_scout_name TEXT;
BEGIN
    -- Verify scout account exists
    SELECT sa.*, s.first_name, s.last_name, s.unit_id
    INTO v_account
    FROM scout_accounts sa
    JOIN scouts s ON s.id = sa.scout_id
    WHERE sa.id = p_scout_account_id;

    IF v_account IS NULL THEN
        RAISE EXCEPTION 'Scout account not found';
    END IF;

    v_unit_id := v_account.unit_id;
    v_scout_name := v_account.first_name || ' ' || v_account.last_name;

    -- Check permissions
    IF NOT user_has_role(v_unit_id, ARRAY['admin', 'treasurer']) THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Credit amount must be positive';
    END IF;

    -- Get account IDs
    SELECT id INTO v_funds_account_id
    FROM accounts WHERE unit_id = v_unit_id AND code = '1210';

    -- Get appropriate income account based on fundraiser type
    SELECT id INTO v_income_account_id
    FROM accounts WHERE unit_id = v_unit_id AND code = CASE
        WHEN p_fundraiser_type = 'popcorn' THEN '4200'
        WHEN p_fundraiser_type = 'camp_cards' THEN '4210'
        ELSE '4900'
    END;

    IF v_funds_account_id IS NULL THEN
        RAISE EXCEPTION 'Scout Funds account not found';
    END IF;

    IF v_income_account_id IS NULL THEN
        -- Fall back to Other Income
        SELECT id INTO v_income_account_id
        FROM accounts WHERE unit_id = v_unit_id AND code = '4900';
    END IF;

    -- Create journal entry
    INSERT INTO journal_entries (unit_id, entry_date, description, entry_type, is_posted, created_by)
    VALUES (v_unit_id, CURRENT_DATE, 'Fundraising: ' || p_description || ' - ' || v_scout_name,
            'fundraising_credit', true, auth.uid())
    RETURNING id INTO v_journal_entry_id;

    -- Credit Scout Funds account (increases scout's funds_balance)
    INSERT INTO journal_lines (journal_entry_id, account_id, scout_account_id, debit, credit, memo, target_balance)
    VALUES (v_journal_entry_id, v_funds_account_id, p_scout_account_id, 0, p_amount,
            p_description, 'funds');

    -- Debit from Fundraising Income (reduces income as scout takes their share)
    INSERT INTO journal_lines (journal_entry_id, account_id, scout_account_id, debit, credit, memo, target_balance)
    VALUES (v_journal_entry_id, v_income_account_id, NULL, p_amount, 0,
            'Scout share: ' || p_description, NULL);

    RETURN jsonb_build_object(
        'success', true,
        'journal_entry_id', v_journal_entry_id,
        'amount_credited', p_amount,
        'new_funds_balance', v_account.funds_balance + p_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Grant permissions
GRANT EXECUTE ON FUNCTION transfer_funds_to_billing TO authenticated;
GRANT EXECUTE ON FUNCTION auto_transfer_overpayment TO authenticated;
GRANT EXECUTE ON FUNCTION credit_fundraising_to_scout TO authenticated;

-- ============================================
-- PHASE 6: UPDATE DEFAULT ACCOUNTS FUNCTION
-- ============================================

-- Update default accounts function for new units to include Scout Funds accounts
CREATE OR REPLACE FUNCTION create_default_accounts(p_unit_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO accounts (unit_id, code, name, account_type, is_system) VALUES
    -- Assets
    (p_unit_id, '1000', 'Bank Account - Checking', 'asset', true),
    (p_unit_id, '1010', 'Bank Account - Savings', 'asset', false),
    (p_unit_id, '1100', 'Accounts Receivable', 'asset', true),
    (p_unit_id, '1200', 'Scout Billing Receivable', 'asset', true),
    (p_unit_id, '1210', 'Scout Funds Receivable', 'asset', true),
    (p_unit_id, '1300', 'Inventory - Fundraising', 'asset', false),

    -- Liabilities
    (p_unit_id, '2000', 'Scout Account Balances (Legacy)', 'liability', true),
    (p_unit_id, '2010', 'Scout Funds Payable', 'liability', true),
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
    (p_unit_id, '5900', 'Other Expenses', 'expense', false)
    ON CONFLICT (unit_id, code) DO NOTHING;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

-- Add comments for documentation
COMMENT ON COLUMN scout_accounts.billing_balance IS 'Amount owed by scout to unit (negative = owes money, zero = paid up)';
COMMENT ON COLUMN scout_accounts.funds_balance IS 'Scout funds from fundraising/overpayments (always >= 0, parent must authorize usage)';
COMMENT ON COLUMN journal_lines.target_balance IS 'Which scout balance to affect: billing or funds';
