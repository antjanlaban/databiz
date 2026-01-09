'use client';

import { Badge } from '@/components/ui/badge';
import { ImportSession } from '@/lib/database.types';
import { getDisplayStatus, getDisplayStatusLabel, type DisplayStatus } from '@/lib/statusMapper';

interface ProcessingStatusProps {
  session: ImportSession;
}

export function ProcessingStatus({ session }: ProcessingStatusProps) {
  // Use display_status if available, otherwise compute it from technical status
  const displayStatus: DisplayStatus = session.display_status || getDisplayStatus(session.status);
  const label = getDisplayStatusLabel(displayStatus);

  // Determine if this is a processing status (for subtle opacity hint)
  const isProcessing = displayStatus === 'processing' || displayStatus === 'activating';

  const getStatusBadge = (status: DisplayStatus) => {
    switch (status) {
      case 'processing':
        return <Badge variant="info">{label}</Badge>;
      case 'action_required':
        return <Badge variant="warning">{label}</Badge>;
      case 'ready':
        return <Badge variant="success">{label}</Badge>;
      case 'activating':
        return <Badge variant="info">{label}</Badge>;
      case 'completed':
        return <Badge variant="success">{label}</Badge>;
      case 'error':
        // Show more specific error message if available
        const errorLabel = session.status === 'rejected' ? 'Afgewezen' : 'Fout';
        return <Badge variant="error">{errorLabel}</Badge>;
      default:
        return <Badge variant="outline">{label}</Badge>;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={isProcessing ? 'opacity-70 transition-opacity duration-2000' : ''}
        title={session.status !== displayStatus ? `Technische status: ${session.status}` : undefined}
      >
        {getStatusBadge(displayStatus)}
      </div>
    </div>
  );
}

