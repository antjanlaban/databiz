import { describe, it, expect } from 'vitest';
import { analyzeEANs } from '@/lib/eanAnalyzer';
import { createMockFile } from '@/tests/utils/test-helpers';

describe('eanAnalyzer', () => {
  describe('analyzeEANs', () => {
    it('should analyze EANs with all unique codes', async () => {
      const csvContent = `ean,name,price
8712345678901,Product A,15.99
8712345678902,Product B,25.50
8712345678903,Product C,35.00
8712345678904,Product D,45.00
8712345678905,Product E,55.00`;
      const file = createMockFile('test.csv', csvContent, 'text/csv');

      const result = await analyzeEANs(file, 'ean');

      expect(result.uniqueCount).toBe(5);
      expect(result.duplicateCount).toBe(0);
      expect(result.totalEANs).toBe(5);
    });

    it('should detect duplicates in EAN codes', async () => {
      const csvContent = `ean,name,price
8712345678901,Product A,15.99
8712345678902,Product B,25.50
8712345678901,Product A Duplicate,15.99
8712345678903,Product C,35.00
8712345678902,Product B Duplicate,25.50
8712345678904,Product D,45.00`;
      const file = createMockFile('test.csv', csvContent, 'text/csv');

      const result = await analyzeEANs(file, 'ean');

      expect(result.uniqueCount).toBe(4); // 4 unique codes
      expect(result.duplicateCount).toBe(2); // 2 codes that appear more than once
      expect(result.totalEANs).toBe(6); // Total valid EAN codes
    });

    it('should handle empty file', async () => {
      const csvContent = `ean,name,price`;
      const file = createMockFile('test.csv', csvContent, 'text/csv');

      const result = await analyzeEANs(file, 'ean');

      expect(result.uniqueCount).toBe(0);
      expect(result.duplicateCount).toBe(0);
      expect(result.totalEANs).toBe(0);
    });

    it('should filter out invalid EAN codes', async () => {
      const csvContent = `ean,name,price
8712345678901,Product A,15.99
invalid,Product B,25.50
8712345678902,Product C,35.00
too-short,Product D,45.00
8712345678903,Product E,55.00`;
      const file = createMockFile('test.csv', csvContent, 'text/csv');

      const result = await analyzeEANs(file, 'ean');

      expect(result.uniqueCount).toBe(3); // Only valid codes
      expect(result.duplicateCount).toBe(0);
      expect(result.totalEANs).toBe(3); // Invalid codes filtered out
    });

    it('should handle EAN codes with whitespace', async () => {
      const csvContent = `ean,name,price
 8712345678901 ,Product A,15.99
8712345678902,Product B,25.50`;
      const file = createMockFile('test.csv', csvContent, 'text/csv');

      const result = await analyzeEANs(file, 'ean');

      // Whitespace should be trimmed, so should still work
      expect(result.totalEANs).toBeGreaterThanOrEqual(1);
    });

    it('should count multiple occurrences of same EAN correctly', async () => {
      const csvContent = `ean,name,price
8712345678901,Product A,15.99
8712345678901,Product A Again,15.99
8712345678901,Product A Third,15.99
8712345678902,Product B,25.50`;
      const file = createMockFile('test.csv', csvContent, 'text/csv');

      const result = await analyzeEANs(file, 'ean');

      expect(result.uniqueCount).toBe(2); // 2 unique codes
      expect(result.duplicateCount).toBe(1); // 1 code appears more than once
      expect(result.totalEANs).toBe(4); // Total occurrences
    });
  });
});


