/**
 * Test utilities and helpers
 */

import { UploadErrorCode } from '@/lib/upload-constants';

/**
 * Create a mock File object for testing
 */
export function createMockFile(
  name: string,
  content: string | Blob,
  type: string = 'text/csv'
): File {
  const blob = typeof content === 'string' ? new Blob([content], { type }) : content;
  return new File([blob], name, { type });
}

/**
 * Create a CSV content string for testing
 */
export function createTestCSV(rows: Array<Record<string, string | number>>): string {
  if (rows.length === 0) {
    return '';
  }

  const headers = Object.keys(rows[0]);
  const headerRow = headers.join(',');
  const dataRows = rows.map((row) => headers.map((header) => row[header]).join(','));
  
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Create test product data
 */
export function createTestProducts(count: number = 3) {
  return Array.from({ length: count }, (_, i) => ({
    ean: `871234567890${i + 1}`,
    name: `Product ${i + 1}`,
    price: (10 + i * 5).toFixed(2),
    supplier: `Supplier ${(i % 2) + 1}`,
  }));
}

/**
 * Helper to wait for async operations
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock Supabase client error response
 */
export function createSupabaseError(message: string, code?: string) {
  return {
    error: {
      message,
      code: code || 'UNKNOWN_ERROR',
      details: null,
      hint: null,
    },
    data: null,
    count: null,
    status: 400,
    statusText: 'Bad Request',
  };
}

/**
 * Mock Supabase client success response
 */
export function createSupabaseSuccess<T>(data: T) {
  return {
    data,
    error: null,
    count: null,
    status: 200,
    statusText: 'OK',
  };
}

