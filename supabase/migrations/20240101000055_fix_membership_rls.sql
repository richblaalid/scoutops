-- Migration: Fix Membership RLS
-- Description: Add policy allowing users to view their own memberships directly
-- This fixes the bootstrap problem where users couldn't see their memberships
-- because the policy relied on get_user_units() which queries unit_memberships

-- Add policy to allow users to view their own memberships directly
CREATE POLICY "Users can view own memberships"
    ON unit_memberships FOR SELECT
    USING (profile_id = get_current_profile_id());
