-- DataBiz Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  ean TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  supplier TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create import_sessions table
CREATE TABLE IF NOT EXISTS import_sessions (
  id BIGSERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_rows INTEGER NOT NULL DEFAULT 0,
  processed_rows INTEGER NOT NULL DEFAULT 0,
  conflicts_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ean_conflicts table
CREATE TABLE IF NOT EXISTS ean_conflicts (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
  ean TEXT NOT NULL,
  existing_product JSONB NOT NULL,
  new_product JSONB NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolution TEXT CHECK (resolution IN ('keep_existing', 'use_new', 'skip') OR resolution IS NULL),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_products_ean ON products(ean);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier);
CREATE INDEX IF NOT EXISTS idx_import_sessions_status ON import_sessions(status);
CREATE INDEX IF NOT EXISTS idx_import_sessions_created_at ON import_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ean_conflicts_session_id ON ean_conflicts(session_id);
CREATE INDEX IF NOT EXISTS idx_ean_conflicts_resolved ON ean_conflicts(resolved);
CREATE INDEX IF NOT EXISTS idx_ean_conflicts_ean ON ean_conflicts(ean);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_import_sessions_updated_at ON import_sessions;
CREATE TRIGGER update_import_sessions_updated_at
  BEFORE UPDATE ON import_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ean_conflicts ENABLE ROW LEVEL SECURITY;

-- Create permissive policies (allow all operations for now)
-- Note: You should configure proper authentication and restrict these policies
DROP POLICY IF EXISTS "Allow all operations on products" ON products;
CREATE POLICY "Allow all operations on products" 
  ON products FOR ALL 
  USING (true) 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on import_sessions" ON import_sessions;
CREATE POLICY "Allow all operations on import_sessions" 
  ON import_sessions FOR ALL 
  USING (true) 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on ean_conflicts" ON ean_conflicts;
CREATE POLICY "Allow all operations on ean_conflicts" 
  ON ean_conflicts FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Grant permissions to authenticated and anon roles
GRANT ALL ON products TO authenticated, anon;
GRANT ALL ON import_sessions TO authenticated, anon;
GRANT ALL ON ean_conflicts TO authenticated, anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
