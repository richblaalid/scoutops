-- Diagnose membership issues
-- Run this in SQL Editor to check why users aren't seeing their units

-- ============================================
-- 1. Check auth users exist
-- ============================================
SELECT id, email, created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- 2. Check profiles exist and match auth users
-- ============================================
SELECT
  p.id as profile_id,
  p.email as profile_email,
  au.id as auth_id,
  au.email as auth_email,
  CASE WHEN p.id = au.id THEN 'MATCH' ELSE 'MISMATCH' END as id_check
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
ORDER BY au.created_at DESC
LIMIT 10;

-- ============================================
-- 3. Check unit_memberships records
-- ============================================
SELECT
  um.id,
  um.unit_id,
  um.profile_id,
  um.role,
  um.status,
  um.is_active,
  p.email as profile_email,
  u.name as unit_name
FROM unit_memberships um
LEFT JOIN profiles p ON p.id = um.profile_id
LEFT JOIN units u ON u.id = um.unit_id
ORDER BY um.joined_at DESC;

-- ============================================
-- 4. Check if profile_id matches auth.users.id
-- ============================================
SELECT
  um.profile_id,
  au.id as auth_user_id,
  au.email,
  um.role,
  um.status,
  CASE WHEN um.profile_id = au.id THEN 'CORRECT' ELSE 'WRONG' END as profile_match
FROM unit_memberships um
JOIN auth.users au ON au.email IN (
  'richard.blaalid+admin@withcaldera.com',
  'richard.blaalid+treasurer@withcaldera.com',
  'richard.blaalid+parent@withcaldera.com',
  'richard.blaalid+cbprod@withcaldera.com'
)
LEFT JOIN profiles p ON p.id = um.profile_id AND p.email = au.email;

-- ============================================
-- 5. Check the exact query the app uses
-- ============================================
-- This simulates what the dashboard does (without RLS bypass)
SELECT
  um.*,
  u.name as unit_name,
  u.unit_number
FROM unit_memberships um
JOIN units u ON u.id = um.unit_id
WHERE um.status = 'active';

-- ============================================
-- 6. Check RLS policies on unit_memberships
-- ============================================
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'unit_memberships';

-- ============================================
-- 7. Verify the units table has data
-- ============================================
SELECT * FROM units;
