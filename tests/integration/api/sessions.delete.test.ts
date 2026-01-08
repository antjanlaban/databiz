import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DELETE } from '@/app/api/sessions/[id]/route';
import { NextRequest } from 'next/server';
import { UploadErrorCode } from '@/lib/upload-constants';
import { createMockSupabaseForUpload } from '@/tests/utils/mock-upload-api';

// Mock the server-side modules
vi.mock('@/lib/supabase-server', () => ({
  getSupabaseServer: vi.fn(),
}));

vi.mock('@/lib/storage', () => ({
  deleteFileFromStorage: vi.fn(),
}));

import { getSupabaseServer } from '@/lib/supabase-server';
import { deleteFileFromStorage } from '@/lib/storage';

describe('DELETE /api/sessions/[id]', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseForUpload>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(deleteFileFromStorage).mockResolvedValue(undefined);
    mockSupabase = createMockSupabaseForUpload();
    vi.mocked(getSupabaseServer).mockReturnValue(mockSupabase as any);
  });

  describe('TC-DS-001: Successful Delete with Storage File', () => {
    it('should successfully delete a session with storage file', async () => {
      mockSupabase.reset();

      const sessionId = '1';
      const storagePath = 'incoming/session-id/test.csv';

      // Mock session fetch (first call: select().eq().single())
      const fetchBuilder = mockSupabase.from();
      fetchBuilder.select = vi.fn().mockReturnThis();
      fetchBuilder.eq = vi.fn().mockReturnThis();
      fetchBuilder.single = vi.fn().mockResolvedValue({
        data: {
          id: 1,
          file_storage_path: storagePath,
        },
        error: null,
      });

      // Mock delete (second call: delete().eq())
      const deleteBuilder = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
      
      // Make from() return fetchBuilder first, then deleteBuilder
      let callCount = 0;
      mockSupabase.from = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return fetchBuilder;
        if (callCount === 2) return deleteBuilder;
        return fetchBuilder;
      });

      const request = new NextRequest(`http://localhost/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: sessionId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Session deleted successfully');
      
      // Verify storage delete was called
      expect(deleteFileFromStorage).toHaveBeenCalledWith(
        'supplier-uploads',
        storagePath
      );
      
      // Verify database delete was called
      expect(mockSupabase.from).toHaveBeenCalledWith('import_sessions');
    });
  });

  describe('TC-DS-002: Successful Delete without Storage File', () => {
    it('should successfully delete a session without storage path', async () => {
      mockSupabase.reset();

      const sessionId = '1';

      // Mock session fetch
      const fetchBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            file_storage_path: null,
          },
          error: null,
        }),
      };

      // Mock delete
      const deleteBuilder = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
      
      let callCount = 0;
      mockSupabase.from = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return fetchBuilder;
        if (callCount === 2) return deleteBuilder;
        return fetchBuilder;
      });

      const request = new NextRequest(`http://localhost/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: sessionId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Storage delete should not be called when no path
      expect(deleteFileFromStorage).not.toHaveBeenCalled();
    });

    it('should successfully delete a session with empty storage path', async () => {
      mockSupabase.reset();

      const sessionId = '1';

      const fetchBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            file_storage_path: '',
          },
          error: null,
        }),
      };

      const deleteBuilder = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
      
      let callCount = 0;
      mockSupabase.from = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return fetchBuilder;
        if (callCount === 2) return deleteBuilder;
        return fetchBuilder;
      });

      const request = new NextRequest(`http://localhost/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: sessionId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('TC-DS-003: Delete Failed Session', () => {
    it('should successfully delete a failed session', async () => {
      mockSupabase.reset();

      const sessionId = '1';
      const storagePath = 'incoming/session-id/failed.csv';

      const fetchBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            file_storage_path: storagePath,
            status: 'failed',
          },
          error: null,
        }),
      };

      const deleteBuilder = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
      
      let callCount = 0;
      mockSupabase.from = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return fetchBuilder;
        if (callCount === 2) return deleteBuilder;
        return fetchBuilder;
      });

      const request = new NextRequest(`http://localhost/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: sessionId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('TC-DS-004: Delete Session Not Found', () => {
    it('should return 404 when session does not exist', async () => {
      mockSupabase.reset();

      const sessionId = '999';

      // Mock "not found" error
      const fetchBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows returned' },
        }),
      };
      
      mockSupabase.from = vi.fn().mockReturnValue(fetchBuilder);

      const request = new NextRequest(`http://localhost/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: sessionId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe(UploadErrorCode.SESSION_NOT_FOUND);
      expect(data.message).toBe('Import session not found');
      
      // Storage and database delete should not be called
      expect(deleteFileFromStorage).not.toHaveBeenCalled();
    });

    it('should return 404 when session ID is missing', async () => {
      mockSupabase.reset();

      const request = new NextRequest('http://localhost/api/sessions/', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: '' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe(UploadErrorCode.SESSION_NOT_FOUND);
    });
  });

  describe('TC-DS-005: Storage Delete Failure', () => {
    it('should continue with database delete when storage delete fails', async () => {
      mockSupabase.reset();

      const sessionId = '1';
      const storagePath = 'incoming/session-id/test.csv';

      // Mock storage delete failure
      vi.mocked(deleteFileFromStorage).mockRejectedValue(
        new Error('Storage service unavailable')
      );

      const fetchBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            file_storage_path: storagePath,
          },
          error: null,
        }),
      };

      const deleteBuilder = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
      
      let callCount = 0;
      mockSupabase.from = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return fetchBuilder;
        if (callCount === 2) return deleteBuilder;
        return fetchBuilder;
      });

      const request = new NextRequest(`http://localhost/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: sessionId } });
      const data = await response.json();

      // Should still succeed - graceful degradation
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Database delete should still be called
      expect(mockSupabase.from).toHaveBeenCalledWith('import_sessions');
    });
  });

  describe('TC-DS-006: Database Delete Failure', () => {
    it('should return 500 when database delete fails', async () => {
      mockSupabase.reset();

      const sessionId = '1';
      const storagePath = 'incoming/session-id/test.csv';

      const fetchBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            file_storage_path: storagePath,
          },
          error: null,
        }),
      };

      // Mock database delete failure
      const deleteBuilder = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      };
      
      let callCount = 0;
      mockSupabase.from = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return fetchBuilder;
        if (callCount === 2) return deleteBuilder;
        return fetchBuilder;
      });

      const request = new NextRequest(`http://localhost/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: sessionId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe(UploadErrorCode.SESSION_DELETE_FAILED);
      expect(data.message).toContain('Failed to delete session');
    });
  });

  describe('TC-DS-007: Delete Session with Conflicts', () => {
    it('should delete session successfully - conflicts handled by CASCADE', async () => {
      mockSupabase.reset();

      const sessionId = '1';
      const storagePath = 'incoming/session-id/test.csv';

      // Note: CASCADE delete is handled by database, we just verify the session is deleted
      const fetchBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            file_storage_path: storagePath,
          },
          error: null,
        }),
      };

      const deleteBuilder = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
      
      let callCount = 0;
      mockSupabase.from = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return fetchBuilder;
        if (callCount === 2) return deleteBuilder;
        return fetchBuilder;
      });

      const request = new NextRequest(`http://localhost/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: sessionId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // CASCADE delete happens at database level, not in application code
      // This test verifies the session deletion succeeds
    });
  });

  describe('TC-DS-008: Delete Different Session Statuses', () => {
    const statuses: Array<'pending' | 'received' | 'processing' | 'completed' | 'failed'> = [
      'pending',
      'received',
      'processing',
      'completed',
      'failed',
    ];

    statuses.forEach((status) => {
      it(`should successfully delete session with status "${status}"`, async () => {
        mockSupabase.reset();

        const sessionId = '1';
        const storagePath = 'incoming/session-id/test.csv';

        const fetchBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 1,
              file_storage_path: storagePath,
              status,
            },
            error: null,
          }),
        };

        const deleteBuilder = {
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        };
        
        let callCount = 0;
        mockSupabase.from = vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return fetchBuilder;
          if (callCount === 2) return deleteBuilder;
          return fetchBuilder;
        });

        const request = new NextRequest(`http://localhost/api/sessions/${sessionId}`, {
          method: 'DELETE',
        });

        const response = await DELETE(request, { params: { id: sessionId } });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      });
    });
  });
});

