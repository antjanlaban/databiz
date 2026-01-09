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
 * DELETE /api/sessions/[id]
 * Delete an import session and its associated file from Storage
 * 
 * @param request - NextRequest object
 * @param params - Route parameters containing session ID
 * @returns NextResponse with success or error
 * 
 * This endpoint:
 * 1. Retrieves the session from the database
 * 2. Deletes the file from Storage (if file_storage_path exists) - gracefully handles missing files
 * 3. Deletes the database record (CASCADE delete automatically removes related ean_conflicts)
 * 
 * Error codes:
 * - SESSION_NOT_FOUND (404): Session does not exist
 * - STORAGE_DELETE_FAILED (500): Storage deletion failed (but continues with DB delete)
 * - SESSION_DELETE_FAILED (500): Database deletion failed
 * 
 * @example
 * DELETE /api/sessions/123
 * 
 * Success response (200):
 * {
 *   "success": true,
 *   "message": "Session deleted successfully"
 * }
 * 
 * Error response (404):
 * {
 *   "success": false,
 *   "error": "SESSION_NOT_FOUND",
 *   "message": "Import session not found"
 * }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseServer();
    const { id: sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: UploadErrorCode.SESSION_NOT_FOUND,
          message: getErrorMessage(UploadErrorCode.SESSION_NOT_FOUND),
        },
        { status: 400 }
      );
    }

    // Step 1: Retrieve session from database to get file_storage_path
    const { data: session, error: fetchError } = await supabase
      .from('import_sessions')
      .select('id, file_storage_path')
      .eq('id', sessionId)
      .single();

    if (fetchError) {
      // Check if it's a "not found" error
      if (fetchError.code === 'PGRST116' || !session) {
        return NextResponse.json(
          {
            success: false,
            error: UploadErrorCode.SESSION_NOT_FOUND,
            message: getErrorMessage(UploadErrorCode.SESSION_NOT_FOUND),
          },
          { status: 404 }
        );
      }

      // Other database errors
      const errorMessage = (fetchError as any)?.message || String(fetchError) || 'Unknown error';
      return NextResponse.json(
        {
          success: false,
          error: UploadErrorCode.DATABASE_ERROR,
          message: `Failed to fetch session: ${errorMessage}`,
        },
        { status: 500 }
      );
    }

    // Step 2: Delete file from Storage (if path exists)
    let storageDeleteSucceeded = false;
    let storageDeleteError: string | null = null;
    
    if (session.file_storage_path) {
      try {
        console.log(`[Delete Session ${sessionId}] Attempting to delete Storage file: ${session.file_storage_path}`);
        await deleteFileFromStorage(STORAGE_BUCKET_NAME, session.file_storage_path);
        storageDeleteSucceeded = true;
        console.log(`[Delete Session ${sessionId}] Storage file deleted successfully: ${session.file_storage_path}`);
      } catch (storageError) {
        // Log detailed error for debugging
        const errorMessage = storageError instanceof Error ? storageError.message : String(storageError);
        storageDeleteError = errorMessage;
        console.error(
          `[Delete Session ${sessionId}] Storage delete FAILED:`,
          {
            path: session.file_storage_path,
            error: errorMessage,
            errorType: storageError instanceof Error ? storageError.constructor.name : typeof storageError,
          }
        );
        
        // Continue with database delete but log the failure
        // This ensures database integrity even if Storage fails
      }
    } else {
      console.log(`[Delete Session ${sessionId}] No file_storage_path - skipping Storage delete`);
    }

    // Step 3: Delete database record
    // CASCADE DELETE will automatically remove related ean_conflicts records
    const { error: deleteError } = await supabase
      .from('import_sessions')
      .delete()
      .eq('id', sessionId);

    if (deleteError) {
      return NextResponse.json(
        {
          success: false,
          error: UploadErrorCode.SESSION_DELETE_FAILED,
          message: `Failed to delete session: ${deleteError.message}`,
        },
        { status: 500 }
      );
    }

    // Step 4: Return success response
    // Include Storage delete status in response for debugging
    const response: {
      success: boolean;
      message: string;
      storageDeleted?: boolean;
      storageError?: string;
    } = {
      success: true,
      message: 'Session deleted successfully',
    };

    if (session.file_storage_path) {
      response.storageDeleted = storageDeleteSucceeded;
      if (storageDeleteError) {
        response.storageError = storageDeleteError;
        // Log to server but don't fail the request
        console.error(
          `[Delete Session ${sessionId}] WARNING: Database deleted but Storage delete failed. ` +
          `File may still exist in Storage: ${session.file_storage_path}`
        );
      }
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in delete session route:', error);
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

