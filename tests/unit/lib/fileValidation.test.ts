import { describe, it, expect } from 'vitest';
import {
  validateFileExtension,
  validateFileSize,
  calculateFileHash,
  sanitizeFileName,
  getFileType,
} from '@/lib/fileValidation';
import { UploadErrorCode, MAX_FILE_SIZE_BYTES } from '@/lib/upload-constants';
import { createMockFile } from '@/tests/utils/test-helpers';

describe('fileValidation', () => {
  describe('validateFileExtension', () => {
    it('should accept .csv files', () => {
      const file = createMockFile('test.csv', 'test content');
      const result = validateFileExtension(file);
      expect(result.valid).toBe(true);
    });

    it('should accept .xlsx files', () => {
      const file = createMockFile('test.xlsx', 'test content');
      const result = validateFileExtension(file);
      expect(result.valid).toBe(true);
    });

    it('should accept .xls files', () => {
      const file = createMockFile('test.xls', 'test content');
      const result = validateFileExtension(file);
      expect(result.valid).toBe(true);
    });

    it('should reject .txt files', () => {
      const file = createMockFile('test.txt', 'test content');
      const result = validateFileExtension(file);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(UploadErrorCode.FILE_EXTENSION_INVALID);
    });

    it('should reject .pdf files', () => {
      const file = createMockFile('test.pdf', 'test content');
      const result = validateFileExtension(file);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(UploadErrorCode.FILE_EXTENSION_INVALID);
    });

    it('should be case-insensitive', () => {
      const file1 = createMockFile('TEST.CSV', 'test content');
      const file2 = createMockFile('Test.Xlsx', 'test content');
      
      expect(validateFileExtension(file1).valid).toBe(true);
      expect(validateFileExtension(file2).valid).toBe(true);
    });

    it('should handle files without extension', () => {
      const file = createMockFile('test', 'test content');
      const result = validateFileExtension(file);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('should accept files within size limit', () => {
      const file = createMockFile('test.csv', 'a'.repeat(1024)); // 1KB
      const result = validateFileSize(file);
      expect(result.valid).toBe(true);
    });

    it('should accept files at exactly the size limit', () => {
      const content = new Blob(['a'.repeat(MAX_FILE_SIZE_BYTES)]);
      const file = createMockFile('test.csv', content);
      const result = validateFileSize(file, MAX_FILE_SIZE_BYTES);
      expect(result.valid).toBe(true);
    });

    it('should reject files exceeding size limit', () => {
      const content = new Blob(['a'.repeat(MAX_FILE_SIZE_BYTES + 1)]);
      const file = createMockFile('test.csv', content);
      const result = validateFileSize(file);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(UploadErrorCode.FILE_SIZE_EXCEEDED);
    });

    it('should reject empty files', () => {
      const file = createMockFile('test.csv', '');
      const result = validateFileSize(file);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(UploadErrorCode.FILE_INVALID);
    });

    it('should accept custom max size', () => {
      const customMax = 1000; // 1KB
      const content = new Blob(['a'.repeat(500)]);
      const file = createMockFile('test.csv', content);
      const result = validateFileSize(file, customMax);
      expect(result.valid).toBe(true);
    });
  });

  describe('calculateFileHash', () => {
    it('should calculate SHA256 hash', async () => {
      const file = createMockFile('test.csv', 'test content');
      const hash = await calculateFileHash(file);
      
      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64); // SHA256 produces 64 hex characters
      expect(hash).toMatch(/^[a-f0-9]{64}$/); // Hex string
    });

    it('should produce same hash for same content', async () => {
      const content = 'test content';
      const file1 = createMockFile('test1.csv', content);
      const file2 = createMockFile('test2.csv', content);
      
      const hash1 = await calculateFileHash(file1);
      const hash2 = await calculateFileHash(file2);
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different content', async () => {
      const file1 = createMockFile('test.csv', 'content 1');
      const file2 = createMockFile('test.csv', 'content 2');
      
      const hash1 = await calculateFileHash(file1);
      const hash2 = await calculateFileHash(file2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty files', async () => {
      const file = createMockFile('empty.csv', '');
      const hash = await calculateFileHash(file);
      
      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64);
      // Empty file has known hash: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    });

    it('should handle large files', async () => {
      const largeContent = 'a'.repeat(1000000); // 1MB
      const file = createMockFile('large.csv', largeContent);
      const hash = await calculateFileHash(file);
      
      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64);
    });
  });

  describe('sanitizeFileName', () => {
    it('should preserve valid filenames', () => {
      expect(sanitizeFileName('test.csv')).toBe('test.csv');
      expect(sanitizeFileName('products.xlsx')).toBe('products.xlsx');
    });

    it('should remove path separators', () => {
      expect(sanitizeFileName('test/file.csv')).toBe('testfile.csv');
      expect(sanitizeFileName('path/to/file.csv')).toBe('pathtofile.csv');
    });

    it('should remove special characters', () => {
      expect(sanitizeFileName('test@file#name$.csv')).toBe('testfilenames.csv');
      expect(sanitizeFileName('test(file)name.csv')).toBe('testfilename.csv');
    });

    it('should replace spaces with hyphens', () => {
      expect(sanitizeFileName('test file.csv')).toBe('test-file.csv');
      expect(sanitizeFileName('my products file.csv')).toBe('my-products-file.csv');
    });

    it('should preserve extension', () => {
      expect(sanitizeFileName('test.csv')).toBe('test.csv');
      expect(sanitizeFileName('test.xlsx')).toBe('test.xlsx');
      expect(sanitizeFileName('test@file.xls')).toBe('testfile.xls');
    });

    it('should handle files without extension', () => {
      const result = sanitizeFileName('testfile');
      expect(result).toBeDefined();
      expect(result).toBe('testfile');
    });

    it('should convert to lowercase', () => {
      expect(sanitizeFileName('TEST.CSV')).toBe('test.csv');
      expect(sanitizeFileName('MyFile.XLSX')).toBe('myfile.xlsx');
    });

    it('should handle path traversal attempts', () => {
      expect(sanitizeFileName('../test.csv')).toBe('test.csv');
      expect(sanitizeFileName('../../file.csv')).toBe('file.csv');
      expect(sanitizeFileName('test/../file.csv')).toBe('testfile.csv');
    });

    it('should handle empty filename', () => {
      const result = sanitizeFileName('');
      expect(result).toBe('file'); // Should default to 'file'
    });

    it('should remove leading/trailing hyphens', () => {
      expect(sanitizeFileName('-test-.csv')).toBe('test.csv');
    });
  });

  describe('getFileType', () => {
    it('should return "csv" for .csv files', () => {
      expect(getFileType('test.csv')).toBe('csv');
      expect(getFileType('TEST.CSV')).toBe('csv');
      expect(getFileType('my-file.csv')).toBe('csv');
    });

    it('should return "xlsx" for .xlsx files', () => {
      expect(getFileType('test.xlsx')).toBe('xlsx');
      expect(getFileType('TEST.XLSX')).toBe('xlsx');
    });

    it('should return "xlsx" for .xls files', () => {
      expect(getFileType('test.xls')).toBe('xlsx');
      expect(getFileType('TEST.XLS')).toBe('xlsx');
    });

    it('should return null for invalid extensions', () => {
      expect(getFileType('test.txt')).toBeNull();
      expect(getFileType('test.pdf')).toBeNull();
      expect(getFileType('test')).toBeNull();
    });

    it('should handle files with multiple dots', () => {
      expect(getFileType('test.backup.csv')).toBe('csv');
      expect(getFileType('archive.old.xlsx')).toBe('xlsx');
    });
  });
});

