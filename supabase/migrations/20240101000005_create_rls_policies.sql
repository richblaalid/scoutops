-- Migration: Create Row Level Security Policies
-- Description: Secure access to all tables based on user roles

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scout_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scout_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTION: Get current user's profile_id
-- ============================================
CREATE OR REPLACE FUNCTION get_current_profile_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Get user's units
-- ============================================
CREATE OR REPLACE FUNCTION get_user_units()
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT unit_id FROM unit_memberships
    WHERE profile_id = get_current_profile_id() AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Check if user has role in unit
-- ============================================
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
-- PROFILES POLICIES
-- ============================================
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
-- UNITS POLICIES
-- ============================================
CREATE POLICY "Users can view their units"
    ON units FOR SELECT
    USING (id IN (SELECT get_user_units()));

CREATE POLICY "Admins can update their units"
    ON units FOR UPDATE
    USING (user_has_role(id, ARRAY['admin']));

-- ============================================
-- UNIT MEMBERSHIPS POLICIES
-- ============================================
CREATE POLICY "Users can view memberships in their units"
    ON unit_memberships FOR SELECT
    USING (unit_id IN (SELECT get_user_units()));

CREATE POLICY "Admins can manage memberships"
    ON unit_memberships FOR ALL
    USING (user_has_role(unit_id, ARRAY['admin']));

-- ============================================
-- SCOUTS POLICIES
-- ============================================
CREATE POLICY "Users can view scouts in their units"
    ON scouts FOR SELECT
    USING (unit_id IN (SELECT get_user_units()));

CREATE POLICY "Leaders can manage scouts"
    ON scouts FOR ALL
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer', 'leader']));

-- ============================================
-- SCOUT GUARDIANS POLICIES
-- ============================================
CREATE POLICY "Users can view guardians in their units"
    ON scout_guardians FOR SELECT
    USING (
        scout_id IN (
            SELECT id FROM scouts WHERE unit_id IN (SELECT get_user_units())
        )
    );

CREATE POLICY "Leaders can manage guardians"
    ON scout_guardians FOR ALL
    USING (
        scout_id IN (
            SELECT id FROM scouts
            WHERE user_has_role(unit_id, ARRAY['admin', 'treasurer', 'leader'])
        )
    );

-- ============================================
-- ACCOUNTS POLICIES (Chart of Accounts)
-- ============================================
CREATE POLICY "Users can view accounts in their units"
    ON accounts FOR SELECT
    USING (unit_id IN (SELECT get_user_units()));

CREATE POLICY "Treasurers can manage accounts"
    ON accounts FOR ALL
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer']));

-- ============================================
-- SCOUT ACCOUNTS POLICIES
-- ============================================
-- Leaders can see all scout accounts
CREATE POLICY "Leaders can view all scout accounts"
    ON scout_accounts FOR SELECT
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer', 'leader']));

-- Parents can see their own scouts' accounts
CREATE POLICY "Parents can view own scouts accounts"
    ON scout_accounts FOR SELECT
    USING (
        scout_id IN (
            SELECT scout_id FROM scout_guardians WHERE profile_id = get_current_profile_id()
        )
    );

CREATE POLICY "Treasurers can manage scout accounts"
    ON scout_accounts FOR ALL
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer']));

-- ============================================
-- JOURNAL ENTRIES POLICIES
-- ============================================
CREATE POLICY "Leaders can view journal entries"
    ON journal_entries FOR SELECT
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer', 'leader']));

CREATE POLICY "Treasurers can manage journal entries"
    ON journal_entries FOR ALL
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer']));

-- ============================================
-- JOURNAL LINES POLICIES
-- ============================================
CREATE POLICY "Leaders can view journal lines"
    ON journal_lines FOR SELECT
    USING (
        journal_entry_id IN (
            SELECT id FROM journal_entries
            WHERE user_has_role(unit_id, ARRAY['admin', 'treasurer', 'leader'])
        )
    );

CREATE POLICY "Treasurers can manage journal lines"
    ON journal_lines FOR ALL
    USING (
        journal_entry_id IN (
            SELECT id FROM journal_entries
            WHERE user_has_role(unit_id, ARRAY['admin', 'treasurer'])
        )
    );

-- ============================================
-- EVENTS POLICIES
-- ============================================
CREATE POLICY "Users can view events in their units"
    ON events FOR SELECT
    USING (unit_id IN (SELECT get_user_units()));

CREATE POLICY "Leaders can manage events"
    ON events FOR ALL
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer', 'leader']));

-- ============================================
-- EVENT RSVPS POLICIES
-- ============================================
CREATE POLICY "Users can view RSVPs in their units"
    ON event_rsvps FOR SELECT
    USING (
        event_id IN (
            SELECT id FROM events WHERE unit_id IN (SELECT get_user_units())
        )
    );

CREATE POLICY "Users can manage own RSVPs"
    ON event_rsvps FOR ALL
    USING (profile_id = get_current_profile_id());

CREATE POLICY "Parents can manage their scouts RSVPs"
    ON event_rsvps FOR ALL
    USING (
        scout_id IN (
            SELECT scout_id FROM scout_guardians WHERE profile_id = get_current_profile_id()
        )
    );

-- ============================================
-- BILLING RECORDS POLICIES
-- ============================================
CREATE POLICY "Leaders can view billing records"
    ON billing_records FOR SELECT
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer', 'leader']));

CREATE POLICY "Treasurers can manage billing records"
    ON billing_records FOR ALL
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer']));

-- ============================================
-- BILLING CHARGES POLICIES
-- ============================================
CREATE POLICY "Leaders can view billing charges"
    ON billing_charges FOR SELECT
    USING (
        billing_record_id IN (
            SELECT id FROM billing_records
            WHERE user_has_role(unit_id, ARRAY['admin', 'treasurer', 'leader'])
        )
    );

CREATE POLICY "Parents can view own scouts billing charges"
    ON billing_charges FOR SELECT
    USING (
        scout_account_id IN (
            SELECT sa.id FROM scout_accounts sa
            JOIN scout_guardians sg ON sg.scout_id = sa.scout_id
            WHERE sg.profile_id = get_current_profile_id()
        )
    );

CREATE POLICY "Treasurers can manage billing charges"
    ON billing_charges FOR ALL
    USING (
        billing_record_id IN (
            SELECT id FROM billing_records
            WHERE user_has_role(unit_id, ARRAY['admin', 'treasurer'])
        )
    );

-- ============================================
-- PAYMENTS POLICIES
-- ============================================
CREATE POLICY "Leaders can view payments"
    ON payments FOR SELECT
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer', 'leader']));

CREATE POLICY "Parents can view own scouts payments"
    ON payments FOR SELECT
    USING (
        scout_account_id IN (
            SELECT sa.id FROM scout_accounts sa
            JOIN scout_guardians sg ON sg.scout_id = sa.scout_id
            WHERE sg.profile_id = get_current_profile_id()
        )
    );

CREATE POLICY "Treasurers can manage payments"
    ON payments FOR ALL
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer']));

-- ============================================
-- INVENTORY POLICIES
-- ============================================
CREATE POLICY "Users can view inventory in their units"
    ON inventory_items FOR SELECT
    USING (unit_id IN (SELECT get_user_units()));

CREATE POLICY "Leaders can manage inventory"
    ON inventory_items FOR ALL
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer', 'leader']));

CREATE POLICY "Users can view checkouts in their units"
    ON inventory_checkouts FOR SELECT
    USING (
        inventory_item_id IN (
            SELECT id FROM inventory_items WHERE unit_id IN (SELECT get_user_units())
        )
    );

CREATE POLICY "Leaders can manage checkouts"
    ON inventory_checkouts FOR ALL
    USING (
        inventory_item_id IN (
            SELECT id FROM inventory_items
            WHERE user_has_role(unit_id, ARRAY['admin', 'treasurer', 'leader'])
        )
    );

-- ============================================
-- AUDIT LOG POLICIES
-- ============================================
CREATE POLICY "Admins can view audit log"
    ON audit_log FOR SELECT
    USING (user_has_role(unit_id, ARRAY['admin', 'treasurer']));
