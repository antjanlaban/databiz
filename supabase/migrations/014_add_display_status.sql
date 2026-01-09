-- Migration: Add display_status field to import_sessions
-- This field provides user-friendly status labels while keeping technical statuses for internal logic
-- Created: 2026-01-XX

-- Add display_status column (nullable, will be computed from status)
ALTER TABLE import_sessions
ADD COLUMN IF NOT EXISTS display_status TEXT;

-- Create function to map technical status to display status
CREATE OR REPLACE FUNCTION get_display_status(technical_status TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE
    -- Bezig (processing)
    WHEN technical_status IN ('pending', 'uploading', 'parsing', 'analyzing_ean', 'converting') THEN 'processing'
    
    -- Actie vereist (action_required)
    WHEN technical_status = 'waiting_column_selection' THEN 'action_required'
    
    -- Klaar (ready)
    WHEN technical_status IN ('approved', 'ready_for_activation') THEN 'ready'
    
    -- Activeren (activating)
    WHEN technical_status = 'activating' THEN 'activating'
    
    -- Voltooid (completed)
    WHEN technical_status = 'activated' THEN 'completed'
    
    -- Fout (error)
    WHEN technical_status IN ('failed', 'rejected') THEN 'error'
    
    -- Fallback to technical status if unknown
    ELSE technical_status
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing rows with display_status
UPDATE import_sessions
SET display_status = get_display_status(status)
WHERE display_status IS NULL;

-- Create trigger to automatically update display_status when status changes
CREATE OR REPLACE FUNCTION update_display_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.display_status = get_display_status(NEW.status);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_display_status ON import_sessions;

-- Create trigger
CREATE TRIGGER trigger_update_display_status
  BEFORE INSERT OR UPDATE OF status ON import_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_display_status();

-- Add comment
COMMENT ON COLUMN import_sessions.display_status IS 'User-friendly status label derived from technical status. Values: processing, action_required, ready, activating, completed, error';

