'use client';

import { useState, useEffect, useRef } from 'react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Table from '@/components/Table';
import { supabase } from '@/lib/supabase';
import { ImportSession } from '@/lib/database.types';
import EANColumnSelectionModal from '@/app/sessions/components/EANColumnSelectionModal';

export const dynamic = 'force-dynamic';

type ImportStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

export default function UploadPage() {
  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<ImportStatus>('idle');
  const [currentSession, setCurrentSession] = useState<ImportSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Sessions overview state
  const [allSessions, setAllSessions] = useState<ImportSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [processingQueue, setProcessingQueue] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const sessionsRef = useRef<ImportSession[]>([]);
  const eanPollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Modal state
  const [modalSession, setModalSession] = useState<ImportSession | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const hasOpenedModalRef = useRef(false);
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch all sessions on mount
  useEffect(() => {
    fetchSessions();
  }, []);

  // Update ref when sessions change
  useEffect(() => {
    sessionsRef.current = allSessions;
  }, [allSessions]);

  // Auto-refresh sessions
  useEffect(() => {
    if (!autoRefresh) return;

    const checkAndRefresh = () => {
      const hasQueuedFiles = sessionsRef.current.some(
        (s) => s.status === 'uploading' || s.status === 'parsing' || s.status === 'analyzing_ean'
      );
      
      const hasPendingColumnSelection = sessionsRef.current.some(
        (s) => s.status === 'waiting_column_selection'
      );

      if (!hasQueuedFiles && !hasPendingColumnSelection) return;

      fetchSessions();
    };

    checkAndRefresh();
    const interval = setInterval(checkAndRefresh, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Auto-open modal when there are sessions needing column selection
  useEffect(() => {
    if (loading || hasOpenedModalRef.current) return;

    const pendingSessions = allSessions.filter(
      (s) => s.status === 'waiting_column_selection'
    );

    if (pendingSessions.length > 0 && !modalOpen) {
      setModalSession(pendingSessions[0]);
      setModalOpen(true);
      hasOpenedModalRef.current = true;
    }
  }, [allSessions, loading, modalOpen]);

  // Close modal if the current session is no longer in waiting_column_selection status
  useEffect(() => {
    if (!modalOpen || !modalSession) return;

    const currentSession = allSessions.find((s) => s.id === modalSession.id);
    
    if (currentSession && currentSession.status !== 'waiting_column_selection') {
      setModalOpen(false);
      setModalSession(null);
      hasOpenedModalRef.current = false;
    }
  }, [allSessions, modalOpen, modalSession]);

  // Poll for current session updates
  useEffect(() => {
    if (!currentSession?.id) return;

    const pollSession = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('import_sessions')
          .select('*')
          .eq('id', currentSession.id)
          .single();

        if (fetchError) {
          console.error('[Upload] Error polling session:', fetchError);
          return;
        }

        if (data) {
          setCurrentSession(data);

          // Check if we need to open column selection modal
          if (data.status === 'waiting_column_selection' && !modalOpen) {
            setModalSession(data);
            setModalOpen(true);
          }

          // Stop polling if in final states
          if (['approved', 'rejected', 'failed'].includes(data.status)) {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            setUploadStatus('completed');
            // Refresh all sessions
            fetchSessions();
          }
        }
      } catch (err) {
        console.error('[Upload] Polling error:', err);
      }
    };

    pollIntervalRef.current = setInterval(pollSession, 2000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [currentSession?.id, modalOpen]);

  const fetchSessions = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('import_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      setAllSessions(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setCurrentSession(null);
      setUploadStatus('idle');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploadStatus('uploading');
    setError(null);
    setCurrentSession(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMessage = data.message || 'An error occurred during upload';
        
        if (data.error === 'DUPLICATE_FILE' && data.uploadedAt) {
          const uploadDate = new Date(data.uploadedAt).toLocaleString();
          errorMessage = `${errorMessage}\nThis file was previously uploaded on ${uploadDate}`;
        }

        setError(errorMessage);
        setUploadStatus('error');
        return;
      }

      // Fetch the created session
      const { data: sessionData, error: sessionError } = await supabase
        .from('import_sessions')
        .select('*')
        .eq('id', data.sessionId)
        .single();

      if (sessionError || !sessionData) {
        setError('File uploaded but failed to fetch session details');
        setUploadStatus('error');
        return;
      }

      setCurrentSession(sessionData);
      setUploadStatus('processing');
      // Refresh all sessions
      await fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred during upload');
      setUploadStatus('error');
    }
  };

  const handleSelectEANColumn = async (columnName: string) => {
    const targetSession = modalSession || currentSession;
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
        throw new Error(data.message || 'Failed to select EAN column');
      }

      setModalOpen(false);
      setModalSession(null);
      hasOpenedModalRef.current = false;
      
      // Refresh sessions
      await fetchSessions();
      
      // If this was the current session, update it
      if (currentSession?.id === targetSession.id) {
        const { data: updatedSession } = await supabase
          .from('import_sessions')
          .select('*')
          .eq('id', targetSession.id)
          .single();
        if (updatedSession) {
          setCurrentSession(updatedSession);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select EAN column');
    }
  };

  const handleDelete = async (sessionId: number, fileName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the session "${fileName}"?\n\nThis will permanently delete:\n- The session record\n- The uploaded file from storage\n- All related conflicts\n\nThis action cannot be undone.`
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
        throw new Error(data.message || 'Failed to delete session');
      }

      if (data.storageDeleted === false && data.storageError) {
        setError(
          `Session deleted from database, but file removal from storage failed: ${data.storageError}. ` +
          `You may need to manually remove the file from the storage bucket.`
        );
      }

      await fetchSessions();
      
      // If deleted session was current session, clear it
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setUploadStatus('idle');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
    } finally {
      setDeleting(null);
    }
  };

  const handleProcessQueue = async () => {
    setProcessingQueue(true);
    setError(null);

    try {
      const response = await fetch('/api/process-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to process queue');
      }

      await fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process queue');
    } finally {
      setProcessingQueue(false);
    }
  };

  const handleProcessEANAnalysis = async () => {
    if (eanPollIntervalRef.current) {
      clearInterval(eanPollIntervalRef.current);
      eanPollIntervalRef.current = null;
    }

    setProcessingQueue(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze-ean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to process EAN analysis');
      }

      await fetchSessions();

      if (data.processed > 0) {
        let pollCount = 0;
        const maxPolls = 40;
        
        eanPollIntervalRef.current = setInterval(async () => {
          pollCount++;
          await fetchSessions();
          
          const stillAnalyzing = sessionsRef.current.some(
            (s) => s.status === 'analyzing_ean'
          );
          
          if (!stillAnalyzing || pollCount >= maxPolls) {
            if (eanPollIntervalRef.current) {
              clearInterval(eanPollIntervalRef.current);
              eanPollIntervalRef.current = null;
            }
            setProcessingQueue(false);
          }
        }, 3000);
      } else {
        setProcessingQueue(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process EAN analysis');
      setProcessingQueue(false);
    }
  };

  const handleRetryEANAnalysis = async (sessionId: number) => {
    try {
      const { error } = await supabase
        .from('import_sessions')
        .update({ status: 'analyzing_ean' })
        .eq('id', sessionId);

      if (error) throw error;

      await fetchSessions();
      
      const response = await fetch('/api/analyze-ean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to retry EAN analysis');
      }

      setTimeout(() => fetchSessions(), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry EAN analysis');
    }
  };

  const handleOpenModal = (session: ImportSession) => {
    setModalSession(session);
    setModalOpen(true);
    hasOpenedModalRef.current = true;
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setModalSession(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600';
      case 'processing': return 'text-blue-600';
      case 'analyzing_ean': return 'text-amber-600';
      case 'waiting_column_selection': return 'text-yellow-600';
      case 'parsing': return 'text-amber-500';
      case 'uploading': return 'text-purple-600';
      case 'pending': return 'text-gray-500';
      case 'rejected': return 'text-red-500';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'waiting_column_selection': return 'SELECT COLUMN';
      case 'analyzing_ean': return 'ANALYZING EAN';
      case 'uploading': return 'UPLOADING';
      case 'parsing': return 'PARSING';
      case 'processing': return 'PROCESSING';
      case 'approved': return 'APPROVED';
      case 'rejected': return 'REJECTED';
      default: return status.toUpperCase();
    }
  };

  const getProgressSteps = () => {
    if (!currentSession) return [];
    
    const steps = [
      { key: 'uploading', label: 'Upload', status: currentSession.status === 'uploading' ? 'active' : ['uploading', 'parsing', 'analyzing_ean', 'waiting_column_selection', 'processing', 'approved', 'rejected', 'failed'].includes(currentSession.status) ? 'completed' : 'pending' },
      { key: 'parsing', label: 'Parsing', status: currentSession.status === 'parsing' ? 'active' : ['parsing', 'analyzing_ean', 'waiting_column_selection', 'processing', 'approved', 'rejected', 'failed'].includes(currentSession.status) ? 'completed' : 'pending' },
      { key: 'analyzing_ean', label: 'EAN Analysis', status: currentSession.status === 'analyzing_ean' ? 'active' : ['analyzing_ean', 'waiting_column_selection', 'processing', 'approved', 'rejected', 'failed'].includes(currentSession.status) ? 'completed' : 'pending' },
      { key: 'processing', label: 'Processing', status: currentSession.status === 'processing' ? 'active' : ['processing', 'approved', 'rejected'].includes(currentSession.status) ? 'completed' : 'pending' },
      { key: 'approved', label: 'Approved', status: currentSession.status === 'approved' ? 'completed' : currentSession.status === 'rejected' ? 'failed' : 'pending' },
    ];
    
    return steps;
  };

  const queueCount = allSessions.filter((s) => s.status === 'parsing' || s.status === 'uploading').length;
  const readyForEANCount = allSessions.filter((s) => s.status === 'analyzing_ean').length;
  const pendingColumnSelectionSessions = allSessions.filter((s) => s.status === 'waiting_column_selection');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Leveranciersimport</h1>
        <div className="flex gap-3 items-center">
          {queueCount > 0 && (
            <Button
              onClick={handleProcessQueue}
              disabled={processingQueue}
              variant="secondary"
            >
              {processingQueue ? 'Processing...' : `Process Queue (${queueCount})`}
            </Button>
          )}
          {readyForEANCount > 0 && (
            <Button
              onClick={handleProcessEANAnalysis}
              disabled={processingQueue}
              variant="secondary"
            >
              {processingQueue ? 'Analyzing...' : `Analyze EAN (${readyForEANCount})`}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg whitespace-pre-line">
          {error}
        </div>
      )}

      {/* Upload Section */}
      <Card>
        <h2 className="text-xl font-bold mb-4">Nieuwe Import</h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV or Excel File
            </label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              disabled={uploadStatus === 'uploading' || uploadStatus === 'processing'}
            />
          </div>

          {file && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Selected file:</strong> {file.name}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Size:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Upload Requirements:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Supported formats: CSV, Excel (.xlsx, .xls)</li>
              <li>• Maximum file size: 50 MB</li>
              <li>• Files are checked for duplicates (same content = same file)</li>
              <li>• After upload, files will be validated and processed automatically</li>
            </ul>
          </div>

          <Button
            onClick={handleUpload}
            disabled={!file || uploadStatus === 'uploading' || uploadStatus === 'processing'}
            className="w-full"
          >
            {uploadStatus === 'uploading' ? 'Uploading...' : uploadStatus === 'processing' ? 'Processing...' : 'Upload and Import'}
          </Button>
        </div>
      </Card>

      {/* Current Upload Status Section */}
      {currentSession && (
        <Card>
          <h2 className="text-xl font-bold mb-4">Huidige Import Status</h2>
          
          {/* Progress Steps */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              {getProgressSteps().map((step, index) => (
                <div key={step.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      step.status === 'completed' ? 'bg-green-500 text-white' :
                      step.status === 'active' ? 'bg-blue-500 text-white animate-pulse' :
                      step.status === 'failed' ? 'bg-red-500 text-white' :
                      'bg-gray-300 text-gray-600'
                    }`}>
                      {step.status === 'completed' ? '✓' : step.status === 'failed' ? '✗' : index + 1}
                    </div>
                    <span className="text-xs mt-2 text-center text-gray-600">{step.label}</span>
                  </div>
                  {index < getProgressSteps().length - 1 && (
                    <div className={`flex-1 h-1 mx-2 ${
                      step.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Current Status */}
          <div className={`p-4 rounded-lg ${getStatusColor(currentSession.status)} bg-opacity-10`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{getStatusLabel(currentSession.status)}</p>
                {(currentSession.status === 'analyzing_ean' || currentSession.status === 'parsing' || currentSession.status === 'uploading') && (
                  <p className="text-sm mt-1">Please wait while we process your file...</p>
                )}
              </div>
              {(currentSession.status === 'analyzing_ean' || currentSession.status === 'parsing' || currentSession.status === 'uploading') && (
                <span className="inline-block animate-spin text-2xl">⏳</span>
              )}
            </div>
          </div>

          {/* Metadata */}
          {(currentSession.total_rows_in_file || currentSession.columns_count) && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {currentSession.total_rows_in_file && (
                <div>
                  <p className="text-sm text-gray-600">Rows</p>
                  <p className="text-lg font-semibold">{currentSession.total_rows_in_file}</p>
                </div>
              )}
              {currentSession.columns_count && (
                <div>
                  <p className="text-sm text-gray-600">Columns</p>
                  <p className="text-lg font-semibold">{currentSession.columns_count}</p>
                </div>
              )}
              {currentSession.unique_ean_count !== undefined && (
                <div>
                  <p className="text-sm text-gray-600">Unique EANs</p>
                  <p className="text-lg font-semibold">{currentSession.unique_ean_count}</p>
                </div>
              )}
              {currentSession.duplicate_ean_count !== undefined && (
                <div>
                  <p className="text-sm text-gray-600">Duplicate EANs</p>
                  <p className="text-lg font-semibold">{currentSession.duplicate_ean_count}</p>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {currentSession.error_message && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <p className="font-semibold mb-1">Error Details:</p>
              <p className="text-sm">{currentSession.error_message}</p>
            </div>
          )}
        </Card>
      )}

      {/* Result Section for Current Session */}
      {currentSession && (currentSession.status === 'approved' || currentSession.status === 'rejected' || currentSession.status === 'failed') && (
        <Card>
          <h2 className="text-xl font-bold mb-4">Result</h2>
          
          {currentSession.status === 'approved' && (
            <div className="bg-green-50 border border-green-200 text-green-800 p-6 rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">✓</span>
                <div>
                  <h3 className="text-xl font-bold">File Approved</h3>
                  <p className="text-sm">Your file has been successfully processed and approved.</p>
                </div>
              </div>
              
              {currentSession.unique_ean_count !== undefined && (
                <div className="mt-4 space-y-2">
                  <p><strong>Unique EAN codes:</strong> {currentSession.unique_ean_count}</p>
                  {currentSession.duplicate_ean_count !== undefined && currentSession.duplicate_ean_count > 0 && (
                    <p><strong>Duplicate EAN codes:</strong> {currentSession.duplicate_ean_count}</p>
                  )}
                  {currentSession.detected_ean_column && (
                    <p><strong>EAN Column:</strong> {currentSession.detected_ean_column}</p>
                  )}
                </div>
              )}
              
              <p className="mt-4 text-sm">The file is ready for the next phase of the import process.</p>
            </div>
          )}

          {currentSession.status === 'rejected' && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">✗</span>
                <div>
                  <h3 className="text-xl font-bold">File Rejected</h3>
                  <p className="text-sm">Your file could not be processed.</p>
                </div>
              </div>
              
              {currentSession.error_message && (
                <div className="mt-4">
                  <p className="font-semibold mb-2">Reason:</p>
                  <p className="text-sm">{currentSession.error_message}</p>
                </div>
              )}
            </div>
          )}

          {currentSession.status === 'failed' && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">⚠️</span>
                <div>
                  <h3 className="text-xl font-bold">Processing Failed</h3>
                  <p className="text-sm">A technical error occurred during processing.</p>
                </div>
              </div>
              
              {currentSession.error_message && (
                <div className="mt-4">
                  <p className="font-semibold mb-2">Error Details:</p>
                  <p className="text-sm font-mono bg-white p-3 rounded border">{currentSession.error_message}</p>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Action Required: EAN Column Selection */}
      {pendingColumnSelectionSessions.length > 0 && (
        <Card>
          <div className="bg-orange-50 border-2 border-orange-300 text-orange-900 px-6 py-4 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                ⚠️ Action Required: Select EAN Column
              </h2>
              <span className="text-sm font-semibold bg-orange-200 px-3 py-1 rounded">
                {pendingColumnSelectionSessions.length} file{pendingColumnSelectionSessions.length !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-sm text-orange-800 mb-4">
              The following files have multiple EAN/GTIN-13 columns detected. Please select the correct column for each file to continue processing.
            </p>
            <div className="space-y-2">
              {pendingColumnSelectionSessions.map((session) => {
                const match = session.error_message?.match(/Multiple EAN columns detected: (.+?)\./);
                const detectedColumns = match && match[1] 
                  ? match[1].split(',').map(col => col.trim())
                  : [];
                
                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 bg-white rounded border border-orange-200 hover:border-orange-300 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{session.file_name}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {detectedColumns.length > 0 
                          ? `${detectedColumns.length} column${detectedColumns.length !== 1 ? 's' : ''} detected: ${detectedColumns.join(', ')}`
                          : 'Multiple EAN columns detected'}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleOpenModal(session)}
                      className="ml-4"
                    >
                      Select Column
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Queue Status Indicator */}
      {queueCount > 0 && (
        <Card>
          <div className="bg-purple-50 border border-purple-200 text-purple-700 px-4 py-3 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                📋 Queue: {queueCount} file{queueCount !== 1 ? 's' : ''} waiting to be processed
              </span>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                <span>Auto-refresh</span>
              </label>
            </div>
          </div>
        </Card>
      )}

      {/* All Sessions Overview */}
      <Card>
        <h2 className="text-xl font-bold mb-4">Alle Imports</h2>

        {loading && allSessions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading sessions...</p>
          </div>
        ) : allSessions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No import sessions found</p>
            <p className="text-sm text-gray-400">Upload a file above to get started</p>
          </div>
        ) : (
          <Table headers={['Filename', 'Status', 'Rows', 'Columns', 'Unique EANs', 'Duplicate EANs', 'Date', '']}>
            {allSessions.map((session) => {
              const rowCount = session.total_rows_in_file ?? session.total_rows ?? 0;
              const columnCount = session.columns_count ?? null;
              const hasError = (session.status === 'failed' || session.status === 'rejected') && session.error_message;
              const needsColumnSelection = session.status === 'waiting_column_selection';
              const isRejected = session.status === 'rejected';
              
              return (
                <tr key={session.id} className={needsColumnSelection ? 'bg-orange-50/30' : ''}>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 ${needsColumnSelection ? 'bg-orange-50' : ''}`}>
                    <div className="flex items-center gap-2">
                      {session.file_name}
                      {hasError && (
                        <span 
                          className="text-red-600 cursor-help" 
                          title={session.error_message || 'Error occurred'}
                        >
                          ⚠️
                        </span>
                      )}
                      {isRejected && (
                        <span 
                          className="text-red-600 cursor-help" 
                          title="File rejected - no EAN column found"
                        >
                          ❌
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${getStatusColor(session.status)}`}>
                        {getStatusLabel(session.status)}
                      </span>
                      {(session.status === 'parsing' || session.status === 'analyzing_ean' || session.status === 'uploading') && (
                        <span className="inline-block animate-spin">⏳</span>
                      )}
                      {session.status === 'approved' && (
                        <span className="text-green-600" title="File approved">✓</span>
                      )}
                      {session.status === 'waiting_column_selection' && (
                        <Button
                          onClick={() => handleOpenModal(session)}
                          className="text-xs bg-orange-600 hover:bg-orange-700 text-white ml-2"
                        >
                          Select Column
                        </Button>
                      )}
                      {session.status === 'analyzing_ean' && session.ean_analysis_at && (() => {
                        const analysisStarted = new Date(session.ean_analysis_at).getTime();
                        const now = Date.now();
                        const isStuck = (now - analysisStarted) > 5 * 60 * 1000;
                        
                        return isStuck ? (
                          <Button
                            onClick={() => handleRetryEANAnalysis(session.id!)}
                            className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white ml-2"
                            variant="secondary"
                          >
                            Retry
                          </Button>
                        ) : null;
                      })()}
                    </div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 ${needsColumnSelection ? 'bg-orange-50' : ''}`}>
                    {rowCount > 0 ? rowCount : (session.status === 'uploading' || session.status === 'parsing' ? '-' : '0')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {columnCount !== null && columnCount > 0 ? columnCount : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {session.unique_ean_count !== undefined && session.unique_ean_count !== null ? (
                      <span>{session.unique_ean_count}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {session.duplicate_ean_count !== undefined && session.duplicate_ean_count !== null ? (
                      session.duplicate_ean_count > 0 ? (
                        <span className="text-orange-600 font-semibold">{session.duplicate_ean_count}</span>
                      ) : (
                        <span>0</span>
                      )
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {session.created_at
                      ? new Date(session.created_at).toLocaleDateString() + ' ' +
                        new Date(session.created_at).toLocaleTimeString()
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <Button
                      variant="danger"
                      onClick={() => handleDelete(session.id!, session.file_name)}
                      disabled={deleting === session.id}
                      className="text-xs"
                    >
                      {deleting === session.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      {/* EAN Column Selection Modal */}
      {(modalSession || (currentSession && currentSession.status === 'waiting_column_selection')) && (
        <EANColumnSelectionModal
          session={modalSession || currentSession!}
          isOpen={modalOpen}
          onClose={handleCloseModal}
          onSelect={handleSelectEANColumn}
        />
      )}
    </div>
  );
}
