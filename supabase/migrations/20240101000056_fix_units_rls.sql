-- Migration: Fix Units RLS
-- Description: Add policy allowing users to view units they have membership to
-- This fixes the issue where get_user_units() wasn't working in RLS context

-- Add policy to allow users to view units they have membership to
CREATE POLICY "Users can view units via membership"
    ON units FOR SELECT
    USING (
        id IN (
            SELECT unit_id FROM unit_memberships
            WHERE profile_id = get_current_profile_id()
            AND status = 'active'
        )
    );
