-- Migration: Create ean_variants table
-- Purpose: Store essential searchable fields for EAN variants
-- All other columns are stored in JSON file per dataset

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ean_variants table
CREATE TABLE IF NOT EXISTS ean_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ean VARCHAR(14) NOT NULL,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE RESTRICT,
  color TEXT NOT NULL,
  size TEXT NOT NULL,
  name TEXT NOT NULL,
  import_session_id BIGINT NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ean) -- EAN is uniek, bij duplicaat: oude deactiveren
);

-- Indexes voor snelle zoekopdrachten
CREATE INDEX IF NOT EXISTS idx_ean_variants_ean ON ean_variants(ean);
CREATE INDEX IF NOT EXISTS idx_ean_variants_brand ON ean_variants(brand_id);
CREATE INDEX IF NOT EXISTS idx_ean_variants_active ON ean_variants(is_active);
CREATE INDEX IF NOT EXISTS idx_ean_variants_session ON ean_variants(import_session_id);
CREATE INDEX IF NOT EXISTS idx_ean_variants_name ON ean_variants(name); -- Voor naam zoeken
CREATE INDEX IF NOT EXISTS idx_ean_variants_color ON ean_variants(color); -- Voor Kleur filtering
CREATE INDEX IF NOT EXISTS idx_ean_variants_size ON ean_variants(size); -- Voor Maat filtering

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_ean_variants_brand_color_size ON ean_variants(brand_id, color, size) WHERE is_active = TRUE;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ean_variants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_ean_variants_updated_at
  BEFORE UPDATE ON ean_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_ean_variants_updated_at();

-- Add comments
COMMENT ON TABLE ean_variants IS 'EAN variants with essential searchable fields. All other columns stored in JSON file per dataset.';
COMMENT ON COLUMN ean_variants.ean IS 'EAN code (unique, indexed for fast lookup)';
COMMENT ON COLUMN ean_variants.brand_id IS 'Reference to brands table (indexed for filtering)';
COMMENT ON COLUMN ean_variants.color IS 'Color text field (indexed for filtering)';
COMMENT ON COLUMN ean_variants.size IS 'Size text field (indexed for filtering)';
COMMENT ON COLUMN ean_variants.name IS 'Product name (indexed for searching)';
COMMENT ON COLUMN ean_variants.is_active IS 'Active status (indexed, FALSE when duplicate EAN found)';

