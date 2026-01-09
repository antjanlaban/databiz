'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DataTable, DataTableRow, DataTableCell } from '@/components/ui/DataTable';
import { ImportSession } from '@/lib/database.types';
import { ChevronLeft, ChevronRight, Search, X, Loader2 } from 'lucide-react';

interface JSONViewerDialogProps {
  session: ImportSession;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface JSONDataResponse {
  success: boolean;
  data: Record<string, any>[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  columns: string[];
  searchResults: number | null;
  error?: string;
}

export function JSONViewerDialog({
  session,
  open,
  onOpenChange,
}: JSONViewerDialogProps) {
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<number | null>(null);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1); // Reset to first page when searching
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load data when dialog opens or page/search changes
  useEffect(() => {
    if (open && session?.id) {
      loadData();
    }
  }, [open, session?.id, page, search]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) {
        params.append('search', search);
      }

      const response = await fetch(`/api/sessions/${session.id}/json?${params.toString()}`);
      const result: JSONDataResponse = await response.json();

      if (!result.success) {
        // Check if error indicates file doesn't exist and conversion is happening
        const errorMsg = result.error || 'Kan JSON data niet laden';
        if (errorMsg.includes('not found') || errorMsg.includes('does not exist')) {
          setError('JSON bestand wordt automatisch geconverteerd. Dit kan even duren...');
          // Retry after a short delay
          setTimeout(() => {
            loadData();
          }, 2000);
          return;
        }
        setError(errorMsg);
        setData([]);
        setColumns([]);
        return;
      }

      setData(result.data);
      setColumns(result.columns);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
      setSearchResults(result.searchResults);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Fout bij laden van JSON data: ${errorMessage}`);
      setData([]);
      setColumns([]);
    } finally {
      setLoading(false);
    }
  }, [session.id, page, limit, search]);

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  const handleSearchReset = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  const startRow = total > 0 ? (page - 1) * limit + 1 : 0;
  const endRow = Math.min(page * limit, total);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>JSON Data Viewer</DialogTitle>
          <DialogDescription>
            Bekijk en controleer de geconverteerde JSON data voor {session.file_name}
            <br />
            <span className="text-xs text-muted-foreground">
              (Bestanden worden automatisch gedecomprimeerd - je ziet de originele data)
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Statistics Banner */}
          <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
            <div className="flex items-center gap-4">
              <span>
                <strong>{total}</strong> rijen totaal
              </span>
              <span>
                <strong>{columns.length}</strong> kolommen
              </span>
              {search && searchResults !== null && (
                <span className="text-foreground">
                  <strong>{searchResults}</strong> resultaten gevonden
                </span>
              )}
            </div>
            <div className="text-muted-foreground">
              {total > 0 && (
                <span>
                  Rij {startRow}-{endRow} van {total}
                </span>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Zoek in alle kolommen..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
            {search && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSearchReset}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Reset
              </Button>
            )}
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-auto border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Laden...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <p className="text-sm text-destructive mb-2">{error}</p>
                  <Button variant="outline" size="sm" onClick={loadData}>
                    Opnieuw proberen
                  </Button>
                </div>
              </div>
            ) : data.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">
                  {search ? 'Geen resultaten gevonden' : 'Geen data beschikbaar'}
                </p>
              </div>
            ) : (
              <DataTable
                headers={columns}
                stickyFirstColumn={true}
                className="min-w-full"
              >
                {data.map((row, rowIndex) => (
                  <DataTableRow key={rowIndex} stickyFirstColumn={true}>
                    {columns.map((col, colIndex) => (
                      <DataTableCell key={colIndex} className="max-w-[200px] truncate">
                        {row[col] !== null && row[col] !== undefined
                          ? String(row[col])
                          : '-'}
                      </DataTableCell>
                    ))}
                  </DataTableRow>
                ))}
              </DataTable>
            )}
          </div>

          {/* Pagination Controls */}
          {!loading && !error && totalPages > 0 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Pagina {page} van {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={page === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Vorige
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={page === totalPages || loading}
                >
                  Volgende
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

