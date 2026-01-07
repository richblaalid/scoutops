-- Migration: Create Financial Tables
-- Description: Chart of accounts, scout accounts, journal entries and lines

-- ============================================
-- CHART OF ACCOUNTS
-- ============================================
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN (
        'asset', 'liability', 'equity', 'income', 'expense'
    )),
    parent_id UUID REFERENCES accounts(id),
    is_system BOOLEAN DEFAULT false,  -- System accounts can't be deleted
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(unit_id, code)
);

-- ============================================
-- SCOUT INDIVIDUAL ACCOUNTS (sub-ledger)
-- ============================================
CREATE TABLE scout_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scout_id UUID NOT NULL REFERENCES scouts(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(scout_id)
);

-- ============================================
-- JOURNAL ENTRIES (transaction headers)
-- ============================================
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    description TEXT NOT NULL,
    reference VARCHAR(100),  -- Check number, receipt number, etc.
    entry_type VARCHAR(50),  -- payment, charge, transfer, adjustment
    is_posted BOOLEAN DEFAULT false,
    is_void BOOLEAN DEFAULT false,
    void_reason TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    posted_at TIMESTAMPTZ
);

-- ============================================
-- JOURNAL ENTRY LINES (debits and credits)
-- ============================================
CREATE TABLE journal_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id),
    scout_account_id UUID REFERENCES scout_accounts(id),  -- Optional: tag to scout
    debit DECIMAL(10,2) DEFAULT 0.00,
    credit DECIMAL(10,2) DEFAULT 0.00,
    memo TEXT,
    CHECK (debit >= 0 AND credit >= 0),
    CHECK (NOT (debit > 0 AND credit > 0))  -- Can't have both on same line
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_accounts_unit ON accounts(unit_id);
CREATE INDEX idx_scout_accounts_scout ON scout_accounts(scout_id);
CREATE INDEX idx_scout_accounts_unit ON scout_accounts(unit_id);
CREATE INDEX idx_journal_entries_unit ON journal_entries(unit_id);
CREATE INDEX idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX idx_journal_lines_entry ON journal_lines(journal_entry_id);
CREATE INDEX idx_journal_lines_account ON journal_lines(account_id);
CREATE INDEX idx_journal_lines_scout_account ON journal_lines(scout_account_id);
