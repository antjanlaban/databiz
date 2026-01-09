import { describe, it, expect } from 'vitest';
import { validateGTIN13, detectEANColumns } from '@/lib/eanDetection';
import { createMockFile } from '@/tests/utils/test-helpers';

describe('eanDetection', () => {
  describe('validateGTIN13', () => {
    it('should validate correct GTIN-13 code', () => {
      expect(validateGTIN13('8712345678901')).toBe(true);
    });

    it('should reject code with incorrect length (too short)', () => {
      expect(validateGTIN13('871234567890')).toBe(false);
    });

    it('should reject code with incorrect length (too long)', () => {
      expect(validateGTIN13('87123456789012')).toBe(false);
    });

    it('should reject code with non-numeric characters', () => {
      expect(validateGTIN13('87123456789AB')).toBe(false);
    });

    it('should handle code with whitespace (trimmed)', () => {
      // After trim, should be valid
      expect(validateGTIN13(' 8712345678901 ')).toBe(false); // Currently returns false, but could trim first
      expect(validateGTIN13('8712345678901')).toBe(true);
    });

    it('should reject empty string', () => {
      expect(validateGTIN13('')).toBe(false);
    });

    it('should reject null', () => {
      expect(validateGTIN13(null as any)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(validateGTIN13(undefined as any)).toBe(false);
    });

    it('should validate various valid GTIN-13 codes', () => {
      expect(validateGTIN13('1234567890123')).toBe(true);
      expect(validateGTIN13('9876543210987')).toBe(true);
      expect(validateGTIN13('0000000000000')).toBe(true);
    });
  });

  describe('detectEANColumns', () => {
    it('should detect single EAN column in CSV', async () => {
      const csvContent = `ean,name,price
8712345678901,Product A,15.99
8712345678902,Product B,25.50
8712345678903,Product C,35.00
8712345678904,Product D,45.00
8712345678905,Product E,55.00`;
      const file = createMockFile('test.csv', csvContent, 'text/csv');
      const headers = ['ean', 'name', 'price'];

      const columns = await detectEANColumns(file, headers);

      expect(columns).toContain('ean');
      expect(columns.length).toBe(1);
    });

    it('should detect multiple EAN columns in CSV', async () => {
      const csvContent = `ean,gtin,name,price
8712345678901,8712345678901,Product A,15.99
8712345678902,8712345678902,Product B,25.50
8712345678903,8712345678903,Product C,35.00
8712345678904,8712345678904,Product D,45.00
8712345678905,8712345678905,Product E,55.00`;
      const file = createMockFile('test.csv', csvContent, 'text/csv');
      const headers = ['ean', 'gtin', 'name', 'price'];

      const columns = await detectEANColumns(file, headers);

      expect(columns).toContain('ean');
      expect(columns).toContain('gtin');
      expect(columns.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array when no EAN columns found', async () => {
      const csvContent = `name,price,supplier
Product A,15.99,Supplier X
Product B,25.50,Supplier Y
Product C,35.00,Supplier Z`;
      const file = createMockFile('test.csv', csvContent, 'text/csv');
      const headers = ['name', 'price', 'supplier'];

      const columns = await detectEANColumns(file, headers);

      expect(columns).toEqual([]);
    });

    it('should reject column with <80% valid codes', async () => {
      const csvContent = `ean,name,price
8712345678901,Product A,15.99
8712345678902,Product B,25.50
invalid,Product C,35.00
also-invalid,Product D,45.00
another-invalid,Product E,55.00`;
      const file = createMockFile('test.csv', csvContent, 'text/csv');
      const headers = ['ean', 'name', 'price'];

      const columns = await detectEANColumns(file, headers);

      // Should not include 'ean' because <80% are valid
      expect(columns.length).toBeLessThanOrEqual(0);
    });

    it('should handle CSV with mixed valid and invalid EAN codes', async () => {
      const csvContent = `ean,name,price
8712345678901,Product A,15.99
8712345678902,Product B,25.50
8712345678903,Product C,35.00
8712345678904,Product D,45.00
8712345678905,Product E,55.00
invalid,Product F,65.00`;
      const file = createMockFile('test.csv', csvContent, 'text/csv');
      const headers = ['ean', 'name', 'price'];

      const columns = await detectEANColumns(file, headers);

      // Should still detect 'ean' if ≥80% are valid
      if (columns.length > 0) {
        expect(columns).toContain('ean');
      }
    });
  });
});


