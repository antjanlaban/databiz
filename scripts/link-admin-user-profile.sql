-- Script: Create user profile for admin@databiz.app
-- Run this in Supabase SQL Editor after creating the user in Authentication > Users
-- 
-- This script:
-- 1. Finds the user by email (admin@databiz.app)
-- 2. Creates a user_profile record with role 'admin' and status 'active'

-- Find user ID by email and create profile
INSERT INTO user_profiles (id, role, status)
SELECT 
  id,
  'admin'::VARCHAR(20),
  'active'::VARCHAR(20)
FROM auth.users
WHERE email = 'admin@databiz.app'
ON CONFLICT (id) DO UPDATE
SET 
  role = 'admin',
  status = 'active';

-- Verify the profile was created
SELECT 
  u.id,
  u.email,
  up.role,
  up.status,
  up.created_at
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
WHERE u.email = 'admin@databiz.app';

