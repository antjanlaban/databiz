import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { deleteFileFromStorage } from '@/lib/storage';
import {
  UploadErrorCode,
  STORAGE_BUCKET_NAME,
  getErrorMessage,
} from '@/lib/upload-constants';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/storage/cleanup
 * Delete a file directly from Storage by path
 * 
 * This endpoint is useful for cleaning up orphaned files (files in Storage
 * without a corresponding database session) or manually removing files.
 * 
 * @param request - NextRequest with query parameter 'path'
 * @returns NextResponse with success or error
 * 
 * Query parameters:
 * - path (required): Storage path to delete (e.g., "incoming/session-id/file.csv")
 * 
 * @example
 * DELETE /api/storage/cleanup?path=incoming/123/file.csv
 * 
 * Success response (200):
 * {
 *   "success": true,
 *   "message": "File deleted successfully"
 * }
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json(
        {
          success: false,
          error: 'PATH_REQUIRED',
          message: 'Storage path query parameter is required',
        },
        { status: 400 }
      );
    }

    // Validate path format (should start with "incoming/")
    if (!path.startsWith('incoming/')) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_PATH',
          message: 'Storage path must start with "incoming/"',
        },
        { status: 400 }
      );
    }

    try {
      await deleteFileFromStorage(STORAGE_BUCKET_NAME, path);
      
      return NextResponse.json(
        {
          success: true,
          message: 'File deleted successfully',
          path: path,
        },
        { status: 200 }
      );
    } catch (storageError) {
      // Check if it's a "not found" error - that's actually okay
      const errorMessage = storageError instanceof Error ? storageError.message : String(storageError);
      
      if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
        return NextResponse.json(
          {
            success: true,
            message: 'File not found (may already be deleted)',
            path: path,
          },
          { status: 200 }
        );
      }
      
      return NextResponse.json(
        {
          success: false,
          error: UploadErrorCode.STORAGE_DELETE_FAILED,
          message: getErrorMessage(UploadErrorCode.STORAGE_DELETE_FAILED) + `: ${errorMessage}`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error in storage cleanup route:', error);
    return NextResponse.json(
      {
        success: false,
        error: UploadErrorCode.DATABASE_ERROR,
        message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 }
    );
  }
}

