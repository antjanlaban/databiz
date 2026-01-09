-- Migration: Unify import status - Remove ean_analysis_status and merge into single status field
-- This migration unifies the two-status system (status + ean_analysis_status) into one linear status model

-- Step 1: Migrate existing data to new status values
-- First, update sessions based on their current status and ean_analysis_status combination
DO $$
BEGIN
  -- Migrate ready_for_processing sessions based on ean_analysis_status
  UPDATE import_sessions
  SET status = CASE
    WHEN status = 'ready_for_processing' AND ean_analysis_status IS NULL THEN 'analyzing_ean'
    WHEN status = 'ready_for_processing' AND ean_analysis_status = 'analyzing' THEN 'analyzing_ean'
    WHEN status = 'ready_for_processing' AND ean_analysis_status = 'completed' THEN 'processing'
    WHEN status = 'ready_for_processing' AND ean_analysis_status = 'pending_column_selection' THEN 'waiting_column_selection'
    WHEN status = 'ready_for_processing' AND ean_analysis_status = 'no_ean_column' THEN 'rejected'
    WHEN status = 'ready_for_processing' AND ean_analysis_status = 'failed' THEN 'failed'
    ELSE status
  END,
  error_message = CASE
    WHEN status = 'ready_for_processing' AND ean_analysis_status = 'no_ean_column' 
      AND (error_message IS NULL OR error_message = '') 
    THEN 'No EAN/GTIN-13 column found in file. File cannot proceed without EAN codes.'
    ELSE error_message
  END
  WHERE status = 'ready_for_processing';

  -- Migrate received status to parsing (will be processed by queue)
  UPDATE import_sessions
  SET status = 'parsing'
  WHERE status = 'received';

  -- Migrate completed status to approved (if it was successful)
  UPDATE import_sessions
  SET status = 'approved'
  WHERE status = 'completed';

  -- Keep processing status as is
  -- Keep failed status as is
  -- Keep pending status as is
END $$;

-- Step 2: Drop old indexes on ean_analysis_status
DROP INDEX IF EXISTS idx_import_sessions_ean_analysis_status;
DROP INDEX IF EXISTS idx_import_sessions_ready_for_ean_analysis;
DROP INDEX IF EXISTS idx_import_sessions_ean_analysis_at;

-- Step 3: Remove ean_analysis_status column
ALTER TABLE import_sessions
  DROP COLUMN IF EXISTS ean_analysis_status;

-- Step 4: Update status CHECK constraint with new unified status values
ALTER TABLE import_sessions
  DROP CONSTRAINT IF EXISTS import_sessions_status_check;

ALTER TABLE import_sessions
  ADD CONSTRAINT import_sessions_status_check 
  CHECK (status IN (
    'pending', 
    'uploading', 
    'parsing', 
    'analyzing_ean', 
    'waiting_column_selection', 
    'processing', 
    'approved', 
    'rejected', 
    'failed'
  ));

-- Step 5: Add new indexes for queue queries
-- Index for finding files ready for parsing
CREATE INDEX IF NOT EXISTS idx_import_sessions_status_parsing 
  ON import_sessions(status) 
  WHERE status = 'parsing';

-- Index for finding files ready for EAN analysis
CREATE INDEX IF NOT EXISTS idx_import_sessions_status_analyzing_ean 
  ON import_sessions(status) 
  WHERE status = 'analyzing_ean';

-- Index for finding files waiting for column selection
CREATE INDEX IF NOT EXISTS idx_import_sessions_status_waiting_column 
  ON import_sessions(status) 
  WHERE status = 'waiting_column_selection';

-- Index for processing status
CREATE INDEX IF NOT EXISTS idx_import_sessions_status_processing 
  ON import_sessions(status) 
  WHERE status = 'processing';

-- Index for approved status
CREATE INDEX IF NOT EXISTS idx_import_sessions_status_approved 
  ON import_sessions(status) 
  WHERE status = 'approved';

-- Index for rejected status
CREATE INDEX IF NOT EXISTS idx_import_sessions_status_rejected 
  ON import_sessions(status) 
  WHERE status = 'rejected';

-- Index for failed status
CREATE INDEX IF NOT EXISTS idx_import_sessions_status_failed 
  ON import_sessions(status) 
  WHERE status = 'failed';

-- Note: ean_analysis_at column is kept for historical tracking
-- unique_ean_count, duplicate_ean_count, detected_ean_column are also kept


