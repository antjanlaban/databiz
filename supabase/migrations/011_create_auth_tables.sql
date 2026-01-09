-- Migration: Create authentication tables
-- Purpose: User profiles, invites, and role-based access control
-- Extends Supabase auth.users with application-specific data

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'business_admin', 'worker')),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending_invite' 
    CHECK (status IN ('pending_invite', 'active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints: business_admin and worker must have company, admin must not
  CONSTRAINT chk_business_admin_has_company 
    CHECK (role != 'business_admin' OR company_id IS NOT NULL),
  CONSTRAINT chk_worker_has_company 
    CHECK (role != 'worker' OR company_id IS NOT NULL),
  CONSTRAINT chk_admin_no_company 
    CHECK (role != 'admin' OR company_id IS NULL)
);

-- User invites
CREATE TABLE IF NOT EXISTS user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'business_admin', 'worker')),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints: business_admin and worker must have company, admin must not
  CONSTRAINT chk_invite_business_admin_has_company 
    CHECK (role != 'business_admin' OR company_id IS NOT NULL),
  CONSTRAINT chk_invite_worker_has_company 
    CHECK (role != 'worker' OR company_id IS NOT NULL),
  CONSTRAINT chk_invite_admin_no_company 
    CHECK (role != 'admin' OR company_id IS NULL)
);

-- Indexes for user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_company ON user_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);

-- Indexes for user_invites
CREATE INDEX IF NOT EXISTS idx_user_invites_token ON user_invites(token);
CREATE INDEX IF NOT EXISTS idx_user_invites_email ON user_invites(email);
CREATE INDEX IF NOT EXISTS idx_user_invites_status ON user_invites(status);
CREATE INDEX IF NOT EXISTS idx_user_invites_expires ON user_invites(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_invites_created_by ON user_invites(created_by);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invites ENABLE ROW LEVEL SECURITY;

-- User profiles policies
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Business admins can read profiles within their company
CREATE POLICY "Business admins can read company profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'business_admin'
      AND up.company_id = user_profiles.company_id
    )
  );

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
    )
  );

-- User invites policies
-- Users can read invites they created
CREATE POLICY "Users can read own invites"
  ON user_invites FOR SELECT
  USING (created_by = auth.uid());

-- Business admins can read invites for their company
CREATE POLICY "Business admins can read company invites"
  ON user_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'business_admin'
      AND up.company_id = user_invites.company_id
    )
  );

-- Admins can read all invites
CREATE POLICY "Admins can read all invites"
  ON user_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role = 'admin'
    )
  );

-- Add comments
COMMENT ON TABLE user_profiles IS 'User profiles extending Supabase auth.users with role, company, and status';
COMMENT ON TABLE user_invites IS 'User invitation system with 48-hour expiration';

