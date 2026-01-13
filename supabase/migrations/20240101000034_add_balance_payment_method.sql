-- Add support for balance payment method
-- No schema changes needed - payments.payment_method is VARCHAR

-- Document the valid payment methods
COMMENT ON COLUMN payments.payment_method IS 'Payment method: card, cash, check, transfer, balance';

-- Add index for balance payments for reporting queries
CREATE INDEX IF NOT EXISTS idx_payments_balance ON payments(payment_method) WHERE payment_method = 'balance';
