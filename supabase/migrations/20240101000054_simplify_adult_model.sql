-- Migration: Simplify Adult Model
-- Description: Decouple profiles from auth.users, remove roster_adults table
-- This is a destructive migration for a test database

-- ============================================
-- Step 1: Add new columns to profiles if they don't exist
-- ============================================
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS bsa_member_id VARCHAR(20),
    ADD COLUMN IF NOT EXISTS member_type VARCHAR(20) CHECK (member_type IN ('LEADER', 'P 18+') OR member_type IS NULL),
    ADD COLUMN IF NOT EXISTS patrol VARCHAR(100),
    ADD COLUMN IF NOT EXISTS position TEXT,
    ADD COLUMN IF NOT EXISTS position_2 TEXT,
    ADD COLUMN IF NOT EXISTS renewal_status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS expiration_date VARCHAR(20),
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS sync_session_id UUID,
    ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Set user_id for existing profiles (if not already set)
UPDATE profiles SET user_id = id WHERE user_id IS NULL;

-- ============================================
-- Step 2: Update helper functions
-- ============================================

-- Helper function to get current user's profile_id
CREATE OR REPLACE FUNCTION get_current_profile_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's units
CREATE OR REPLACE FUNCTION get_user_units()
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT unit_id FROM unit_memberships
    WHERE profile_id = get_current_profile_id() AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user has role in unit
CREATE OR REPLACE FUNCTION user_has_role(unit UUID, required_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM unit_memberships
        WHERE unit_id = unit
        AND profile_id = get_current_profile_id()
        AND status = 'active'
        AND role = ANY(required_roles)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Step 3: Update RLS policies for profiles
-- ============================================

-- Drop existing profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their units" ON profiles;
DROP POLICY IF EXISTS "Users can view non-user profiles linked as guardians" ON profiles;

-- Create updated profiles policies
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can view profiles in their units"
    ON profiles FOR SELECT
    USING (
        id IN (
            SELECT profile_id FROM unit_memberships
            WHERE unit_id IN (SELECT get_user_units())
        )
    );

-- Allow viewing non-user profiles (imported adults without accounts)
CREATE POLICY "Users can view non-user profiles linked as guardians"
    ON profiles FOR SELECT
    USING (
        user_id IS NULL AND
        id IN (
            SELECT profile_id FROM scout_guardians
            WHERE scout_id IN (
                SELECT id FROM scouts WHERE unit_id IN (SELECT get_user_units())
            )
        )
    );

-- ============================================
-- Step 4: Drop roster_adults and related constraints
-- ============================================

-- First drop RLS policies that depend on roster_adult_id
DROP POLICY IF EXISTS "Parents can view their scouts' accounts" ON scout_accounts;
DROP POLICY IF EXISTS "Parents can manage their scouts' RSVPs" ON event_rsvps;
DROP POLICY IF EXISTS "Parents can view their scouts' charges" ON billing_charges;
DROP POLICY IF EXISTS "Parents can view their scouts' payments" ON payments;

-- Recreate the parent policies using profile_id only
CREATE POLICY "Parents can view their scouts' accounts"
    ON scout_accounts FOR SELECT
    USING (
        scout_id IN (
            SELECT scout_id FROM scout_guardians WHERE profile_id = get_current_profile_id()
        )
    );

CREATE POLICY "Parents can manage their scouts' RSVPs"
    ON event_rsvps FOR ALL
    USING (
        scout_id IN (
            SELECT scout_id FROM scout_guardians WHERE profile_id = get_current_profile_id()
        )
    );

CREATE POLICY "Parents can view their scouts' charges"
    ON billing_charges FOR SELECT
    USING (
        scout_account_id IN (
            SELECT sa.id FROM scout_accounts sa
            JOIN scout_guardians sg ON sg.scout_id = sa.scout_id
            WHERE sg.profile_id = get_current_profile_id()
        )
    );

CREATE POLICY "Parents can view their scouts' payments"
    ON payments FOR SELECT
    USING (
        scout_account_id IN (
            SELECT sa.id FROM scout_accounts sa
            JOIN scout_guardians sg ON sg.scout_id = sa.scout_id
            WHERE sg.profile_id = get_current_profile_id()
        )
    );

-- Now drop the roster_adult_id columns and constraints
ALTER TABLE scout_guardians DROP CONSTRAINT IF EXISTS scout_guardians_roster_adult_id_fkey;
ALTER TABLE scout_guardians DROP COLUMN IF EXISTS roster_adult_id;
ALTER TABLE unit_memberships DROP CONSTRAINT IF EXISTS unit_memberships_roster_adult_id_fkey;
ALTER TABLE unit_memberships DROP COLUMN IF EXISTS roster_adult_id;

-- Drop the roster_adults table
DROP TABLE IF EXISTS roster_adults CASCADE;

-- ============================================
-- Step 5: Update sync_staged_members
-- ============================================
ALTER TABLE sync_staged_members
    DROP COLUMN IF EXISTS existing_roster_adult_id,
    ADD COLUMN IF NOT EXISTS existing_profile_id UUID REFERENCES profiles(id);

-- ============================================
-- Step 6: Update profiles trigger for new users
-- Links to existing profile if found by email, otherwise creates new
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    existing_profile_id UUID;
BEGIN
    -- Check if a profile with this email already exists (e.g., roster import)
    SELECT id INTO existing_profile_id
    FROM public.profiles
    WHERE email = NEW.email AND user_id IS NULL
    LIMIT 1;

    IF existing_profile_id IS NOT NULL THEN
        -- Link the existing profile to the new auth user
        UPDATE public.profiles
        SET user_id = NEW.id,
            full_name = COALESCE(full_name, NEW.raw_user_meta_data->>'full_name', NEW.email)
        WHERE id = existing_profile_id;
    ELSE
        -- Create a new profile for this user
        INSERT INTO public.profiles (user_id, email, full_name)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Step 7: Create indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_bsa_member_id ON profiles(bsa_member_id);
