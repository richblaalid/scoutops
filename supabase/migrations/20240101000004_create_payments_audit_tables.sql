-- Migration: Create Payments and Audit Tables
-- Description: Payment records and audit logging

-- ============================================
-- PAYMENTS (Square Integration)
-- ============================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    scout_account_id UUID REFERENCES scout_accounts(id),
    amount DECIMAL(10,2) NOT NULL,
    fee_amount DECIMAL(10,2) DEFAULT 0.00,
    net_amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),  -- card, cash, check, transfer
    square_payment_id VARCHAR(255),
    square_receipt_url TEXT,
    status VARCHAR(20) DEFAULT 'completed',
    journal_entry_id UUID REFERENCES journal_entries(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INVENTORY ITEMS (Fundraising) - Phase 0 stub
-- ============================================
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(50),
    category VARCHAR(100),  -- popcorn, camp_cards, wreaths
    unit_cost DECIMAL(10,2),
    sale_price DECIMAL(10,2),
    quantity_on_hand INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INVENTORY CHECKOUTS
-- ============================================
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

-- ============================================
-- AUDIT LOG
-- ============================================
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,  -- INSERT, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    performed_by UUID REFERENCES profiles(id),
    performed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_payments_unit ON payments(unit_id);
CREATE INDEX idx_payments_scout_account ON payments(scout_account_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_inventory_items_unit ON inventory_items(unit_id);
CREATE INDEX idx_inventory_checkouts_item ON inventory_checkouts(inventory_item_id);
CREATE INDEX idx_inventory_checkouts_scout ON inventory_checkouts(scout_id);
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_unit ON audit_log(unit_id);
CREATE INDEX idx_audit_log_performed_at ON audit_log(performed_at);
