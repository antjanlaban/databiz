-- Migration: Add file storage fields to import_sessions
-- Adds support for file hash, storage path, file type, and related metadata

-- Rename filename to file_name for consistency with requirements
-- Only rename if filename column exists and file_name doesn't exist yet
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'import_sessions' 
    AND column_name = 'filename'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'import_sessions' 
    AND column_name = 'file_name'
  ) THEN
    ALTER TABLE import_sessions RENAME COLUMN filename TO file_name;
  END IF;
END $$;

-- Add new columns for file storage
ALTER TABLE import_sessions
  ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS file_size_bytes INTEGER,
  ADD COLUMN IF NOT EXISTS file_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS file_type VARCHAR(10),
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Update status CHECK constraint to include 'received'
ALTER TABLE import_sessions
  DROP CONSTRAINT IF EXISTS import_sessions_status_check;

ALTER TABLE import_sessions
  ADD CONSTRAINT import_sessions_status_check 
  CHECK (status IN ('pending', 'received', 'processing', 'completed', 'failed'));

-- Add unique index on file_hash for duplicate detection
CREATE UNIQUE INDEX IF NOT EXISTS idx_import_sessions_file_hash 
  ON import_sessions(file_hash) 
  WHERE file_hash IS NOT NULL;

-- Add index on file_storage_path for querying
CREATE INDEX IF NOT EXISTS idx_import_sessions_file_storage_path 
  ON import_sessions(file_storage_path);

