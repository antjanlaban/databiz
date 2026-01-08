import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/upload/route';
import { NextRequest } from 'next/server';
import { createMockFile, createTestCSV, createTestProducts } from '@/tests/utils/test-helpers';
import { UploadErrorCode } from '@/lib/upload-constants';
import { createMockSupabaseForUpload } from '@/tests/utils/mock-upload-api';

// Mock the server-side modules
vi.mock('@/lib/supabase-server', () => ({
  getSupabaseServer: vi.fn(),
}));

vi.mock('@/lib/storage', () => ({
  uploadFileToStorage: vi.fn(),
  constructStoragePath: vi.fn((sessionId: string, filename: string) => 
    `incoming/${sessionId}/${filename}`
  ),
}));

import { getSupabaseServer } from '@/lib/supabase-server';
import { uploadFileToStorage } from '@/lib/storage';
import { randomUUID } from 'crypto';

describe('POST /api/upload', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseForUpload>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(uploadFileToStorage).mockResolvedValue('incoming/session-id/test.csv');
    mockSupabase = createMockSupabaseForUpload();
    vi.mocked(getSupabaseServer).mockReturnValue(mockSupabase as any);
  });

  describe('Successful uploads', () => {
    it('should successfully upload a CSV file', async () => {
      mockSupabase.reset();
      
      const testProducts = createTestProducts(2);
      const csvContent = createTestCSV(testProducts);
      const file = createMockFile('test-products.csv', csvContent, 'text/csv');

      const formData = new FormData();
      formData.append('file', file);

      // Setup mocks for the three database calls
      const duplicateBuilder = mockSupabase.from();
      duplicateBuilder.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' },
      });

      const insertBuilder = mockSupabase.from();
      insertBuilder.insert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 1,
              file_name: file.name,
              file_type: 'csv',
              status: 'pending',
              file_hash: 'test-hash',
              file_size_bytes: file.size,
            },
            error: null,
          }),
        }),
      });

      const updateBuilder = mockSupabase.from();
      updateBuilder.update.mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: 1, status: 'parsing' },
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.sessionId).toBeDefined();
      expect(data.fileName).toBe('test-products.csv');
      expect(data.storagePath).toBeDefined();
    });

    it('should successfully upload an Excel file', async () => {
      mockSupabase.reset();
      
      const file = createMockFile('test-products.xlsx', 'test excel content', 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      const formData = new FormData();
      formData.append('file', file);

      const duplicateBuilder = mockSupabase.from();
      duplicateBuilder.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' },
      });

      const insertBuilder = mockSupabase.from();
      insertBuilder.insert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 1,
              file_name: file.name,
              file_type: 'xlsx',
              status: 'pending',
            },
            error: null,
          }),
        }),
      });

      const updateBuilder = mockSupabase.from();
      updateBuilder.update.mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: 1, status: 'parsing' },
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.fileName).toBe('test-products.xlsx');
    });
  });

  describe('Validation errors', () => {
    it('should reject request without file', async () => {
      const formData = new FormData();

      const request = new NextRequest('http://localhost/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe(UploadErrorCode.FILE_NOT_PROVIDED);
    });

    it('should reject invalid file extension', async () => {
      const file = createMockFile('test.txt', 'test content', 'text/plain');
      const formData = new FormData();
      formData.append('file', file);

      const request = new NextRequest('http://localhost/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe(UploadErrorCode.FILE_EXTENSION_INVALID);
    });

    it('should reject files exceeding size limit', async () => {
      const largeContent = new Blob(['a'.repeat(52 * 1024 * 1024)]); // 52MB
      const file = createMockFile('large.csv', largeContent, 'text/csv');
      const formData = new FormData();
      formData.append('file', file);

      const request = new NextRequest('http://localhost/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe(UploadErrorCode.FILE_SIZE_EXCEEDED);
    });
  });

  describe('Duplicate detection', () => {
    it('should detect and reject duplicate files', async () => {
      mockSupabase.reset();
      
      const file = createMockFile('test.csv', 'test content');
      const formData = new FormData();
      formData.append('file', file);

      const existingSession = {
        id: 123,
        file_name: 'existing.csv',
        uploaded_at: '2026-01-08T10:00:00Z',
      };

      const duplicateBuilder = mockSupabase.from();
      duplicateBuilder.single.mockResolvedValue({
        data: existingSession,
        error: null,
      });

      const request = new NextRequest('http://localhost/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe(UploadErrorCode.DUPLICATE_FILE);
      expect(data.existingSessionId).toBe(123);
      expect(data.uploadedAt).toBeDefined();
    });
  });

  describe('Storage errors', () => {
    it('should handle storage upload failure', async () => {
      mockSupabase.reset();
      
      const file = createMockFile('test.csv', 'test content');
      const formData = new FormData();
      formData.append('file', file);

      const duplicateBuilder = mockSupabase.from();
      duplicateBuilder.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' },
      });

      const insertBuilder = mockSupabase.from();
      insertBuilder.insert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 1,
              file_name: file.name,
              status: 'pending',
            },
            error: null,
          }),
        }),
      });

      // Mock storage failure
      vi.mocked(uploadFileToStorage).mockRejectedValueOnce(
        new Error('Storage upload failed')
      );

      // Mock session update to failed
      const updateBuilder = mockSupabase.from();
      updateBuilder.update.mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: 1, status: 'failed' },
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe(UploadErrorCode.STORAGE_UPLOAD_FAILED);
    });
  });

  describe('Database errors', () => {
    it('should handle database error during session creation', async () => {
      mockSupabase.reset();
      
      const file = createMockFile('test.csv', 'test content');
      const formData = new FormData();
      formData.append('file', file);

      const duplicateBuilder = mockSupabase.from();
      duplicateBuilder.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' },
      });

      const insertBuilder = mockSupabase.from();
      insertBuilder.insert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' },
          }),
        }),
      });

      const request = new NextRequest('http://localhost/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe(UploadErrorCode.DATABASE_ERROR);
    });
  });

  describe('Large file and network errors', () => {
    it('should handle network timeout errors gracefully', async () => {
      mockSupabase.reset();
      
      const largeContent = new Blob(['a'.repeat(24 * 1024 * 1024)]); // 24MB
      const file = createMockFile('large.csv', largeContent, 'text/csv');
      const formData = new FormData();
      formData.append('file', file);

      const duplicateBuilder = mockSupabase.from();
      duplicateBuilder.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' },
      });

      const insertBuilder = mockSupabase.from();
      insertBuilder.insert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 1,
              file_name: file.name,
              status: 'pending',
            },
            error: null,
          }),
        }),
      });

      // Mock network timeout error
      vi.mocked(uploadFileToStorage).mockRejectedValueOnce(
        new Error('fetch failed')
      );

      const updateBuilder = mockSupabase.from();
      updateBuilder.update.mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: 1, status: 'failed' },
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe(UploadErrorCode.STORAGE_UPLOAD_FAILED);
      expect(data.message).toContain('Network error');
      expect(data.message).toContain('24.00MB');
    });

    it('should successfully upload large files within timeout', async () => {
      mockSupabase.reset();
      
      const largeContent = new Blob(['a'.repeat(24 * 1024 * 1024)]); // 24MB
      const file = createMockFile('large.csv', largeContent, 'text/csv');
      const formData = new FormData();
      formData.append('file', file);

      const duplicateBuilder = mockSupabase.from();
      duplicateBuilder.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' },
      });

      const insertBuilder = mockSupabase.from();
      insertBuilder.insert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 1,
              file_name: file.name,
              file_type: 'csv',
              status: 'pending',
            },
            error: null,
          }),
        }),
      });

      // Mock successful storage upload
      vi.mocked(uploadFileToStorage).mockResolvedValueOnce(
        'incoming/session-id/large.csv'
      );

      const updateBuilder = mockSupabase.from();
      updateBuilder.update.mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: 1, status: 'parsing' },
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.fileName).toBe('large.csv');
    });

    it('should handle ECONNRESET network errors', async () => {
      mockSupabase.reset();
      
      const largeContent = new Blob(['a'.repeat(24 * 1024 * 1024)]); // 24MB
      const file = createMockFile('large.csv', largeContent, 'text/csv');
      const formData = new FormData();
      formData.append('file', file);

      const duplicateBuilder = mockSupabase.from();
      duplicateBuilder.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' },
      });

      const insertBuilder = mockSupabase.from();
      insertBuilder.insert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 1,
              file_name: file.name,
              status: 'pending',
            },
            error: null,
          }),
        }),
      });

      // Mock connection reset error
      vi.mocked(uploadFileToStorage).mockRejectedValueOnce(
        new Error('ECONNRESET')
      );

      const updateBuilder = mockSupabase.from();
      updateBuilder.update.mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { id: 1, status: 'failed' },
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe(UploadErrorCode.STORAGE_UPLOAD_FAILED);
      expect(data.message).toContain('Network error');
    });
  });
});

