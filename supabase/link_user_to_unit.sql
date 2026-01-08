-- ============================================
-- LINK YOUR USER TO THE TEST UNIT
-- ============================================
-- Run this AFTER you sign up via the app
-- Replace YOUR_EMAIL with your actual email

-- Option 1: Link by email (easiest)
INSERT INTO unit_memberships (unit_id, profile_id, role, is_active)
SELECT
    '10000000-0000-4000-a000-000000000001',
    p.id,
    'admin',
    true
FROM profiles p
WHERE p.email = 'YOUR_EMAIL_HERE'
ON CONFLICT (unit_id, profile_id) DO UPDATE SET role = 'admin', is_active = true;

-- Option 2: Link the most recently created user (if you just signed up)
-- Uncomment to use:
/*
INSERT INTO unit_memberships (unit_id, profile_id, role, is_active)
SELECT
    '10000000-0000-4000-a000-000000000001',
    p.id,
    'admin',
    true
FROM profiles p
ORDER BY p.created_at DESC
LIMIT 1
ON CONFLICT (unit_id, profile_id) DO UPDATE SET role = 'admin', is_active = true;
*/

-- Verify the membership was created
SELECT
    p.email,
    um.role,
    u.name as unit_name
FROM unit_memberships um
JOIN profiles p ON p.id = um.profile_id
JOIN units u ON u.id = um.unit_id
WHERE um.is_active = true;
