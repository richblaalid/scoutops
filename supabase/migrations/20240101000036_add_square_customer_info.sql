-- Migration: Add customer info to Square transactions
-- Description: Add buyer email, cardholder name, note, and order line items for payment identification

-- Add new columns for customer identification
ALTER TABLE square_transactions
ADD COLUMN IF NOT EXISTS buyer_email_address TEXT,
ADD COLUMN IF NOT EXISTS cardholder_name TEXT,
ADD COLUMN IF NOT EXISTS note TEXT,
ADD COLUMN IF NOT EXISTS order_line_items JSONB;

-- Add index on buyer email for searching
CREATE INDEX IF NOT EXISTS idx_square_transactions_buyer_email
ON square_transactions(buyer_email_address)
WHERE buyer_email_address IS NOT NULL;

-- Add comment explaining the order_line_items structure
COMMENT ON COLUMN square_transactions.order_line_items IS
'JSON array of line items: [{name: string, quantity: number, amount: number}]';

-- Add comment explaining the note field
COMMENT ON COLUMN square_transactions.note IS
'Payment note/memo from Square - typically contains scout name for ChuckBox payments';
