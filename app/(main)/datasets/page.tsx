'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NewDatasetDialog } from '@/components/datasets/NewDatasetDialog';
import { ActivateDialog } from '@/components/datasets/ActivateDialog';
import { JSONViewerDialog } from '@/components/datasets/JSONViewerDialog';
import { ProcessIndicator } from '@/components/datasets/ProcessIndicator';
import { SessionsList } from '@/components/import/SessionsList';
import { usePageTitle } from '@/components/layout/PageTitleContext';
import { supabase } from '@/lib/supabase';
import { ImportSession } from '@/lib/database.types';
import { getDisplayStatus } from '@/lib/statusMapper';
import EANColumnSelectionModal from '@/app/sessions/components/EANColumnSelectionModal';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function DatasetsPage() {
  const { setTitle } = usePageTitle();
  const [newDatasetDialogOpen, setNewDatasetDialogOpen] = useState(false);
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [selectedSessionForActivation, setSelectedSessionForActivation] = useState<ImportSession | null>(null);
  const [jsonViewerOpen, setJsonViewerOpen] = useState(false);
  const [selectedSessionForJSON, setSelectedSessionForJSON] = useState<ImportSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Sessions overview state
  const [allSessions, setAllSessions] = useState<ImportSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const sessionsRef = useRef<ImportSession[]>([]);
  
  // Modal state
  const [modalSession, setModalSession] = useState<ImportSession | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Set page title in header
  useEffect(() => {
    setTitle('Datasets');
    return () => setTitle(null);
  }, [setTitle]);

  // Fetch all sessions on mount
  useEffect(() => {
    fetchSessions();
  }, []);

  // Update ref when sessions change
  useEffect(() => {
    sessionsRef.current = allSessions;
  }, [allSessions]);

  // Auto-refresh sessions and trigger JSON conversion for approved sessions
  useEffect(() => {
    if (!autoRefresh) return;

    const checkAndRefresh = async () => {
      const hasQueuedFiles = sessionsRef.current.some(
        (s) => s.status === 'uploading' || s.status === 'parsing' || s.status === 'analyzing_ean'
      );
      
      const hasPendingColumnSelection = sessionsRef.current.some(
        (s) => s.status === 'waiting_column_selection'
      );

      const hasApprovedSessions = sessionsRef.current.some(
        (s) => s.status === 'approved' || s.status === 'converting'
      );

      // Trigger JSON conversion for approved sessions (fire-and-forget)
      if (hasApprovedSessions) {
        try {
          fetch('/api/process-queue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          }).catch((err) => {
            console.error('[DatasetsPage] Failed to trigger JSON conversion:', err);
          });
        } catch (error) {
          console.error('[DatasetsPage] Error triggering JSON conversion:', error);
        }
      }

      if (!hasQueuedFiles && !hasPendingColumnSelection && !hasApprovedSessions) return;

      fetchSessions();
    };

    checkAndRefresh();
    const interval = setInterval(checkAndRefresh, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Close modal if the current session is no longer in action_required status
  useEffect(() => {
    if (!modalOpen || !modalSession) return;

    const currentSession = allSessions.find((s) => s.id === modalSession.id);
    
    if (currentSession) {
      const displayStatus = currentSession.display_status || getDisplayStatus(currentSession.status);
      if (displayStatus !== 'action_required') {
        setModalOpen(false);
        setModalSession(null);
      }
    }
  }, [allSessions, modalOpen, modalSession]);

  const fetchSessions = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('import_sessions')
        .select('*') // Includes display_status (automatically computed by database trigger)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      setAllSessions(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kan sessies niet ophalen');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = async (session: ImportSession) => {
    await fetchSessions();
  };

  const handleActivate = (session: ImportSession) => {
    setSelectedSessionForActivation(session);
    setActivateDialogOpen(true);
  };

  const handleViewJSON = (session: ImportSession) => {
    setSelectedSessionForJSON(session);
    setJsonViewerOpen(true);
  };

  const handleActivateStart = () => {
    // Activation started - will be tracked by ProcessIndicator
    fetchSessions();
  };

  const handleSelectEANColumn = async (columnName: string) => {
    const targetSession = modalSession;
    if (!targetSession?.id) return;

    try {
      const response = await fetch('/api/select-ean-column', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: targetSession.id,
          columnName: columnName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Fout bij selecteren EAN kolom');
      }

      setModalOpen(false);
      setModalSession(null);
      
      await fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fout bij selecteren EAN kolom');
    }
  };

  const handleDelete = async (sessionId: number, fileName: string) => {
    const confirmed = window.confirm(
      `Weet je zeker dat je de dataset "${fileName}" wilt verwijderen?\n\nDit zal permanent verwijderen:\n- De dataset record\n- Het geüploade bestand uit opslag\n- Alle gerelateerde conflicten\n\nDeze actie kan niet ongedaan worden gemaakt.`
    );

    if (!confirmed) return;

    setDeleting(sessionId);
    setError(null);

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Fout bij verwijderen dataset');
      }

      if (data.storageDeleted === false && data.storageError) {
        setError(
          `Dataset verwijderd uit database, maar bestandsverwijdering uit opslag mislukt: ${data.storageError}. ` +
          `Je moet mogelijk handmatig het bestand uit de storage bucket verwijderen.`
        );
      }

      await fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fout bij verwijderen dataset');
    } finally {
      setDeleting(null);
    }
  };


  const handleOpenModal = (session: ImportSession) => {
    setModalSession(session);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setModalSession(null);
  };

  const pendingColumnSelectionSessions = allSessions.filter((s) => s.status === 'waiting_column_selection');

  return (
    <div className="space-y-4 pb-20">
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive whitespace-pre-line">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <Button
          onClick={() => setNewDatasetDialogOpen(true)}
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nieuwe Dataset
        </Button>
      </div>

      {/* Pending Column Selection */}
      {pendingColumnSelectionSessions.length > 0 && (
        <Card className="border-amber-500">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-amber-400">⚠️</span>
                <span className="text-sm font-medium">
                  {pendingColumnSelectionSessions.length} dataset{pendingColumnSelectionSessions.length !== 1 ? 's' : ''} wachten op kolom selectie
                </span>
              </div>
              <div className="flex gap-2">
                {pendingColumnSelectionSessions.slice(0, 3).map((session) => (
                  <Button
                    key={session.id}
                    onClick={() => handleOpenModal(session)}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                  >
                    {session.file_name}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Sessions */}
      <SessionsList
        sessions={allSessions}
        onDelete={handleDelete}
        onSelectColumn={handleOpenModal}
        onActivate={handleActivate}
        onViewJSON={handleViewJSON}
        deleting={deleting}
        loading={loading}
      />

      {/* Process Indicator */}
      <ProcessIndicator sessions={allSessions} onRefresh={fetchSessions} />

      {/* Activate Dialog */}
      {selectedSessionForActivation && (
        <ActivateDialog
          session={selectedSessionForActivation}
          open={activateDialogOpen}
          onOpenChange={setActivateDialogOpen}
          onActivateStart={handleActivateStart}
        />
      )}

      {/* New Dataset Dialog */}
      <NewDatasetDialog
        open={newDatasetDialogOpen}
        onOpenChange={setNewDatasetDialogOpen}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* EAN Column Selection Modal */}
      {modalSession && (
        <EANColumnSelectionModal
          session={modalSession}
          isOpen={modalOpen}
          onClose={handleCloseModal}
          onSelect={handleSelectEANColumn}
        />
      )}

      {/* JSON Viewer Dialog */}
      {selectedSessionForJSON && (
        <JSONViewerDialog
          session={selectedSessionForJSON}
          open={jsonViewerOpen}
          onOpenChange={setJsonViewerOpen}
        />
      )}
    </div>
  );
}

