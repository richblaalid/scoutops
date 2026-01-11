-- Performance optimization: Add composite indexes for common query patterns

-- Index for filtering unit memberships by unit and status (frequently queried together)
CREATE INDEX IF NOT EXISTS idx_unit_memberships_unit_status
ON unit_memberships(unit_id, status);

-- Index for filtering scouts by unit and active status (frequently queried together)
CREATE INDEX IF NOT EXISTS idx_scouts_unit_active
ON scouts(unit_id, is_active);

-- Index for payment lookups by unit (common in financial reports)
CREATE INDEX IF NOT EXISTS idx_payments_unit_created
ON payments(unit_id, created_at DESC);

-- Index for journal entries date range queries
CREATE INDEX IF NOT EXISTS idx_journal_entries_unit_date
ON journal_entries(unit_id, entry_date DESC);
