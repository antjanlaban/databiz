/**
 * Status Mapper
 * Maps technical statuses to user-friendly display statuses
 * Technical statuses are kept for internal logic, display_status is shown to users
 */

export type TechnicalStatus =
  | 'pending'
  | 'uploading'
  | 'parsing'
  | 'analyzing_ean'
  | 'waiting_column_selection'
  | 'processing'
  | 'approved'
  | 'converting'
  | 'ready_for_activation'
  | 'activating'
  | 'activated'
  | 'rejected'
  | 'failed';

export type DisplayStatus = 'processing' | 'action_required' | 'ready' | 'activating' | 'completed' | 'error';

/**
 * Maps technical status to user-friendly display status
 * @param technicalStatus The internal technical status
 * @returns User-friendly display status
 */
export function getDisplayStatus(technicalStatus: TechnicalStatus): DisplayStatus {
  // Bezig (processing)
  if (
    technicalStatus === 'pending' ||
    technicalStatus === 'uploading' ||
    technicalStatus === 'parsing' ||
    technicalStatus === 'analyzing_ean' ||
    technicalStatus === 'converting'
  ) {
    return 'processing';
  }

  // Actie vereist (action_required)
  if (technicalStatus === 'waiting_column_selection') {
    return 'action_required';
  }

  // Klaar (ready)
  if (technicalStatus === 'approved' || technicalStatus === 'ready_for_activation') {
    return 'ready';
  }

  // Activeren (activating)
  if (technicalStatus === 'activating') {
    return 'activating';
  }

  // Voltooid (completed)
  if (technicalStatus === 'activated') {
    return 'completed';
  }

  // Fout (error)
  if (technicalStatus === 'failed' || technicalStatus === 'rejected') {
    return 'error';
  }

  // Fallback (should not happen, but TypeScript requires it)
  return 'error';
}

/**
 * Gets user-friendly label for display status
 * @param displayStatus The display status
 * @returns User-friendly label in Dutch
 */
export function getDisplayStatusLabel(displayStatus: DisplayStatus): string {
  switch (displayStatus) {
    case 'processing':
      return 'Bezig met verwerken...';
    case 'action_required':
      return 'Actie vereist';
    case 'ready':
      return 'Klaar voor activatie';
    case 'activating':
      return 'Bezig met activeren...';
    case 'completed':
      return 'Voltooid';
    case 'error':
      return 'Fout';
    default:
      return 'Onbekend';
  }
}

/**
 * Gets user-friendly label for technical status (for tooltips/details)
 * @param technicalStatus The technical status
 * @returns User-friendly label in Dutch
 */
export function getTechnicalStatusLabel(technicalStatus: TechnicalStatus): string {
  switch (technicalStatus) {
    case 'pending':
      return 'In wachtrij';
    case 'uploading':
      return 'Uploaden';
    case 'parsing':
      return 'Bestand verwerken';
    case 'analyzing_ean':
      return 'EAN codes analyseren';
    case 'waiting_column_selection':
      return 'Kolom selectie vereist';
    case 'processing':
      return 'Verwerken';
    case 'approved':
      return 'Goedgekeurd';
    case 'converting':
      return 'JSON converteren';
    case 'ready_for_activation':
      return 'Klaar voor activatie';
    case 'activating':
      return 'Activeren';
    case 'activated':
      return 'Geactiveerd';
    case 'rejected':
      return 'Afgewezen';
    case 'failed':
      return 'Mislukt';
    default:
      return 'Onbekend';
  }
}

