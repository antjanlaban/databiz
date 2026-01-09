-- Migration: Increase ean_analysis_status column length
-- The status 'pending_column_selection' is 25 characters, but the column was defined as VARCHAR(20)
-- This migration increases the column length to VARCHAR(50) to accommodate all possible status values

-- Increase the length of ean_analysis_status column
ALTER TABLE import_sessions
  ALTER COLUMN ean_analysis_status TYPE VARCHAR(50);


