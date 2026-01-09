-- Check admin user and profile
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  u.created_at as user_created_at,
  up.id as profile_id,
  up.role,
  up.status,
  up.company_id,
  up.created_at as profile_created_at
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
WHERE u.email = 'info@databiz.app';

