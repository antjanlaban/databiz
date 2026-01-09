import { describe, it, expect, beforeEach, vi } from 'vitest';
import { processFile } from '@/lib/fileProcessor';
import { createMockFile, createTestCSV, createTestProducts } from '@/tests/utils/test-helpers';
import { createMockStorage } from '@/tests/utils/mock-supabase';

// Mock the server-side modules
vi.mock('@/lib/supabase-server', () => ({
  getSupabaseServer: vi.fn(),
}));

vi.mock('@/lib/storage', () => ({
  downloadFileFromStorage: vi.fn(),
  STORAGE_BUCKET_NAME: 'test-bucket',
}));

vi.mock('@/lib/fileParser', () => ({
  getFileMetadata: vi.fn(),
}));

import { getSupabaseServer } from '@/lib/supabase-server';
import { downloadFileFromStorage } from '@/lib/storage';
import { getFileMetadata } from '@/lib/fileParser';

describe('fileProcessor', () => {
  let mockSupabase: any;
  let mockStorage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
        update: vi.fn().mockReturnThis(),
      }),
    };

    vi.mocked(getSupabaseServer).mockReturnValue(mockSupabase);

    // Setup mock Storage
    mockStorage = createMockStorage();
    // Note: downloadFileFromStorage is mocked separately
  });

  describe('processFile - successful processing', () => {
    it('should successfully process a CSV file', async () => {
      const sessionId = 123;
      const filePath = 'incoming/session-id/test.csv';
      const products = createTestProducts(10);
      const csvContent = createTestCSV(products);
      const fileBlob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([fileBlob], 'test.csv', { type: 'text/csv' });

      // Mock session fetch
      const selectBuilder = mockSupabase.from();
      selectBuilder.select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: sessionId,
              file_storage_path: filePath,
              file_name: 'test.csv',
              file_type: 'csv',
              status: 'parsing',
            },
            error: null,
          }),
        }),
      });

      // Mock download
      vi.mocked(downloadFileFromStorage).mockResolvedValue(fileBlob);

      // Mock metadata extraction
      vi.mocked(getFileMetadata).mockResolvedValue({
        rowCount: 10,
        columnCount: 4,
      });

      // Mock update
      const updateBuilder = mockSupabase.from();
      updateBuilder.update.mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: sessionId },
          error: null,
        }),
      });

      const metadata = await processFile(sessionId);

      expect(metadata).toBeDefined();
      expect(metadata.rowCount).toBe(10);
      expect(metadata.columnCount).toBe(4);
      expect(downloadFileFromStorage).toHaveBeenCalledWith('test-bucket', filePath);
      expect(getFileMetadata).toHaveBeenCalled();
      expect(updateBuilder.update).toHaveBeenCalled();
    });

    it('should update session with metadata and correct status', async () => {
      const sessionId = 456;
      const filePath = 'incoming/session-id/products.csv';

      // Mock session fetch
      const selectBuilder = mockSupabase.from();
      selectBuilder.select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: sessionId,
              file_storage_path: filePath,
              file_name: 'products.csv',
              file_type: 'csv',
              status: 'parsing',
            },
            error: null,
          }),
        }),
      });

      const fileBlob = new Blob(['test content'], { type: 'text/csv' });
      vi.mocked(downloadFileFromStorage).mockResolvedValue(fileBlob);
      vi.mocked(getFileMetadata).mockResolvedValue({
        rowCount: 100,
        columnCount: 36,
      });

      const updateBuilder = mockSupabase.from();
      let updateData: any = null;
      updateBuilder.update.mockImplementation((data: any) => {
        updateData = data;
        return {
          eq: vi.fn().mockResolvedValue({
            data: { id: sessionId },
            error: null,
          }),
        };
      });

      await processFile(sessionId);

      expect(updateData).toBeDefined();
      expect(updateData.status).toBe('ready_for_processing');
      expect(updateData.total_rows_in_file).toBe(100);
      expect(updateData.columns_count).toBe(36);
      expect(updateData.parsed_at).toBeDefined();
      expect(updateData.error_message).toBeNull();
    });
  });

  describe('processFile - error handling', () => {
    it('should handle session not found', async () => {
      const sessionId = 999;

      const selectBuilder = mockSupabase.from();
      selectBuilder.select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Session not found', code: 'PGRST116' },
          }),
        }),
      });

      await expect(processFile(sessionId)).rejects.toThrow('Session not found');

      // Should try to update status to failed
      expect(mockSupabase.from).toHaveBeenCalledWith('import_sessions');
    });

    it('should handle missing storage path', async () => {
      const sessionId = 789;

      const selectBuilder = mockSupabase.from();
      selectBuilder.select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: sessionId,
              file_storage_path: null,
              file_name: 'test.csv',
              file_type: 'csv',
              status: 'parsing',
            },
            error: null,
          }),
        }),
      });

      await expect(processFile(sessionId)).rejects.toThrow('has no storage path');

      // Should update status to failed
      const updateBuilder = mockSupabase.from();
      expect(updateBuilder.update).toHaveBeenCalled();
    });

    it('should handle storage download failure', async () => {
      const sessionId = 111;
      const filePath = 'incoming/session-id/test.csv';

      const selectBuilder = mockSupabase.from();
      selectBuilder.select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: sessionId,
              file_storage_path: filePath,
              file_name: 'test.csv',
              file_type: 'csv',
              status: 'parsing',
            },
            error: null,
          }),
        }),
      });

      // Mock download failure
      vi.mocked(downloadFileFromStorage).mockRejectedValue(
        new Error('File not found in storage')
      );

      const updateBuilder = mockSupabase.from();
      let updateData: any = null;
      updateBuilder.update.mockImplementation((data: any) => {
        updateData = data;
        return {
          eq: vi.fn().mockResolvedValue({
            data: { id: sessionId },
            error: null,
          }),
        };
      });

      await expect(processFile(sessionId)).rejects.toThrow('Storage download failed');

      // Should update status to failed with error message
      expect(updateData).toBeDefined();
      expect(updateData.status).toBe('failed');
      expect(updateData.error_message).toContain('Failed to download file from storage');
    });

    it('should handle file parsing failure', async () => {
      const sessionId = 222;
      const filePath = 'incoming/session-id/test.csv';
      const fileBlob = new Blob(['test content'], { type: 'text/csv' });

      const selectBuilder = mockSupabase.from();
      selectBuilder.select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: sessionId,
              file_storage_path: filePath,
              file_name: 'test.csv',
              file_type: 'csv',
              status: 'parsing',
            },
            error: null,
          }),
        }),
      });

      vi.mocked(downloadFileFromStorage).mockResolvedValue(fileBlob);
      
      // Mock parsing failure
      vi.mocked(getFileMetadata).mockRejectedValue(
        new Error('Failed to parse CSV file: Invalid format')
      );

      const updateBuilder = mockSupabase.from();
      let updateData: any = null;
      updateBuilder.update.mockImplementation((data: any) => {
        updateData = data;
        return {
          eq: vi.fn().mockResolvedValue({
            data: { id: sessionId },
            error: null,
          }),
        };
      });

      await expect(processFile(sessionId)).rejects.toThrow('File parsing failed');

      // Should update status to failed with parsing error
      expect(updateData).toBeDefined();
      expect(updateData.status).toBe('failed');
      expect(updateData.error_message).toContain('Failed to parse file');
    });

    it('should handle database update failure', async () => {
      const sessionId = 333;
      const filePath = 'incoming/session-id/test.csv';
      const fileBlob = new Blob(['test content'], { type: 'text/csv' });

      const selectBuilder = mockSupabase.from();
      selectBuilder.select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: sessionId,
              file_storage_path: filePath,
              file_name: 'test.csv',
              file_type: 'csv',
              status: 'parsing',
            },
            error: null,
          }),
        }),
      });

      vi.mocked(downloadFileFromStorage).mockResolvedValue(fileBlob);
      vi.mocked(getFileMetadata).mockResolvedValue({
        rowCount: 10,
        columnCount: 4,
      });

      // Mock update failure
      const updateBuilder = mockSupabase.from();
      updateBuilder.update.mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database update failed', code: 'DATABASE_ERROR' },
        }),
      });

      await expect(processFile(sessionId)).rejects.toThrow('Failed to update session with metadata');

      // Should try to update status to failed again
      expect(updateBuilder.update).toHaveBeenCalledTimes(2); // Once for success, once for error
    });

    it('should handle database fetch error', async () => {
      const sessionId = 444;

      const selectBuilder = mockSupabase.from();
      selectBuilder.select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed', code: 'DATABASE_ERROR' },
          }),
        }),
      });

      await expect(processFile(sessionId)).rejects.toThrow('Failed to fetch session');

      // Should try to update status to failed
      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });

  describe('processFile - edge cases', () => {
    it('should handle empty file successfully', async () => {
      const sessionId = 555;
      const filePath = 'incoming/session-id/empty.csv';
      const fileBlob = new Blob([''], { type: 'text/csv' });

      const selectBuilder = mockSupabase.from();
      selectBuilder.select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: sessionId,
              file_storage_path: filePath,
              file_name: 'empty.csv',
              file_type: 'csv',
              status: 'parsing',
            },
            error: null,
          }),
        }),
      });

      vi.mocked(downloadFileFromStorage).mockResolvedValue(fileBlob);
      vi.mocked(getFileMetadata).mockResolvedValue({
        rowCount: 0,
        columnCount: 0,
      });

      const updateBuilder = mockSupabase.from();
      updateBuilder.update.mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: sessionId },
          error: null,
        }),
      });

      const metadata = await processFile(sessionId);

      expect(metadata.rowCount).toBe(0);
      expect(metadata.columnCount).toBe(0);
    });

    it('should handle Excel file type', async () => {
      const sessionId = 666;
      const filePath = 'incoming/session-id/products.xlsx';
      const fileBlob = new Blob(['excel content'], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });

      const selectBuilder = mockSupabase.from();
      selectBuilder.select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: sessionId,
              file_storage_path: filePath,
              file_name: 'products.xlsx',
              file_type: 'xlsx',
              status: 'parsing',
            },
            error: null,
          }),
        }),
      });

      vi.mocked(downloadFileFromStorage).mockResolvedValue(fileBlob);
      vi.mocked(getFileMetadata).mockResolvedValue({
        rowCount: 50,
        columnCount: 15,
      });

      const updateBuilder = mockSupabase.from();
      updateBuilder.update.mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: sessionId },
          error: null,
        }),
      });

      const metadata = await processFile(sessionId);

      expect(metadata.rowCount).toBe(50);
      expect(metadata.columnCount).toBe(15);
    });

    it('should log warning for non-parsing status', async () => {
      const sessionId = 777;
      const filePath = 'incoming/session-id/test.csv';
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const selectBuilder = mockSupabase.from();
      selectBuilder.select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: sessionId,
              file_storage_path: filePath,
              file_name: 'test.csv',
              file_type: 'csv',
              status: 'received', // Different status
            },
            error: null,
          }),
        }),
      });

      const fileBlob = new Blob(['test'], { type: 'text/csv' });
      vi.mocked(downloadFileFromStorage).mockResolvedValue(fileBlob);
      vi.mocked(getFileMetadata).mockResolvedValue({
        rowCount: 10,
        columnCount: 4,
      });

      const updateBuilder = mockSupabase.from();
      updateBuilder.update.mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: sessionId },
          error: null,
        }),
      });

      await processFile(sessionId);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("has status 'received', expected 'parsing'")
      );

      consoleSpy.mockRestore();
    });

    it('should handle update failure during error recovery', async () => {
      const sessionId = 888;
      const filePath = 'incoming/session-id/test.csv';

      const selectBuilder = mockSupabase.from();
      selectBuilder.select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: sessionId,
              file_storage_path: filePath,
              file_name: 'test.csv',
              file_type: 'csv',
              status: 'parsing',
            },
            error: null,
          }),
        }),
      });

      // Mock download failure
      vi.mocked(downloadFileFromStorage).mockRejectedValue(
        new Error('Storage error')
      );

      // Mock update failure (error recovery also fails)
      const updateBuilder = mockSupabase.from();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      updateBuilder.update.mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Update failed', code: 'UPDATE_ERROR' },
        }),
      });

      await expect(processFile(sessionId)).rejects.toThrow('Storage download failed');

      // Should log error about failed status update
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});


