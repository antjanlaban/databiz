-- Migration: Add converting and ready_for_activation statuses to import_sessions
-- Purpose: Support JSON conversion workflow
-- Adds 'converting' and 'ready_for_activation' status values

-- Step 1: Update status CHECK constraint to include new status values
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
    'converting',           -- New: Dataset is being converted to JSON
    'ready_for_activation', -- New: Dataset JSON conversion completed, ready for activation
    'activating',           -- Dataset is being activated (EAN variants creation in progress)
    'activated',            -- Dataset activation completed (EAN variants created)
    'rejected', 
    'failed'
  ));

-- Step 2: Add indexes for new status values
CREATE INDEX IF NOT EXISTS idx_import_sessions_status_converting 
  ON import_sessions(status) 
  WHERE status = 'converting';

CREATE INDEX IF NOT EXISTS idx_import_sessions_status_ready_for_activation 
  ON import_sessions(status) 
  WHERE status = 'ready_for_activation';

-- Add comments
COMMENT ON COLUMN import_sessions.status IS 'Technical status: pending, uploading, parsing, analyzing_ean, waiting_column_selection, processing, approved, converting, ready_for_activation, activating, activated, rejected, failed';

