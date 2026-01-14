-- Fundraiser Types and Void Payments
-- This migration adds:
-- 1. fundraiser_types table for unit-defined fundraiser categories
-- 2. Void capability for manual payments
-- 3. Links journal entries to fundraiser types for tracking

-- =====================================================
-- FUNDRAISER TYPES TABLE
-- =====================================================

CREATE TABLE fundraiser_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(unit_id, name)
);

-- Enable RLS
ALTER TABLE fundraiser_types ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view fundraiser types for their units"
  ON fundraiser_types FOR SELECT
  USING (unit_id IN (
    SELECT unit_id FROM unit_memberships
    WHERE profile_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY "Admins and treasurers can insert fundraiser types"
  ON fundraiser_types FOR INSERT
  WITH CHECK (unit_id IN (
    SELECT unit_id FROM unit_memberships
    WHERE profile_id = auth.uid() AND status = 'active' AND role IN ('admin', 'treasurer')
  ));

CREATE POLICY "Admins and treasurers can update fundraiser types"
  ON fundraiser_types FOR UPDATE
  USING (unit_id IN (
    SELECT unit_id FROM unit_memberships
    WHERE profile_id = auth.uid() AND status = 'active' AND role IN ('admin', 'treasurer')
  ));

CREATE POLICY "Admins and treasurers can delete fundraiser types"
  ON fundraiser_types FOR DELETE
  USING (unit_id IN (
    SELECT unit_id FROM unit_memberships
    WHERE profile_id = auth.uid() AND status = 'active' AND role IN ('admin', 'treasurer')
  ));

-- Seed common fundraiser types for existing units
INSERT INTO fundraiser_types (unit_id, name, description)
SELECT id, 'Wreath Sales', 'Holiday wreath fundraiser'
FROM units;

INSERT INTO fundraiser_types (unit_id, name, description)
SELECT id, 'Popcorn Sales', 'Annual popcorn fundraiser'
FROM units;

INSERT INTO fundraiser_types (unit_id, name, description)
SELECT id, 'Other', 'Miscellaneous fundraising credits'
FROM units;

-- =====================================================
-- VOID PAYMENT CAPABILITY
-- =====================================================

-- Add void fields to payments table
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS void_reason TEXT;

-- Add fundraiser_type_id to journal_entries for tracking
ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS fundraiser_type_id UUID REFERENCES fundraiser_types(id);

-- =====================================================
-- VOID PAYMENT FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION void_payment(
  p_payment_id UUID,
  p_voided_by UUID,
  p_reason TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment payments;
  v_journal_entry journal_entries;
  v_reversal_entry_id UUID;
BEGIN
  -- Get and lock the payment
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment not found');
  END IF;

  IF v_payment.voided_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment already voided');
  END IF;

  -- Only allow voiding manual payments (not Square payments)
  IF v_payment.square_payment_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot void Square payments - use Square dashboard for refunds');
  END IF;

  -- Get the original journal entry
  SELECT * INTO v_journal_entry FROM journal_entries WHERE id = v_payment.journal_entry_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Journal entry not found');
  END IF;

  -- Create reversal journal entry
  INSERT INTO journal_entries (unit_id, description, entry_type)
  VALUES (
    v_journal_entry.unit_id,
    'VOID: ' || v_journal_entry.description,
    'reversal'
  )
  RETURNING id INTO v_reversal_entry_id;

  -- Create reversed journal lines (swap debits/credits)
  INSERT INTO journal_lines (journal_entry_id, account_id, scout_account_id, debit, credit, target_balance)
  SELECT
    v_reversal_entry_id,
    account_id,
    scout_account_id,
    credit, -- swap: original credit becomes debit
    debit,  -- swap: original debit becomes credit
    target_balance
  FROM journal_lines
  WHERE journal_entry_id = v_journal_entry.id;

  -- Mark payment as voided
  UPDATE payments SET
    voided_at = now(),
    voided_by = p_voided_by,
    void_reason = p_reason
  WHERE id = p_payment_id;

  RETURN jsonb_build_object(
    'success', true,
    'reversal_entry_id', v_reversal_entry_id
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION void_payment TO authenticated;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_fundraiser_types_unit_id ON fundraiser_types(unit_id);
CREATE INDEX IF NOT EXISTS idx_fundraiser_types_active ON fundraiser_types(unit_id, is_active);
CREATE INDEX IF NOT EXISTS idx_payments_voided ON payments(voided_at) WHERE voided_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_journal_entries_fundraiser ON journal_entries(fundraiser_type_id) WHERE fundraiser_type_id IS NOT NULL;
