-- Migration: Add parsing fields to import_sessions
-- Adds support for file metadata extraction: row count, column count, and parsing timestamp

-- Add new columns for parsing metadata
ALTER TABLE import_sessions
  ADD COLUMN IF NOT EXISTS total_rows_in_file INTEGER,
  ADD COLUMN IF NOT EXISTS columns_count INTEGER,
  ADD COLUMN IF NOT EXISTS parsed_at TIMESTAMPTZ;

-- Migrate data from total_rows to total_rows_in_file if total_rows exists
-- This handles the case where total_rows exists from initial schema
DO $$
BEGIN
  -- Check if total_rows column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'import_sessions' 
    AND column_name = 'total_rows'
  ) THEN
    -- Copy data from total_rows to total_rows_in_file where new column is NULL
    UPDATE import_sessions
    SET total_rows_in_file = total_rows
    WHERE total_rows_in_file IS NULL AND total_rows IS NOT NULL AND total_rows > 0;
    
    -- Note: We keep total_rows column for now to avoid breaking existing code
    -- It can be dropped in a later migration after ensuring all code uses total_rows_in_file
  END IF;
END $$;

-- Update status CHECK constraint to include 'parsing' and 'ready_for_processing'
ALTER TABLE import_sessions
  DROP CONSTRAINT IF EXISTS import_sessions_status_check;

ALTER TABLE import_sessions
  ADD CONSTRAINT import_sessions_status_check 
  CHECK (status IN ('pending', 'received', 'parsing', 'ready_for_processing', 'processing', 'completed', 'failed'));

-- Add index on status for efficient queue queries
CREATE INDEX IF NOT EXISTS idx_import_sessions_status_received 
  ON import_sessions(status) 
  WHERE status = 'received';

-- Add index on parsed_at for tracking parsing progress
CREATE INDEX IF NOT EXISTS idx_import_sessions_parsed_at 
  ON import_sessions(parsed_at);

