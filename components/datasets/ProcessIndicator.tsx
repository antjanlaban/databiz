'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { ImportSession } from '@/lib/database.types';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProcessIndicatorProps {
  sessions: ImportSession[];
  onRefresh: () => void;
}

interface ActiveProcess {
  id: number;
  name: string;
  status: string;
  fileName: string;
  type: 'import' | 'activation';
}

export function ProcessIndicator({ sessions, onRefresh }: ProcessIndicatorProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeProcesses, setActiveProcesses] = useState<ActiveProcess[]>([]);

  useEffect(() => {
    // Detect active processes from sessions
    const processes: ActiveProcess[] = [];

    sessions.forEach((session) => {
      if (['parsing', 'analyzing_ean', 'activating'].includes(session.status)) {
        let processName = '';
        let type: 'import' | 'activation' = 'import';

        switch (session.status) {
          case 'parsing':
            processName = 'Bestand verwerken';
            break;
          case 'analyzing_ean':
            processName = 'EAN analyse';
            break;
          case 'activating':
            processName = 'Dataset activeren';
            type = 'activation';
            break;
        }

        processes.push({
          id: session.id!,
          name: processName,
          status: session.status,
          fileName: session.file_name,
          type,
        });
      }
    });

    setActiveProcesses(processes);
  }, [sessions]);

  // Auto-refresh when there are active processes
  useEffect(() => {
    if (activeProcesses.length === 0) return;

    const interval = setInterval(() => {
      onRefresh();
    }, 3000);

    return () => clearInterval(interval);
  }, [activeProcesses.length, onRefresh]);

  if (activeProcesses.length === 0) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'parsing':
        return <Badge variant="info">Verwerken</Badge>;
      case 'analyzing_ean':
        return <Badge variant="warning">EAN Analyse</Badge>;
      case 'activating':
        return <Badge variant="info">Activeren</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="fixed bottom-0 left-64 right-0 z-50 border-t border-border bg-card shadow-lg">
      <Card className="border-0 rounded-none">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                🔄 {activeProcesses.length} actief proces{activeProcesses.length !== 1 ? 'sen' : ''}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="h-6 px-2"
              >
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {expanded && (
            <div className="mt-3 space-y-2 pt-3 border-t border-border">
              {activeProcesses.map((process) => (
                <div
                  key={process.id}
                  className="flex items-center justify-between p-2 bg-muted rounded"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusBadge(process.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{process.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{process.fileName}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

