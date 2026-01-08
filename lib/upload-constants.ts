/**
 * Error codes and constants for file upload functionality
 */

export enum UploadErrorCode {
  FILE_NOT_PROVIDED = 'FILE_NOT_PROVIDED',
  FILE_EXTENSION_INVALID = 'FILE_EXTENSION_INVALID',
  FILE_SIZE_EXCEEDED = 'FILE_SIZE_EXCEEDED',
  FILE_INVALID = 'FILE_INVALID',
  DUPLICATE_FILE = 'DUPLICATE_FILE',
  STORAGE_UPLOAD_FAILED = 'STORAGE_UPLOAD_FAILED',
  STORAGE_BUCKET_ERROR = 'STORAGE_BUCKET_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  HASH_CALCULATION_FAILED = 'HASH_CALCULATION_FAILED',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  STORAGE_DELETE_FAILED = 'STORAGE_DELETE_FAILED',
  SESSION_DELETE_FAILED = 'SESSION_DELETE_FAILED',
}

export const MAX_FILE_SIZE_MB = 50;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024; // 52,428,800 bytes

export const ALLOWED_FILE_EXTENSIONS = ['.csv', '.xlsx', '.xls'] as const;
export const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
] as const;

export const STORAGE_BUCKET_NAME = 'supplier-uploads';
export const STORAGE_INCOMING_FOLDER = 'incoming';
export const STORAGE_PROCESSING_FOLDER = 'processing';
export const STORAGE_APPROVED_FOLDER = 'approved';
export const STORAGE_REJECTED_FOLDER = 'rejected';

/**
 * Get user-friendly error message for error code
 */
export function getErrorMessage(code: UploadErrorCode, details?: string): string {
  const messages: Record<UploadErrorCode, string> = {
    [UploadErrorCode.FILE_NOT_PROVIDED]: 'No file provided in request',
    [UploadErrorCode.FILE_EXTENSION_INVALID]: `Invalid file extension. Allowed extensions: ${ALLOWED_FILE_EXTENSIONS.join(', ')}`,
    [UploadErrorCode.FILE_SIZE_EXCEEDED]: `File size exceeds maximum of ${MAX_FILE_SIZE_MB}MB`,
    [UploadErrorCode.FILE_INVALID]: details || 'File is invalid or empty',
    [UploadErrorCode.DUPLICATE_FILE]: 'This exact file has already been uploaded',
    [UploadErrorCode.STORAGE_UPLOAD_FAILED]: 'Failed to upload file to storage',
    [UploadErrorCode.STORAGE_BUCKET_ERROR]: 'Storage bucket error occurred',
    [UploadErrorCode.DATABASE_ERROR]: 'Database operation failed',
    [UploadErrorCode.HASH_CALCULATION_FAILED]: 'Failed to calculate file hash',
    [UploadErrorCode.SESSION_NOT_FOUND]: 'Import session not found',
    [UploadErrorCode.STORAGE_DELETE_FAILED]: 'Failed to delete file from storage',
    [UploadErrorCode.SESSION_DELETE_FAILED]: 'Failed to delete import session',
  };

  return messages[code] || 'An unknown error occurred';
}

