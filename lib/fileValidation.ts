import {
  UploadErrorCode,
  ALLOWED_FILE_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  getErrorMessage,
} from './upload-constants';

/**
 * Validation result for file validation operations
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: UploadErrorCode;
}

/**
 * Validate file extension
 */
export function validateFileExtension(file: File): ValidationResult {
  const fileName = file.name.toLowerCase();
  const extension = fileName.substring(fileName.lastIndexOf('.'));

  if (!ALLOWED_FILE_EXTENSIONS.includes(extension as any)) {
    return {
      valid: false,
      error: getErrorMessage(UploadErrorCode.FILE_EXTENSION_INVALID),
      errorCode: UploadErrorCode.FILE_EXTENSION_INVALID,
    };
  }

  return { valid: true };
}

/**
 * Validate file size
 */
export function validateFileSize(file: File, maxSizeBytes: number = MAX_FILE_SIZE_BYTES): ValidationResult {
  if (file.size === 0) {
    return {
      valid: false,
      error: getErrorMessage(UploadErrorCode.FILE_INVALID, 'File is empty'),
      errorCode: UploadErrorCode.FILE_INVALID,
    };
  }

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: getErrorMessage(UploadErrorCode.FILE_SIZE_EXCEEDED),
      errorCode: UploadErrorCode.FILE_SIZE_EXCEEDED,
    };
  }

  return { valid: true };
}

/**
 * Calculate SHA256 hash of a file
 * Works in both browser and Node.js environments
 */
export async function calculateFileHash(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    
    // Use Web Crypto API (available in Node.js 18+ and browsers)
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  } catch (error) {
    throw new Error(`Hash calculation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Sanitize filename by removing special characters and path traversal attempts
 * Preserves the file extension
 */
export function sanitizeFileName(filename: string): string {
  // Extract extension
  const lastDot = filename.lastIndexOf('.');
  const nameWithoutExt = lastDot > 0 ? filename.substring(0, lastDot) : filename;
  const extension = lastDot > 0 ? filename.substring(lastDot) : '';

  // Remove path separators and special characters
  // Replace spaces with hyphens
  // Remove path traversal attempts
  let sanitized = nameWithoutExt
    .replace(/[/\\?%*:|"<>@#$()]/g, '') // Remove forbidden and special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/\.\./g, '') // Remove path traversal
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .toLowerCase();

  // Ensure we have at least one character for the name
  if (!sanitized) {
    sanitized = 'file';
  }

  return sanitized + extension.toLowerCase();
}

/**
 * Extract file type from filename
 */
export function getFileType(filename: string): 'csv' | 'xlsx' | null {
  const fileName = filename.toLowerCase();
  const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

  if (extension === '.csv') {
    return 'csv';
  } else if (extension === '.xlsx' || extension === '.xls') {
    return 'xlsx';
  }

  return null;
}

