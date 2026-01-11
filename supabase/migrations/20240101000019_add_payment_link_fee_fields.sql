-- Migration: Add fee fields to payment_links
-- Description: Store fee breakdown on payment links for transparency

-- ============================================
-- ADD FEE FIELDS TO PAYMENT_LINKS TABLE
-- ============================================

-- Original amount before fees (what the scout owes)
ALTER TABLE payment_links ADD COLUMN IF NOT EXISTS base_amount INTEGER;

-- Processing fee amount in cents
ALTER TABLE payment_links ADD COLUMN IF NOT EXISTS fee_amount INTEGER DEFAULT 0;

-- Whether fees are passed to payer (snapshot at time of link creation)
ALTER TABLE payment_links ADD COLUMN IF NOT EXISTS fees_passed_to_payer BOOLEAN DEFAULT false;

-- Update existing records: base_amount = amount (for backward compatibility)
UPDATE payment_links SET base_amount = amount WHERE base_amount IS NULL;

-- ============================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN payment_links.base_amount IS 'Original amount owed in cents (before any fees)';
COMMENT ON COLUMN payment_links.fee_amount IS 'Processing fee amount in cents';
COMMENT ON COLUMN payment_links.fees_passed_to_payer IS 'Whether the processing fee is added to the total (true) or absorbed by unit (false)';
