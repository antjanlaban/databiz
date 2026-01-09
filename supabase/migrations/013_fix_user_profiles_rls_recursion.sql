-- Migration: Fix infinite recursion in user_profiles RLS policies
-- Problem: Policies query user_profiles table, causing infinite recursion
-- Solution: Use security definer function to bypass RLS when checking roles

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Business admins can read company profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;

-- Create security definer function to check user role (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_role(_user_id UUID)
RETURNS VARCHAR(20)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  _role VARCHAR(20);
BEGIN
  SELECT role INTO _role
  FROM user_profiles
  WHERE id = _user_id;
  
  RETURN COALESCE(_role, '');
END;
$$;

-- Create security definer function to check user company (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  _company_id UUID;
BEGIN
  SELECT company_id INTO _company_id
  FROM user_profiles
  WHERE id = _user_id;
  
  RETURN _company_id;
END;
$$;

-- Recreate policies using the security definer functions (no recursion)
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Business admins can read profiles within their company
CREATE POLICY "Business admins can read company profiles"
  ON user_profiles FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'business_admin'
    AND get_user_company_id(auth.uid()) = company_id
  );

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON user_profiles FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

-- Also fix user_invites policies to use the same pattern
DROP POLICY IF EXISTS "Business admins can read company invites" ON user_invites;
DROP POLICY IF EXISTS "Admins can read all invites" ON user_invites;

-- Business admins can read invites for their company
CREATE POLICY "Business admins can read company invites"
  ON user_invites FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'business_admin'
    AND get_user_company_id(auth.uid()) = company_id
  );

-- Admins can read all invites
CREATE POLICY "Admins can read all invites"
  ON user_invites FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

-- Add comments
COMMENT ON FUNCTION get_user_role(UUID) IS 'Security definer function to get user role without RLS recursion';
COMMENT ON FUNCTION get_user_company_id(UUID) IS 'Security definer function to get user company_id without RLS recursion';

