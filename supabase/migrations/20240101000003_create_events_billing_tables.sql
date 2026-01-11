-- Migration: Create Events and Billing Tables
-- Description: Events, RSVPs, billing records, and charges

-- ============================================
-- EVENTS (campouts, meetings, etc.)
-- ============================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50),  -- campout, meeting, service, fundraiser
    location VARCHAR(255),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    cost_per_scout DECIMAL(10,2),
    cost_per_adult DECIMAL(10,2),
    max_participants INTEGER,
    rsvp_deadline TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EVENT RSVPs
-- ============================================
CREATE TABLE event_rsvps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    scout_id UUID REFERENCES scouts(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,  -- For adults
    status VARCHAR(20) NOT NULL CHECK (status IN ('going', 'not_going', 'maybe')),
    is_driver BOOLEAN DEFAULT false,
    vehicle_seats INTEGER,
    notes TEXT,
    responded_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (scout_id IS NOT NULL OR profile_id IS NOT NULL)
);

-- ============================================
-- FAIR SHARE BILLING RECORDS
-- ============================================
CREATE TABLE billing_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    billing_date DATE NOT NULL,
    journal_entry_id UUID REFERENCES journal_entries(id),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDIVIDUAL CHARGES FROM BILLING
-- ============================================
CREATE TABLE billing_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    billing_record_id UUID NOT NULL REFERENCES billing_records(id) ON DELETE CASCADE,
    scout_account_id UUID NOT NULL REFERENCES scout_accounts(id),
    amount DECIMAL(10,2) NOT NULL,
    is_paid BOOLEAN DEFAULT false
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_events_unit ON events(unit_id);
CREATE INDEX idx_events_dates ON events(start_date, end_date);
CREATE INDEX idx_event_rsvps_event ON event_rsvps(event_id);
CREATE INDEX idx_billing_records_unit ON billing_records(unit_id);
CREATE INDEX idx_billing_records_event ON billing_records(event_id);
CREATE INDEX idx_billing_charges_record ON billing_charges(billing_record_id);
CREATE INDEX idx_billing_charges_scout ON billing_charges(scout_account_id);
