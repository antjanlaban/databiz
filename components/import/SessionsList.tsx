'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableRow, DataTableCell } from '@/components/ui/DataTable';
import { ProcessingStatus } from './ProcessingStatus';
import { ImportSession } from '@/lib/database.types';
import { Trash2, FileText } from 'lucide-react';
import { getDisplayStatus, type DisplayStatus } from '@/lib/statusMapper';
import { cn } from '@/lib/utils';

interface SessionsListProps {
  sessions: ImportSession[];
  onDelete: (sessionId: number, fileName: string) => void;
  onSelectColumn?: (session: ImportSession) => void;
  onActivate?: (session: ImportSession) => void;
  onViewJSON?: (session: ImportSession) => void;
  deleting?: number | null;
  loading?: boolean;
}

export function SessionsList({
  sessions,
  onDelete,
  onSelectColumn,
  onActivate,
  onViewJSON,
  deleting,
  loading,
}: SessionsListProps) {
  // Track which sessions have JSON data
  const [jsonExistsMap, setJsonExistsMap] = useState<Record<number, boolean>>({});
  const lastCheckedRef = useRef<string>('');
  const jsonExistsMapRef = useRef<Record<number, boolean>>({});

  // Keep ref in sync with state
  useEffect(() => {
    jsonExistsMapRef.current = jsonExistsMap;
  }, [jsonExistsMap]);

      // Create a stable key based on session IDs and display statuses to prevent unnecessary re-checks
      const sessionsKey = useMemo(() => {
        return sessions
          .filter(s => {
            const displayStatus: DisplayStatus = s.display_status || getDisplayStatus(s.status);
            return displayStatus === 'ready' || 
                   displayStatus === 'activating' || 
                   displayStatus === 'completed' ||
                   displayStatus === 'processing';
          })
          .map(s => {
            const displayStatus: DisplayStatus = s.display_status || getDisplayStatus(s.status);
            return `${s.id}-${displayStatus}`;
          })
          .sort()
          .join(',');
      }, [sessions]);

  // Check JSON existence for approved sessions
  useEffect(() => {
    // Skip if we already checked this exact state
    if (sessionsKey === lastCheckedRef.current) {
      return;
    }

    const checkJSONExists = async () => {
      // Check sessions that might have JSON (using display_status)
      const approvedSessions = sessions.filter((s) => {
        const displayStatus: DisplayStatus = s.display_status || getDisplayStatus(s.status);
        return displayStatus === 'ready' || 
               displayStatus === 'activating' || 
               displayStatus === 'completed' ||
               displayStatus === 'processing';
      });

      // Only check sessions we haven't checked yet or that are in processing status
      const sessionsToCheck = approvedSessions.filter((session) => {
        if (!session.id) return false;
        // Use ref to get current value without causing re-renders
        const existingValue = jsonExistsMapRef.current[session.id];
        const displayStatus: DisplayStatus = session.display_status || getDisplayStatus(session.status);
        return existingValue === undefined || 
               displayStatus === 'processing' || 
               (displayStatus === 'ready' && existingValue === false);
      });

      if (sessionsToCheck.length === 0) {
        lastCheckedRef.current = sessionsKey;
        return;
      }

      const checks = sessionsToCheck.map(async (session) => {
        if (!session.id) return;
        
        try {
          const response = await fetch(`/api/sessions/${session.id}/json/exists`);
          const data = await response.json();
          return { id: session.id, exists: data.success && data.exists };
        } catch {
          return { id: session.id, exists: false };
        }
      });

      const results = await Promise.all(checks);
      setJsonExistsMap((prev) => {
        const newMap = { ...prev };
        results.forEach((result) => {
          if (result) {
            newMap[result.id] = result.exists;
          }
        });
        return newMap;
      });
      
      lastCheckedRef.current = sessionsKey;
    };

    if (sessions.length > 0) {
      checkJSONExists();
    }
  }, [sessionsKey, sessions]);

  if (loading && sessions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground py-8">Laden...</p>
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground py-8">
            Geen datasets gevonden
          </p>
          <p className="text-center text-xs text-muted-foreground">
            Upload een bestand om te beginnen
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Alle Datasets</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <DataTable
          headers={['Bestand', 'Status', 'JSON', 'Rijen', 'Kol', 'EAN', 'Dub', 'Datum', 'Acties']}
          stickyFirstColumn={true}
        >
          {sessions.map((session) => {
            const displayStatus: DisplayStatus = session.display_status || getDisplayStatus(session.status);
            const needsColumnSelection = displayStatus === 'action_required';
            const hasError = displayStatus === 'error' && session.error_message;
            const isActive = displayStatus === 'processing' || displayStatus === 'action_required';
            
            return (
              <DataTableRow 
                key={session.id} 
                stickyFirstColumn={true}
                className={cn(
                  isActive && 'bg-sky-500/5 animate-fade-subtle motion-safe:animate-fade-subtle motion-reduce:animate-none',
                  needsColumnSelection && !isActive && 'bg-amber-500/5' // Alleen amber als niet active (anders override)
                )}
              >
                <DataTableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[200px]">{session.file_name}</span>
                    {hasError && (
                      <span className="text-destructive" title={session.error_message}>⚠️</span>
                    )}
                    {needsColumnSelection && (
                      <span className="text-amber-400" title="Selecteer EAN kolom">⚠️</span>
                    )}
                  </div>
                </DataTableCell>
                <DataTableCell>
                  <ProcessingStatus session={session} />
                </DataTableCell>
                <DataTableCell>
                  {/* JSON Status Column - Altijd button tonen voor ready/activating/completed, disabled als JSON niet beschikbaar */}
                  {(() => {
                    const displayStatus: DisplayStatus = session.display_status || getDisplayStatus(session.status);
                    const hasJSON = jsonExistsMap[session.id!];
                    
                    // Always show button for ready, activating, or completed status
                    if (displayStatus === 'ready' || displayStatus === 'activating' || displayStatus === 'completed') {
                      return onViewJSON ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewJSON(session)}
                          disabled={hasJSON !== true}
                          className="h-6 w-6 p-0"
                          title={hasJSON === true ? "Bekijk JSON" : "JSON nog niet beschikbaar"}
                        >
                          <FileText className={`h-4 w-4 ${hasJSON === true ? 'text-green-500' : 'text-muted-foreground opacity-50'}`} />
                        </Button>
                      ) : null;
                    }
                    
                    // For processing status, show subtle hint
                    if (displayStatus === 'processing') {
                      return (
                        <span 
                          className="text-muted-foreground text-xs opacity-70 transition-opacity duration-2000" 
                          title="JSON conversie in behandeling..."
                        >
                          ●
                        </span>
                      );
                    }
                    
                    // For other statuses, show minimal indicator
                    return (
                      <span className="text-muted-foreground text-xs opacity-30" title="Niet van toepassing">
                        ●
                      </span>
                    );
                  })()}
                </DataTableCell>
                <DataTableCell>
                  {session.total_rows_in_file ?? session.total_rows ?? 0}
                </DataTableCell>
                <DataTableCell>
                  {session.columns_count ?? '-'}
                </DataTableCell>
                <DataTableCell>
                  {session.unique_ean_count ?? '-'}
                </DataTableCell>
                <DataTableCell>
                  {session.duplicate_ean_count ?? 0}
                </DataTableCell>
                <DataTableCell className="text-muted-foreground">
                  {session.created_at
                    ? new Date(session.created_at).toLocaleDateString('nl-NL', { 
                        day: '2-digit', 
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : '-'}
                </DataTableCell>
                <DataTableCell>
                  <div className="flex items-center gap-2">
                    {displayStatus === 'ready' && onActivate && (
                      <Button
                        onClick={() => onActivate(session)}
                        size="sm"
                        className="h-7 text-xs"
                      >
                        Activeren
                      </Button>
                    )}
                    {/* JSON viewer button removed - now shown in JSON column */}
                    {needsColumnSelection && onSelectColumn && (
                      <Button
                        onClick={() => onSelectColumn(session)}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                      >
                        Selecteer
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDelete(session.id!, session.file_name)}
                      disabled={deleting === session.id}
                      className="h-7 w-7 p-0"
                      title="Verwijderen"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </DataTableCell>
              </DataTableRow>
            );
          })}
        </DataTable>
      </CardContent>
    </Card>
  );
}
