-- Migration: Add activation statuses to import_sessions
-- Purpose: Support EAN variant activation workflow
-- Adds 'activating' and 'activated' status values

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
    'activating',  -- New: Dataset is being activated (EAN variants creation in progress)
    'activated',   -- New: Dataset activation completed (EAN variants created)
    'rejected', 
    'failed'
  ));

-- Step 2: Add indexes for new status values
CREATE INDEX IF NOT EXISTS idx_import_sessions_status_activating 
  ON import_sessions(status) 
  WHERE status = 'activating';

CREATE INDEX IF NOT EXISTS idx_import_sessions_status_activated 
  ON import_sessions(status) 
  WHERE status = 'activated';

-- Step 3: Add optional fields for activation tracking
ALTER TABLE import_sessions
  ADD COLUMN IF NOT EXISTS activated_variants_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS activated_duplicates_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN import_sessions.activated_variants_count IS 'Number of EAN variants created during activation';
COMMENT ON COLUMN import_sessions.activated_duplicates_count IS 'Number of duplicate EANs found during activation';
COMMENT ON COLUMN import_sessions.activated_at IS 'Timestamp when dataset activation was completed';

