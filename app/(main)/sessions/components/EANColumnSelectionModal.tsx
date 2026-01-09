'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ImportSession } from '@/lib/database.types';

interface EANColumnSelectionModalProps {
  session: ImportSession;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (columnName: string) => Promise<void>;
}

export default function EANColumnSelectionModal({
  session,
  isOpen,
  onClose,
  onSelect,
}: EANColumnSelectionModalProps) {
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.error_message) {
      const match = session.error_message.match(/Multiple EAN columns detected: (.+?)\./);
      if (match && match[1]) {
        const columns = match[1].split(',').map(col => col.trim());
        setDetectedColumns(columns);
        if (columns.length === 1) {
          setSelectedColumn(columns[0]);
        }
      }
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedColumn) {
      setError('Selecteer een EAN kolom');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSelect(selectedColumn);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fout bij selecteren EAN kolom');
      setSubmitting(false);
    }
  };

  if (detectedColumns.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Selecteer EAN Kolom</DialogTitle>
          <DialogDescription>
            Meerdere EAN/GTIN-13 kolommen zijn gedetecteerd in dit bestand. Selecteer de juiste kolom voor EAN analyse.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Bestand:</strong> {session.file_name}
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-3">
                Selecteer EAN Kolom:
              </label>
              <div className="space-y-2">
                {detectedColumns.map((column) => (
                  <label
                    key={column}
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedColumn === column
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 hover:bg-accent'
                    }`}
                  >
                    <input
                      type="radio"
                      name="eanColumn"
                      value={column}
                      checked={selectedColumn === column}
                      onChange={(e) => setSelectedColumn(e.target.value)}
                      className="mr-3 w-4 h-4 text-primary"
                      disabled={submitting}
                    />
                    <span className="text-sm font-medium">{column}</span>
                  </label>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
              >
                Later
              </Button>
              <Button type="submit" disabled={submitting || !selectedColumn}>
                {submitting ? 'Verwerken...' : 'Analyseer EAN Codes'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
