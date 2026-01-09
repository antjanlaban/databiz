import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import {
  validateFileExtension,
  validateFileSize,
  calculateFileHash,
  getFileType,
} from '@/lib/fileValidation';
import {
  uploadFileToStorage,
  constructStoragePath,
} from '@/lib/storage';
import {
  UploadErrorCode,
  STORAGE_BUCKET_NAME,
  getErrorMessage,
} from '@/lib/upload-constants';
import { randomUUID } from 'crypto';

// Configure timeout for large file uploads (5 minutes)
export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Explicit runtime for better large file handling

/**
 * POST /api/upload
 * Upload a file, validate it, check for duplicates, and store in Supabase Storage
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServer();

    // Check Content-Type header (should include multipart/form-data, possibly with boundary)
    const contentType = request.headers.get('content-type') || '';
    console.log('[Upload] Content-Type:', contentType);
    console.log('[Upload] Request method:', request.method);
    console.log('[Upload] Request URL:', request.url);
    
    // Accept multipart/form-data with or without boundary parameter
    if (!contentType.includes('multipart/form-data')) {
      console.error('[Upload] Invalid Content-Type:', contentType);
      return NextResponse.json(
        {
          success: false,
          error: UploadErrorCode.FILE_NOT_PROVIDED,
          message: `Invalid Content-Type. Expected multipart/form-data, got: ${contentType || 'none'}`,
        },
        { status: 400 }
      );
    }

    // Extract file from FormData
    // In Next.js 16, we should use the request directly, not clone it
    // Cloning can cause issues with large files
    let formData: FormData;
    try {
      // Directly parse FormData from request (Next.js handles this correctly)
      formData = await request.formData();
      console.log('[Upload] FormData parsed successfully');
    } catch (error) {
      console.error('[Upload] Failed to parse FormData:', error);
      if (error instanceof Error) {
        console.error('[Upload] Error details:', error.message);
        console.error('[Upload] Error stack:', error.stack);
      }
      
      // Check if body was already consumed (for debugging)
      const bodyUsed = (request as any).bodyUsed;
      console.error('[Upload] Request body used:', bodyUsed);
      console.error('[Upload] Content-Type header:', contentType);
      console.error('[Upload] Content-Length header:', request.headers.get('content-length'));
      
      return NextResponse.json(
        {
          success: false,
          error: UploadErrorCode.FILE_NOT_PROVIDED,
          message: `Failed to parse body as FormData: ${error instanceof Error ? error.message : String(error)}. Please ensure the file is a valid CSV or Excel file.`,
        },
        { status: 400 }
      );
    }
    
    const file = formData.get('file') as File | null;

    if (!file) {
      console.error('[Upload] No file found in FormData');
      return NextResponse.json(
        {
          success: false,
          error: UploadErrorCode.FILE_NOT_PROVIDED,
          message: getErrorMessage(UploadErrorCode.FILE_NOT_PROVIDED),
        },
        { status: 400 }
      );
    }

    console.log('[Upload] File received:', {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    // Step 1: Validate file extension
    const extensionValidation = validateFileExtension(file);
    if (!extensionValidation.valid) {
      console.error('[Upload] File extension validation failed:', {
        fileName: file.name,
        error: extensionValidation.error,
        errorCode: extensionValidation.errorCode,
      });
      return NextResponse.json(
        {
          success: false,
          error: extensionValidation.errorCode,
          message: extensionValidation.error,
        },
        { status: 400 }
      );
    }

    // Step 2: Validate file size
    const sizeValidation = validateFileSize(file);
    if (!sizeValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: sizeValidation.errorCode,
          message: sizeValidation.error,
        },
        { status: 400 }
      );
    }

    // Step 3: Calculate SHA256 hash
    let fileHash: string;
    try {
      fileHash = await calculateFileHash(file);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: UploadErrorCode.HASH_CALCULATION_FAILED,
          message: getErrorMessage(UploadErrorCode.HASH_CALCULATION_FAILED),
        },
        { status: 500 }
      );
    }

    // Step 4: Check for duplicate hash in database
    const { data: existingSession, error: duplicateError } = await supabase
      .from('import_sessions')
      .select('id, file_name, uploaded_at')
      .eq('file_hash', fileHash)
      .single();

    if (duplicateError && duplicateError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is expected for new files
      return NextResponse.json(
        {
          success: false,
          error: UploadErrorCode.DATABASE_ERROR,
          message: `Database error while checking for duplicates: ${duplicateError.message}`,
        },
        { status: 500 }
      );
    }

    if (existingSession) {
      // Duplicate file found
      return NextResponse.json(
        {
          success: false,
          error: UploadErrorCode.DUPLICATE_FILE,
          message: getErrorMessage(UploadErrorCode.DUPLICATE_FILE),
          existingSessionId: existingSession.id,
          uploadedAt: existingSession.uploaded_at,
        },
        { status: 409 }
      );
    }

    // Step 5: Generate session ID and determine file type
    const sessionId = randomUUID();
    const fileType = getFileType(file.name);

    if (!fileType) {
      return NextResponse.json(
        {
          success: false,
          error: UploadErrorCode.FILE_EXTENSION_INVALID,
          message: getErrorMessage(UploadErrorCode.FILE_EXTENSION_INVALID),
        },
        { status: 400 }
      );
    }

    // Step 6: Create session record with status 'pending'
    const { data: newSession, error: createError } = await supabase
      .from('import_sessions')
      .insert({
        file_name: file.name,
        file_type: fileType,
        file_hash: fileHash,
        file_size_bytes: file.size,
        status: 'pending',
        total_rows: 0,
        processed_rows: 0,
        conflicts_count: 0,
      })
      .select()
      .single();

    if (createError || !newSession) {
      return NextResponse.json(
        {
          success: false,
          error: UploadErrorCode.DATABASE_ERROR,
          message: `Failed to create import session: ${createError?.message || 'Unknown error'}`,
        },
        { status: 500 }
      );
    }

    // Step 7: Update status to 'uploading' before storage upload
    await supabase
      .from('import_sessions')
      .update({ status: 'uploading' })
      .eq('id', newSession.id);

    // Step 8: Upload file to Storage
    let storagePath: string;
    try {
      const path = constructStoragePath(sessionId, file.name);
      storagePath = await uploadFileToStorage(STORAGE_BUCKET_NAME, path, file);
    } catch (error) {
      // Mark session as failed
      await supabase
        .from('import_sessions')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : String(error),
        })
        .eq('id', newSession.id);

      return NextResponse.json(
        {
          success: false,
          error: UploadErrorCode.STORAGE_UPLOAD_FAILED,
          message: error instanceof Error ? error.message : getErrorMessage(UploadErrorCode.STORAGE_UPLOAD_FAILED),
        },
        { status: 500 }
      );
    }

    // Step 9: Update session to 'parsing' status with storage path (triggers queue processing)
    const { error: updateError } = await supabase
      .from('import_sessions')
      .update({
        status: 'parsing',
        file_storage_path: storagePath,
        uploaded_at: new Date().toISOString(),
      })
      .eq('id', newSession.id);

    if (updateError) {
      // Session exists but update failed - this is a partial failure
      // The file is in Storage but session status is incorrect
      console.error('Failed to update session after storage upload:', updateError);
      // Continue and return success since file was uploaded
    }

    // Step 10: Automatically trigger queue processing (fire-and-forget)
    // This ensures files are parsed immediately after upload
    // Use fetch with no await - fire and forget to avoid blocking upload response
    (async () => {
      try {
        // Construct absolute URL for queue processing
        // In development, use localhost; in production, use the request origin
        const origin = 
          request.nextUrl.origin || 
          process.env.NEXT_PUBLIC_APP_URL || 
          (process.env.NODE_ENV === 'production' 
            ? 'https://your-domain.com' 
            : 'http://localhost:3000');
        const queueUrl = `${origin}/api/process-queue`;
        
        console.log('[Upload] Triggering queue processing:', queueUrl, 'for session:', newSession.id);
        
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        try {
          const response = await fetch(queueUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            // Add cache control to prevent caching
            cache: 'no-store',
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[Upload] Queue processing failed:', response.status, errorData);
          } else {
            const data = await response.json().catch(() => ({}));
            console.log('[Upload] Queue processing triggered successfully:', data);
          }
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error) {
        // Log error but don't fail the upload - queue processing can be triggered manually if needed
        console.error('[Upload] Failed to trigger queue processing:', error);
        if (error instanceof Error) {
          console.error('[Upload] Error details:', error.message, error.stack);
        }
      }
    })();

    // Step 11: Return success response
    return NextResponse.json(
      {
        success: true,
        sessionId: newSession.id,
        fileName: file.name,
        fileSize: file.size,
        storagePath: storagePath,
        message: 'File uploaded successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in upload route:', error);
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

