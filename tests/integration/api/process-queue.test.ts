import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/process-queue/route';
import { NextRequest } from 'next/server';
import { createMockFile, createTestCSV, createTestProducts } from '@/tests/utils/test-helpers';

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

vi.mock('@/lib/fileProcessor', () => ({
  processFile: vi.fn(),
}));

import { getSupabaseServer } from '@/lib/supabase-server';
import { downloadFileFromStorage } from '@/lib/storage';
import { getFileMetadata } from '@/lib/fileParser';
import { processFile } from '@/lib/fileProcessor';

describe('POST /api/process-queue', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        single: vi.fn(),
      }),
    };

    vi.mocked(getSupabaseServer).mockReturnValue(mockSupabase);
  });

  describe('Successful queue processing', () => {
    it('should successfully process a file from queue', async () => {
      const sessionId = 123;
      const products = createTestProducts(10);
      const csvContent = createTestCSV(products);

      // Mock: Find session with status 'parsing'
      const selectBuilder = mockSupabase.from();
      selectBuilder.limit.mockResolvedValue({
        data: [{ id: sessionId, file_name: 'test.csv', status: 'parsing', file_storage_path: 'incoming/test/test.csv' }],
        error: null,
      });
      const updateBuilder = mockSupabase.from();
      updateBuilder.single.mockResolvedValue({
        data: { id: sessionId },
        error: null,
      });

      // Mock: Process file
      vi.mocked(processFile).mockResolvedValue({
        rowCount: 10,
        columnCount: 4,
      });

      const request = new NextRequest('http://localhost/api/process-queue', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.processed).toBe(1);
      expect(data.sessionId).toBe(sessionId);
      expect(data.metadata).toBeDefined();
      expect(data.metadata.rowCount).toBe(10);
      expect(data.metadata.columnCount).toBe(4);
      expect(processFile).toHaveBeenCalledWith(sessionId);
    });

    it('should process file and return correct metadata', async () => {
      const sessionId = 456;

      const selectBuilder = mockSupabase.from();
      selectBuilder.limit.mockResolvedValue({
        data: [{ id: sessionId }],
        error: null,
      });

      const updateBuilder = mockSupabase.from();
      updateBuilder.single.mockResolvedValue({
        data: { id: sessionId },
        error: null,
      });

      vi.mocked(processFile).mockResolvedValue({
        rowCount: 100,
        columnCount: 36,
      });

      const request = new NextRequest('http://localhost/api/process-queue', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.metadata.rowCount).toBe(100);
      expect(data.metadata.columnCount).toBe(36);
    });
  });

  describe('Empty queue', () => {
    it('should return success when no files in queue', async () => {
      const selectBuilder = mockSupabase.from();
      selectBuilder.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      const request = new NextRequest('http://localhost/api/process-queue', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.processed).toBe(0);
      expect(data.message).toContain('No files in queue');
      expect(processFile).not.toHaveBeenCalled();
    });
  });

  describe('Lock already taken', () => {
    it('should handle case where another process locked the session', async () => {
      const sessionId = 789;

      const selectBuilder = mockSupabase.from();
      selectBuilder.limit.mockResolvedValue({
        data: [{ id: sessionId }],
        error: null,
      });

      // Mock: Lock attempt fails (another process got it)
      const updateBuilder = mockSupabase.from();
      updateBuilder.single.mockResolvedValue({
        data: null,
        error: { message: 'No rows updated', code: 'PGRST116' },
      });

      const request = new NextRequest('http://localhost/api/process-queue', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.processed).toBe(0);
      expect(data.message).toContain('may be locked by another process');
      expect(processFile).not.toHaveBeenCalled();
    });

    it('should handle update error (lock failed)', async () => {
      const sessionId = 101;

      const selectBuilder = mockSupabase.from();
      selectBuilder.limit.mockResolvedValue({
        data: [{ id: sessionId }],
        error: null,
      });

      const updateBuilder = mockSupabase.from();
      updateBuilder.single.mockResolvedValue({
        data: null,
        error: { message: 'Update failed', code: 'UPDATE_ERROR' },
      });

      const request = new NextRequest('http://localhost/api/process-queue', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processed).toBe(0);
      expect(processFile).not.toHaveBeenCalled();
    });
  });

  describe('Processing errors', () => {
    it('should handle processing failure', async () => {
      const sessionId = 202;

      const selectBuilder = mockSupabase.from();
      selectBuilder.limit.mockResolvedValue({
        data: [{ id: sessionId }],
        error: null,
      });

      const updateBuilder = mockSupabase.from();
      updateBuilder.single.mockResolvedValue({
        data: { id: sessionId },
        error: null,
      });

      // Mock: Processing fails
      vi.mocked(processFile).mockRejectedValue(
        new Error('Failed to parse file: Invalid format')
      );

      const request = new NextRequest('http://localhost/api/process-queue', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.processed).toBe(0);
      expect(data.error).toBe('PROCESSING_ERROR');
      expect(data.message).toContain('Failed to process file');
    });

    it('should handle storage download failure during processing', async () => {
      const sessionId = 303;

      const selectBuilder = mockSupabase.from();
      selectBuilder.limit.mockResolvedValue({
        data: [{ id: sessionId }],
        error: null,
      });

      const updateBuilder = mockSupabase.from();
      updateBuilder.single.mockResolvedValue({
        data: { id: sessionId },
        error: null,
      });

      // Mock: Processing fails with storage error
      vi.mocked(processFile).mockRejectedValue(
        new Error('Storage download failed: File not found')
      );

      const request = new NextRequest('http://localhost/api/process-queue', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('PROCESSING_ERROR');
      expect(data.message).toContain('Storage download failed');
    });

    it('should handle file parsing failure during processing', async () => {
      const sessionId = 404;

      const selectBuilder = mockSupabase.from();
      selectBuilder.limit.mockResolvedValue({
        data: [{ id: sessionId }],
        error: null,
      });

      const updateBuilder = mockSupabase.from();
      updateBuilder.single.mockResolvedValue({
        data: { id: sessionId },
        error: null,
      });

      // Mock: Processing fails with parsing error
      vi.mocked(processFile).mockRejectedValue(
        new Error('File parsing failed: Corrupt file')
      );

      const request = new NextRequest('http://localhost/api/process-queue', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('PROCESSING_ERROR');
      expect(data.message).toContain('File parsing failed');
    });
  });

  describe('Database errors', () => {
    it('should handle database error when querying queue', async () => {
      const selectBuilder = mockSupabase.from();
      selectBuilder.limit.mockRejectedValue({
        data: null,
        error: { message: 'Database connection failed', code: 'DATABASE_ERROR' },
      });

      const request = new NextRequest('http://localhost/api/process-queue', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('DATABASE_ERROR');
      expect(data.message).toContain('Failed to query queue');
    });

    it('should handle database error when selecting sessions', async () => {
      const selectBuilder = mockSupabase.from();
      selectBuilder.limit.mockResolvedValue({
        data: null,
        error: { message: 'Query failed', code: 'QUERY_ERROR' },
      });

      const request = new NextRequest('http://localhost/api/process-queue', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('DATABASE_ERROR');
    });
  });

  describe('FIFO order', () => {
    it('should process files in FIFO order (oldest first)', async () => {
      const sessionId1 = 501;
      const sessionId2 = 502;

      // First request: Get oldest session
      const selectBuilder1 = mockSupabase.from();
      selectBuilder1.limit.mockResolvedValueOnce({
        data: [{ id: sessionId1 }],
        error: null,
      });

      const updateBuilder1 = mockSupabase.from();
      updateBuilder1.single.mockResolvedValueOnce({
        data: { id: sessionId1 },
        error: null,
      });

      vi.mocked(processFile).mockResolvedValueOnce({
        rowCount: 10,
        columnCount: 4,
      });

      const request1 = new NextRequest('http://localhost/api/process-queue', {
        method: 'POST',
      });

      const response1 = await POST(request1);
      const data1 = await response1.json();

      expect(data1.sessionId).toBe(sessionId1);
      expect(processFile).toHaveBeenCalledWith(sessionId1);

      // Second request: Get next oldest session
      selectBuilder1.limit.mockResolvedValueOnce({
        data: [{ id: sessionId2 }],
        error: null,
      });

      updateBuilder1.single.mockResolvedValueOnce({
        data: { id: sessionId2 },
        error: null,
      });

      vi.mocked(processFile).mockResolvedValueOnce({
        rowCount: 20,
        columnCount: 5,
      });

      const request2 = new NextRequest('http://localhost/api/process-queue', {
        method: 'POST',
      });

      const response2 = await POST(request2);
      const data2 = await response2.json();

      expect(data2.sessionId).toBe(sessionId2);
      expect(processFile).toHaveBeenCalledWith(sessionId2);
    });
  });

  describe('Unexpected errors', () => {
    it('should handle unexpected errors gracefully', async () => {
      // Mock: Unexpected error in query
      vi.mocked(mockSupabase.from).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const request = new NextRequest('http://localhost/api/process-queue', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('UNEXPECTED_ERROR');
      expect(data.message).toContain('Unexpected error');
    });
  });

  describe('Concurrent processing', () => {
    it('should handle multiple concurrent queue requests', async () => {
      const sessionId1 = 601;
      const sessionId2 = 602;

      // Setup mocks for two sessions
      const selectBuilder = mockSupabase.from();
      
      // First concurrent request
      selectBuilder.limit.mockResolvedValueOnce({
        data: [{ id: sessionId1 }],
        error: null,
      });

      // Second concurrent request (different session)
      selectBuilder.limit.mockResolvedValueOnce({
        data: [{ id: sessionId2 }],
        error: null,
      });

      const updateBuilder = mockSupabase.from();
      updateBuilder.single
        .mockResolvedValueOnce({
          data: { id: sessionId1 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: sessionId2 },
          error: null,
        });

      vi.mocked(processFile)
        .mockResolvedValueOnce({
          rowCount: 10,
          columnCount: 4,
        })
        .mockResolvedValueOnce({
          rowCount: 20,
          columnCount: 5,
        });

      // Execute requests concurrently
      const request1 = new NextRequest('http://localhost/api/process-queue', {
        method: 'POST',
      });
      const request2 = new NextRequest('http://localhost/api/process-queue', {
        method: 'POST',
      });

      const [response1, response2] = await Promise.all([
        POST(request1),
        POST(request2),
      ]);

      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(data1.success).toBe(true);
      expect(data2.success).toBe(true);
      expect(data1.sessionId).toBe(sessionId1);
      expect(data2.sessionId).toBe(sessionId2);
      expect(processFile).toHaveBeenCalledTimes(2);
    });
  });
});

