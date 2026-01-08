'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
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
      // Extract detected columns from error message
      // Format: "Multiple EAN columns detected: col1, col2, col3. Please select the correct column."
      const match = session.error_message.match(/Multiple EAN columns detected: (.+?)\./);
      if (match && match[1]) {
        const columns = match[1].split(',').map(col => col.trim());
        setDetectedColumns(columns);
        // Auto-select first column if only one
        if (columns.length === 1) {
          setSelectedColumn(columns[0]);
        }
      }
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedColumn) {
      setError('Please select an EAN column');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSelect(selectedColumn);
      // Modal will be closed by parent component after successful selection
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select EAN column');
      setSubmitting(false);
    }
  };

  if (detectedColumns.length === 0) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select EAN Column"
      showCloseButton={!submitting}
    >
      <div className="space-y-6">
        <div>
          <p className="text-gray-700 mb-2">
            <strong>File:</strong> {session.file_name}
          </p>
          <p className="text-gray-600 text-sm">
            Multiple EAN/GTIN-13 columns were detected in this file. Please select the correct column to use for EAN analysis.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select EAN Column:
            </label>
            <div className="space-y-2">
              {detectedColumns.map((column) => (
                <label
                  key={column}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedColumn === column
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="eanColumn"
                    value={column}
                    checked={selectedColumn === column}
                    onChange={(e) => setSelectedColumn(e.target.value)}
                    className="mr-3 w-4 h-4 text-blue-600"
                    disabled={submitting}
                  />
                  <span className="text-sm font-medium text-gray-900">{column}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Later
            </Button>
            <Button type="submit" disabled={submitting || !selectedColumn}>
              {submitting ? 'Processing...' : 'Analyze EAN Codes'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

