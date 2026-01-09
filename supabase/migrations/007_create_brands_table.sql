-- Migration: Create brands table
-- Purpose: Global brand registry for EAN variants
-- Simple table with only name field for now

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create brands table
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(name);

-- Add comment to table
COMMENT ON TABLE brands IS 'Global brand registry for EAN variants. Simple table with only name field.';

