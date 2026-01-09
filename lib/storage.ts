import { getSupabaseServer } from './supabase-server';
import { 
  STORAGE_BUCKET_NAME, 
  STORAGE_INCOMING_FOLDER, 
  STORAGE_PROCESSING_FOLDER,
  STORAGE_APPROVED_FOLDER,
  STORAGE_REJECTED_FOLDER,
  UploadErrorCode 
} from './upload-constants';
import { sanitizeFileName } from './fileValidation';

// Re-export constants for convenience
export { 
  STORAGE_BUCKET_NAME,
  STORAGE_INCOMING_FOLDER,
  STORAGE_PROCESSING_FOLDER,
  STORAGE_APPROVED_FOLDER,
  STORAGE_REJECTED_FOLDER
} from './upload-constants';

/**
 * Ensure the storage bucket exists, create it if it doesn't
 * @param bucketName Name of the bucket
 * @throws Error if bucket creation fails
 */
export async function ensureBucketExists(bucketName: string = STORAGE_BUCKET_NAME): Promise<void> {
  const supabase = getSupabaseServer();

  try {
    // Check if bucket exists by trying to list it
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      throw new Error(`Failed to list buckets: ${listError.message}`);
    }

    const bucketExists = buckets?.some((bucket) => bucket.name === bucketName);

    if (!bucketExists) {
      // Create bucket with private access
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: false, // Private bucket
        allowedMimeTypes: null, // Allow all file types for now
        fileSizeLimit: 52428800, // 50MB limit
      });

      if (createError) {
        throw new Error(
          `Failed to create storage bucket '${bucketName}': ${createError.message}`
        );
      }
    }
  } catch (error) {
    throw new Error(
      `Storage bucket error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Construct storage path for file
 * Format: {folder}/{sessionId}/{sanitizedFilename}
 * @param sessionId Session UUID
 * @param filename Original filename
 * @param folder Folder name (defaults to 'incoming')
 * @returns Storage path
 */
export function constructStoragePath(
  sessionId: string, 
  filename: string, 
  folder: string = STORAGE_INCOMING_FOLDER
): string {
  const sanitized = sanitizeFileName(filename);
  return `${folder}/${sessionId}/${sanitized}`;
}

/**
 * Upload file to Supabase Storage
 * @param bucket Bucket name (defaults to STORAGE_BUCKET_NAME)
 * @param path Storage path (should be constructed using constructStoragePath)
 * @param file File to upload
 * @returns Storage path of uploaded file
 * @throws Error if upload fails
 */
export async function uploadFileToStorage(
  bucket: string = STORAGE_BUCKET_NAME,
  path: string,
  file: File
): Promise<string> {
  const supabase = getSupabaseServer();

  try {
    // Ensure bucket exists first
    await ensureBucketExists(bucket);

    // Log upload start for large files
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    console.log(`[Storage] Starting upload: ${fileSizeMB}MB to ${path}`);

    // Convert File to ArrayBuffer for upload
    const fileBuffer = await file.arrayBuffer();
    console.log(`[Storage] File converted to buffer: ${fileBuffer.byteLength} bytes`);

    // Upload file with explicit timeout handling
    const uploadStartTime = Date.now();
    const { data, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
        cacheControl: '3600',
      });

    const uploadDuration = ((Date.now() - uploadStartTime) / 1000).toFixed(2);

    if (uploadError) {
      console.error(`[Storage] Upload failed after ${uploadDuration}s:`, uploadError);
      
      // Detect specific error types
      const errorMessage = uploadError.message || String(uploadError);
      
      if (errorMessage.includes('fetch failed') || 
          errorMessage.includes('timeout') ||
          errorMessage.includes('network') ||
          errorMessage.includes('ECONNRESET') ||
          errorMessage.includes('ETIMEDOUT')) {
        throw new Error(
          `Network error during upload. The file (${fileSizeMB}MB) may be too large or the connection timed out. ` +
          `Please try again or contact support if the problem persists. ` +
          `Original error: ${errorMessage}`
        );
      }
      
      throw new Error(`Storage upload failed: ${errorMessage}`);
    }

    if (!data?.path) {
      throw new Error('Storage upload succeeded but no path returned');
    }

    console.log(`[Storage] Upload completed in ${uploadDuration}s: ${data.path}`);
    return data.path;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    
    // Enhanced error logging
    console.error(`[Storage] Upload error for ${path}:`, {
      error: errorMessage,
      fileSize: file.size,
      fileSizeMB: (file.size / (1024 * 1024)).toFixed(2),
    });
    
    // Re-throw with enhanced message for network errors
    if (errorMessage.includes('Network error') || 
        errorMessage.includes('timeout') ||
        errorMessage.includes('fetch failed')) {
      throw error; // Already has enhanced message
    }
    
    throw new Error(`Failed to upload file to storage: ${errorMessage}`);
  }
}

/**
 * Download file from Supabase Storage
 * @param bucket Bucket name (defaults to STORAGE_BUCKET_NAME)
 * @param path Storage path to download
 * @returns Blob containing the file data
 * @throws Error if download fails
 */
export async function downloadFileFromStorage(
  bucket: string = STORAGE_BUCKET_NAME,
  path: string
): Promise<Blob> {
  const supabase = getSupabaseServer();

  if (!path) {
    throw new Error('Storage path is required for download');
  }

  try {
    console.log(`[Storage] Downloading file from bucket "${bucket}": ${path}`);

    const { data, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(path);

    if (downloadError) {
      const errorMessage = downloadError.message || String(downloadError);
      console.error(`[Storage] Download error for ${path}:`, {
        error: errorMessage,
        statusCode: (downloadError as any).statusCode,
      });

      if (
        errorMessage.includes('not found') ||
        errorMessage.includes('does not exist') ||
        errorMessage.includes('No such file') ||
        (downloadError as any).statusCode === 404
      ) {
        throw new Error(`File not found in storage: ${path}`);
      }

      throw new Error(`Failed to download file from storage: ${errorMessage}`);
    }

    if (!data) {
      throw new Error('Download succeeded but no data returned');
    }

    console.log(`[Storage] File downloaded successfully: ${path} (${data.size} bytes)`);
    return data;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    console.error(`[Storage] Download exception for ${path}:`, {
      error: errorMessage,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
    });

    // Re-throw with context if not already an Error with message
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(`Failed to download file from storage: ${errorMessage}`);
  }
}

/**
 * Delete file from Supabase Storage
 * @param bucket Bucket name (defaults to STORAGE_BUCKET_NAME)
 * @param path Storage path to delete
 * @returns void
 * @throws Error if delete fails (but gracefully handles file not found)
 */
export async function deleteFileFromStorage(
  bucket: string = STORAGE_BUCKET_NAME,
  path: string
): Promise<void> {
  const supabase = getSupabaseServer();

  if (!path) {
    // No path provided, nothing to delete - this is not an error
    return;
  }

  try {
    console.log(`[Storage] Deleting file from bucket "${bucket}": ${path}`);
    
    const { data, error: deleteError } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (deleteError) {
      // Log full error details for debugging
      const errorMessage = deleteError.message || String(deleteError);
      const errorDetails = {
        message: errorMessage,
        statusCode: (deleteError as any).statusCode,
        error: deleteError,
        path,
        bucket,
      };
      
      console.error(`[Storage] Delete error details:`, errorDetails);
      
      // If file doesn't exist, that's okay - it may have been deleted already
      // Log as warning but don't throw error
      if (
        errorMessage.includes('not found') || 
        errorMessage.includes('does not exist') ||
        errorMessage.includes('No such file') ||
        (deleteError as any).statusCode === 404
      ) {
        console.warn(`[Storage] File not found (may already be deleted): ${path}`);
        return; // Graceful handling - file doesn't exist, consider it successful
      }
      
      // For other errors, log full details and throw
      console.error(`[Storage] Delete FAILED for ${path}:`, {
        error: errorMessage,
        statusCode: (deleteError as any).statusCode,
        fullError: deleteError,
      });
      throw new Error(`Failed to delete file from storage: ${errorMessage}`);
    }

    // Log deletion result
    if (!data) {
      console.warn(`[Storage] Delete completed but no data returned for: ${path}`);
    } else {
      console.log(`[Storage] File deleted successfully: ${path}`, { 
        deletedFiles: data,
        bucket,
        path,
      });
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    
    console.error(`[Storage] Delete exception for ${path}:`, {
      error: errorMessage,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to delete file from storage: ${errorMessage}`);
  }
}

/**
 * Move file within Supabase Storage
 * @param bucket Bucket name (defaults to STORAGE_BUCKET_NAME)
 * @param oldPath Current storage path
 * @param newPath New storage path
 * @returns New storage path
 * @throws Error if move fails
 */
export async function moveFileInStorage(
  bucket: string = STORAGE_BUCKET_NAME,
  oldPath: string,
  newPath: string
): Promise<string> {
  const supabase = getSupabaseServer();

  if (!oldPath) {
    throw new Error('Old storage path is required for move operation');
  }

  if (!newPath) {
    throw new Error('New storage path is required for move operation');
  }

  if (oldPath === newPath) {
    console.log(`[Storage] File already at target path: ${newPath}`);
    return newPath;
  }

  try {
    console.log(`[Storage] Moving file from "${oldPath}" to "${newPath}"`);

    // Download file from old path
    const fileBlob = await downloadFileFromStorage(bucket, oldPath);

    // Upload file to new path
    const fileBuffer = await fileBlob.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(newPath, fileBuffer, {
        contentType: fileBlob.type || 'application/octet-stream',
        upsert: false,
        cacheControl: '3600',
      });

    if (uploadError) {
      const errorMessage = uploadError.message || String(uploadError);
      console.error(`[Storage] Upload to new path failed:`, errorMessage);
      throw new Error(`Failed to upload file to new path: ${errorMessage}`);
    }

    if (!uploadData?.path) {
      throw new Error('Upload to new path succeeded but no path returned');
    }

    // Delete old file (gracefully handle if already deleted)
    try {
      await deleteFileFromStorage(bucket, oldPath);
      console.log(`[Storage] Old file deleted: ${oldPath}`);
    } catch (deleteError) {
      // Log warning but don't fail - file might already be deleted
      console.warn(`[Storage] Failed to delete old file (may already be deleted): ${oldPath}`, deleteError);
    }

    console.log(`[Storage] File moved successfully from "${oldPath}" to "${newPath}"`);
    return uploadData.path;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Storage] Move exception from "${oldPath}" to "${newPath}":`, {
      error: errorMessage,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
    });
    throw new Error(`Failed to move file in storage: ${errorMessage}`);
  }
}

/**
 * Move file to processing folder
 * @param sessionId Session UUID
 * @param filename Original filename
 * @param currentPath Current storage path
 * @returns New storage path in processing folder
 * @throws Error if move fails
 */
export async function moveToProcessing(
  sessionId: string,
  filename: string,
  currentPath: string
): Promise<string> {
  const newPath = constructStoragePath(sessionId, filename, STORAGE_PROCESSING_FOLDER);
  return await moveFileInStorage(STORAGE_BUCKET_NAME, currentPath, newPath);
}

/**
 * Move file to approved folder
 * @param sessionId Session UUID
 * @param filename Original filename
 * @param currentPath Current storage path
 * @returns New storage path in approved folder
 * @throws Error if move fails
 */
export async function moveToApproved(
  sessionId: string,
  filename: string,
  currentPath: string
): Promise<string> {
  const newPath = constructStoragePath(sessionId, filename, STORAGE_APPROVED_FOLDER);
  return await moveFileInStorage(STORAGE_BUCKET_NAME, currentPath, newPath);
}

/**
 * Move file to rejected folder
 * @param sessionId Session UUID
 * @param filename Original filename
 * @param currentPath Current storage path
 * @returns New storage path in rejected folder
 * @throws Error if move fails
 */
export async function moveToRejected(
  sessionId: string,
  filename: string,
  currentPath: string
): Promise<string> {
  const newPath = constructStoragePath(sessionId, filename, STORAGE_REJECTED_FOLDER);
  return await moveFileInStorage(STORAGE_BUCKET_NAME, currentPath, newPath);
}

