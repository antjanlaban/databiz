'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { ImportSession } from '@/lib/database.types';

interface NewDatasetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess: (session: ImportSession) => void;
}

export function NewDatasetDialog({
  open,
  onOpenChange,
  onUploadSuccess,
}: NewDatasetDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Selecteer eerst een bestand');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      // Check if response is ok first
      if (!response.ok) {
        let data: any = {};
        let responseText = '';
        
        try {
          // Try to get response as text first to see what we're dealing with
          responseText = await response.text();
          
          // Try to parse as JSON
          if (responseText && responseText.trim()) {
            try {
              data = JSON.parse(responseText);
            } catch (jsonError) {
              // Not JSON, use text as error message
              console.error('[Upload] Response is not JSON:', responseText.substring(0, 200));
              data = { message: responseText || 'Unknown error' };
            }
          } else {
            // Empty response
            console.error('[Upload] Empty response body');
            data = { message: `Server returned ${response.status} ${response.statusText || 'error'}` };
          }
        } catch (parseError) {
          console.error('[Upload] Failed to read response:', parseError);
          data = { message: `Server error (${response.status}): Kon response niet lezen` };
        }

        let errorMessage = data.message || data.error || `Server error (${response.status})`;
        
        // Add error code if available
        if (data.error && data.error !== errorMessage) {
          errorMessage = `${errorMessage} (${data.error})`;
        }
        
        if (data.error === 'DUPLICATE_FILE' && data.uploadedAt) {
          const uploadDate = new Date(data.uploadedAt).toLocaleString('nl-NL');
          errorMessage = `${errorMessage}\nDit bestand is eerder geüpload op ${uploadDate}`;
        }

        // Log full error for debugging
        console.error('[Upload Error]', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          message: data.message,
          fullResponse: data,
          responseText: responseText ? responseText.substring(0, 500) : '(empty)',
        });

        setError(errorMessage);
        return;
      }

      // Response is ok, parse as JSON
      let data: any;
      try {
        const responseText = await response.text();
        if (responseText && responseText.trim()) {
          data = JSON.parse(responseText);
        } else {
          setError('Server returned empty response');
          return;
        }
      } catch (parseError) {
        console.error('[Upload] Failed to parse success response:', parseError);
        setError('Kon server response niet verwerken');
        return;
      }

      // Fetch the created session
      const { data: sessionData, error: sessionError } = await supabase
        .from('import_sessions')
        .select('*')
        .eq('id', data.sessionId)
        .single();

      if (sessionError || !sessionData) {
        setError('Bestand geüpload maar kan sessie details niet ophalen');
        return;
      }

      // Success - close dialog and notify parent
      setFile(null);
      onUploadSuccess(sessionData);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onverwachte fout tijdens upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nieuwe Dataset</DialogTitle>
          <DialogDescription>
            Upload een CSV of Excel bestand om een nieuwe dataset te importeren
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Selecteer CSV of Excel Bestand
            </label>
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              disabled={uploading}
              className="cursor-pointer"
            />
          </div>

          {file && (
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-xs text-foreground">
                <strong>Geselecteerd:</strong> {file.name}
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>Grootte:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}

          <div className="bg-muted/50 p-3 rounded-lg">
            <h3 className="text-xs font-semibold mb-1 text-foreground">Upload Vereisten:</h3>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              <li>• CSV, Excel (.xlsx, .xls)</li>
              <li>• Max 50 MB</li>
              <li>• Automatische validatie en verwerking</li>
            </ul>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg">
              <p className="whitespace-pre-line">{error}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            Annuleren
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? 'Uploaden...' : 'Upload en Importeer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

