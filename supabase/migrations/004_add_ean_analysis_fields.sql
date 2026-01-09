-- Migration: Add EAN analysis fields to import_sessions
-- Adds support for EAN column detection, unique/duplicate EAN counting, and analysis status tracking

-- Add new columns for EAN analysis
ALTER TABLE import_sessions
  ADD COLUMN IF NOT EXISTS unique_ean_count INTEGER,
  ADD COLUMN IF NOT EXISTS duplicate_ean_count INTEGER,
  ADD COLUMN IF NOT EXISTS detected_ean_column VARCHAR(255),
  ADD COLUMN IF NOT EXISTS ean_analysis_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS ean_analysis_at TIMESTAMPTZ;

-- Update status CHECK constraint to include new EAN analysis statuses
ALTER TABLE import_sessions
  DROP CONSTRAINT IF EXISTS import_sessions_status_check;

ALTER TABLE import_sessions
  ADD CONSTRAINT import_sessions_status_check 
  CHECK (status IN ('pending', 'received', 'parsing', 'ready_for_processing', 'processing', 'completed', 'failed'));

-- Add constraint for ean_analysis_status
ALTER TABLE import_sessions
  DROP CONSTRAINT IF EXISTS import_sessions_ean_analysis_status_check;

ALTER TABLE import_sessions
  ADD CONSTRAINT import_sessions_ean_analysis_status_check 
  CHECK (ean_analysis_status IS NULL OR ean_analysis_status IN ('pending', 'analyzing', 'completed', 'failed', 'no_ean_column', 'pending_column_selection'));

-- Add index on ean_analysis_status for efficient queue queries
CREATE INDEX IF NOT EXISTS idx_import_sessions_ean_analysis_status 
  ON import_sessions(ean_analysis_status) 
  WHERE ean_analysis_status IS NOT NULL;

-- Add index on status and ean_analysis_status for finding files ready for EAN analysis
CREATE INDEX IF NOT EXISTS idx_import_sessions_ready_for_ean_analysis 
  ON import_sessions(status, ean_analysis_status) 
  WHERE status = 'ready_for_processing' AND ean_analysis_status IS NULL;

-- Add index on ean_analysis_at for tracking analysis progress
CREATE INDEX IF NOT EXISTS idx_import_sessions_ean_analysis_at 
  ON import_sessions(ean_analysis_at);


