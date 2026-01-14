-- Production Seed Data
-- Run this in Supabase SQL Editor AFTER signing up via the app
-- (You need an auth.users entry first from signing up)

-- ============================================
-- STEP 1: Update these values
-- ============================================
DO $$
DECLARE
    v_user_email TEXT := 'richard.blaalid+admin@withcaldera.com';
    v_full_name TEXT := 'Rich Blaalid';
    v_unit_name TEXT := 'Troop 297';
    v_unit_number TEXT := '297';
    v_unit_type TEXT := 'troop';

    v_user_id UUID;
    v_unit_id UUID;
    v_profile_id UUID;
BEGIN
    -- ============================================
    -- STEP 2: Get user ID from auth.users
    -- ============================================
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = v_user_email;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found. Please sign up first at the app, then run this script.';
    END IF;

    -- ============================================
    -- STEP 3: Create or update profile
    -- ============================================
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (v_user_id, v_user_email, v_full_name)
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        updated_at = NOW();

    v_profile_id := v_user_id;

    -- ============================================
    -- STEP 4: Create unit
    -- ============================================
    INSERT INTO public.units (name, unit_number, unit_type)
    VALUES (v_unit_name, v_unit_number, v_unit_type)
    RETURNING id INTO v_unit_id;

    -- ============================================
    -- STEP 5: Create admin membership
    -- ============================================
    INSERT INTO public.unit_memberships (unit_id, profile_id, role, status)
    VALUES (v_unit_id, v_profile_id, 'admin', 'active');

    -- ============================================
    -- STEP 6: Create default chart of accounts
    -- ============================================
    INSERT INTO public.accounts (unit_id, code, name, account_type, is_system) VALUES
        (v_unit_id, '1000', 'Bank Account', 'asset', true),
        (v_unit_id, '1200', 'Scout Accounts Receivable', 'asset', true),
        (v_unit_id, '1210', 'Scout Funds Held', 'liability', true),
        (v_unit_id, '2000', 'Accounts Payable', 'liability', true),
        (v_unit_id, '3000', 'Unit Equity', 'equity', true),
        (v_unit_id, '4000', 'Dues Revenue', 'revenue', true),
        (v_unit_id, '4100', 'Activity Revenue', 'revenue', true),
        (v_unit_id, '4200', 'Fundraising Revenue', 'revenue', true),
        (v_unit_id, '4900', 'Other Revenue', 'revenue', true),
        (v_unit_id, '5000', 'Activity Expenses', 'expense', true),
        (v_unit_id, '5100', 'Supplies Expense', 'expense', true),
        (v_unit_id, '5200', 'Equipment Expense', 'expense', true),
        (v_unit_id, '5600', 'Payment Processing Fees', 'expense', true),
        (v_unit_id, '5900', 'Other Expenses', 'expense', true);

    RAISE NOTICE 'Seed complete!';
    RAISE NOTICE 'Unit ID: %', v_unit_id;
    RAISE NOTICE 'Profile ID: %', v_profile_id;
END $$;

-- Verify the setup
SELECT 'Units' as table_name, count(*) as count FROM public.units
UNION ALL
SELECT 'Profiles', count(*) FROM public.profiles
UNION ALL
SELECT 'Memberships', count(*) FROM public.unit_memberships
UNION ALL
SELECT 'Accounts', count(*) FROM public.accounts;
