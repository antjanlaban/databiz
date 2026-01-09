-- Script: Delete all data for info@databiz.app
-- ⚠️ WARNING: This will permanently delete the user and related data
-- Run this in Supabase SQL Editor
-- 
-- This script:
-- 1. Shows what will be deleted (verification query)
-- 2. Deletes user invites created by this user (optional - you can comment this out)
-- 3. Note: user_profiles will be automatically deleted via CASCADE when auth.users is deleted
-- 4. Note: You must delete the user from auth.users via Supabase Admin API or Dashboard

-- First, let's see what we're about to delete
SELECT 
  'User Profile' as table_name,
  COUNT(*) as record_count
FROM user_profiles up
JOIN auth.users u ON up.id = u.id
WHERE u.email = 'info@databiz.app'

UNION ALL

SELECT 
  'User Invites (created by)' as table_name,
  COUNT(*) as record_count
FROM user_invites ui
JOIN auth.users u ON ui.created_by = u.id
WHERE u.email = 'info@databiz.app';

-- Get the user ID for reference
SELECT 
  u.id as user_id,
  u.email,
  up.role,
  up.status,
  up.created_at as profile_created_at
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
WHERE u.email = 'info@databiz.app';

-- Delete user invites created by this user (optional - uncomment if you want to delete these)
-- DELETE FROM user_invites
-- WHERE created_by IN (
--   SELECT id FROM auth.users WHERE email = 'info@databiz.app'
-- );

-- Note: To actually delete the user from auth.users, you need to:
-- 1. Use Supabase Dashboard: Authentication > Users > Delete user
-- OR
-- 2. Use Supabase Admin API (see delete-user-info-databiz.mjs script)
-- 
-- The user_profiles record will be automatically deleted via CASCADE when auth.users is deleted.

