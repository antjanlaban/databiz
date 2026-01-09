-- Migration: Seed first admin user and company
-- Purpose: Create initial company and prepare for first admin user
-- Note: Admin user must be created manually via Supabase Dashboard or API
-- After creating the user in auth.users, link it to user_profiles with role 'admin'

-- Insert Van Kruiningen Reclame company
INSERT INTO companies (id, name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Van Kruiningen Reclame')
ON CONFLICT (id) DO NOTHING;

-- Note: To complete the admin setup:
-- 1. Create user in Supabase Dashboard (Authentication > Users > Add User)
--    - Email: [your email]
--    - Password: [set temporary password]
--    - Auto Confirm: true
-- 2. Get the user ID from auth.users
-- 3. Run this SQL to create the admin profile:
--
-- INSERT INTO user_profiles (id, role, status)
-- VALUES ('[user-id-from-auth.users]', 'admin', 'active')
-- ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE companies IS 'First company seeded: Van Kruiningen Reclame';

