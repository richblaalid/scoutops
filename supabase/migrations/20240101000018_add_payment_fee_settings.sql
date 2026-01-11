-- Migration: Add payment fee settings to units
-- Description: Allow units to configure processing fee rates and whether to pass fees to payers

-- ============================================
-- ADD FEE SETTINGS COLUMNS TO UNITS TABLE
-- ============================================

-- Processing fee percentage (default 2.6% for Square)
ALTER TABLE units ADD COLUMN IF NOT EXISTS processing_fee_percent DECIMAL(5,4) DEFAULT 0.0260;

-- Fixed processing fee amount (default $0.10 for Square)
ALTER TABLE units ADD COLUMN IF NOT EXISTS processing_fee_fixed DECIMAL(10,2) DEFAULT 0.10;

-- Whether to pass processing fees to the payer
ALTER TABLE units ADD COLUMN IF NOT EXISTS pass_fees_to_payer BOOLEAN DEFAULT false;

-- ============================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN units.processing_fee_percent IS 'Card processing fee percentage (e.g., 0.0260 = 2.6%)';
COMMENT ON COLUMN units.processing_fee_fixed IS 'Fixed card processing fee amount in dollars (e.g., 0.10 = $0.10)';
COMMENT ON COLUMN units.pass_fees_to_payer IS 'If true, processing fees are added to payment amount instead of deducted from unit proceeds';
