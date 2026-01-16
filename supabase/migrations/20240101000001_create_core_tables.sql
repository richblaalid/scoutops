-- Migration: Create Core Tables
-- Description: Units, profiles, memberships, scouts, and guardians

-- ============================================
-- UNITS (Troops/Packs)
-- ============================================
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    unit_number VARCHAR(20) NOT NULL,
    unit_type VARCHAR(20) NOT NULL CHECK (unit_type IN ('troop', 'pack', 'crew', 'ship')),
    council VARCHAR(255),
    district VARCHAR(255),
    chartered_org VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROFILES (decoupled from auth.users - can exist without user account)
-- ============================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,  -- nullable: set when they have an account
    email VARCHAR(255),  -- nullable for imported adults without email
    full_name VARCHAR(255),
    first_name VARCHAR(100),  -- for imported adults
    last_name VARCHAR(100),   -- for imported adults
    phone VARCHAR(20),
    -- BSA/Scoutbook fields (for imported adults)
    bsa_member_id VARCHAR(20),
    member_type VARCHAR(20) CHECK (member_type IN ('LEADER', 'P 18+') OR member_type IS NULL),
    patrol VARCHAR(100),  -- for patrol association
    renewal_status VARCHAR(50),
    expiration_date VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    -- Sync tracking
    sync_session_id UUID,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_bsa_member_id ON profiles(bsa_member_id);

-- ============================================
-- UNIT MEMBERSHIPS (links users to units with roles)
-- ============================================
CREATE TABLE unit_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'treasurer', 'leader', 'parent', 'scout')),
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(unit_id, profile_id)
);

-- ============================================
-- SCOUTS (youth members)
-- ============================================
CREATE TABLE scouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    bsa_member_id VARCHAR(20),
    patrol VARCHAR(100),
    rank VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SCOUT-GUARDIAN RELATIONSHIPS
-- ============================================
CREATE TABLE scout_guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scout_id UUID NOT NULL REFERENCES scouts(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    relationship VARCHAR(50) DEFAULT 'parent',
    is_primary BOOLEAN DEFAULT false,
    UNIQUE(scout_id, profile_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_unit_memberships_profile ON unit_memberships(profile_id);
CREATE INDEX idx_unit_memberships_unit ON unit_memberships(unit_id);
CREATE INDEX idx_scouts_unit ON scouts(unit_id);
CREATE INDEX idx_scout_guardians_scout ON scout_guardians(scout_id);
CREATE INDEX idx_scout_guardians_profile ON scout_guardians(profile_id);
