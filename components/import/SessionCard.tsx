'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProcessingStatus } from './ProcessingStatus';
import { ImportSession } from '@/lib/database.types';
import { Trash2 } from 'lucide-react';

interface SessionCardProps {
  session: ImportSession;
  onDelete: (sessionId: number, fileName: string) => void;
  onSelectColumn?: (session: ImportSession) => void;
  deleting?: number | null;
}

export function SessionCard({
  session,
  onDelete,
  onSelectColumn,
  deleting,
}: SessionCardProps) {
  const needsColumnSelection = session.status === 'waiting_column_selection';
  const hasError = (session.status === 'failed' || session.status === 'rejected') && session.error_message;

  return (
    <Card className={needsColumnSelection ? 'border-amber-500' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-base font-semibold">
              {session.file_name}
            </CardTitle>
            <CardDescription>
              {session.created_at
                ? new Date(session.created_at).toLocaleString('nl-NL')
                : 'Onbekende datum'}
            </CardDescription>
          </div>
          <ProcessingStatus session={session} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Rijen</p>
            <p className="text-sm font-semibold">
              {session.total_rows_in_file ?? session.total_rows ?? 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Kolommen</p>
            <p className="text-sm font-semibold">
              {session.columns_count ?? '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Unieke EAN's</p>
            <p className="text-sm font-semibold">
              {session.unique_ean_count ?? '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Dubbele EAN's</p>
            <p className="text-sm font-semibold">
              {session.duplicate_ean_count ?? 0}
            </p>
          </div>
        </div>

        {hasError && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg mb-4">
            {session.error_message}
          </div>
        )}

        {needsColumnSelection && onSelectColumn && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm p-3 rounded-lg mb-4">
            <p className="font-semibold mb-2">Actie vereist: Selecteer EAN kolom</p>
            <Button
              onClick={() => onSelectColumn(session)}
              variant="outline"
              size="sm"
            >
              Selecteer Kolom
            </Button>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(session.id!, session.file_name)}
            disabled={deleting === session.id}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {deleting === session.id ? 'Verwijderen...' : 'Verwijderen'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

