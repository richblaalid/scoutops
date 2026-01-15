-- Add RLS policies for scout role to access their own data

-- ============================================
-- SCOUT ACCOUNTS: Allow scouts to view their own account
-- ============================================
CREATE POLICY "Scouts can view own account"
    ON scout_accounts FOR SELECT
    USING (
        scout_id IN (
            SELECT id FROM scouts WHERE profile_id = auth.uid()
        )
    );

-- ============================================
-- JOURNAL LINES: Allow scouts to view their own transaction history
-- ============================================
CREATE POLICY "Scouts can view own journal lines"
    ON journal_lines FOR SELECT
    USING (
        scout_account_id IN (
            SELECT sa.id FROM scout_accounts sa
            JOIN scouts s ON s.id = sa.scout_id
            WHERE s.profile_id = auth.uid()
        )
    );

-- ============================================
-- JOURNAL ENTRIES: Allow scouts to view entries for their transactions
-- ============================================
CREATE POLICY "Scouts can view own journal entries"
    ON journal_entries FOR SELECT
    USING (
        id IN (
            SELECT jl.journal_entry_id FROM journal_lines jl
            JOIN scout_accounts sa ON sa.id = jl.scout_account_id
            JOIN scouts s ON s.id = sa.scout_id
            WHERE s.profile_id = auth.uid()
        )
    );

-- ============================================
-- BILLING CHARGES: Allow scouts to view their own charges
-- ============================================
CREATE POLICY "Scouts can view own billing charges"
    ON billing_charges FOR SELECT
    USING (
        scout_account_id IN (
            SELECT sa.id FROM scout_accounts sa
            JOIN scouts s ON s.id = sa.scout_id
            WHERE s.profile_id = auth.uid()
        )
    );

-- ============================================
-- PAYMENTS: Allow scouts to view their own payments
-- ============================================
CREATE POLICY "Scouts can view own payments"
    ON payments FOR SELECT
    USING (
        scout_account_id IN (
            SELECT sa.id FROM scout_accounts sa
            JOIN scouts s ON s.id = sa.scout_id
            WHERE s.profile_id = auth.uid()
        )
    );
