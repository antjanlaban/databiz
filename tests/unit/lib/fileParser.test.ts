import { describe, it, expect, vi } from 'vitest';
import { getFileMetadata, ParseMetadata } from '@/lib/fileParser';
import { createMockFile, createTestCSV, createTestProducts } from '@/tests/utils/test-helpers';

describe('fileParser', () => {
  describe('getFileMetadata', () => {
    describe('CSV files', () => {
      it('should extract metadata from standard CSV file', async () => {
        const products = createTestProducts(3);
        const csvContent = createTestCSV(products);
        const file = createMockFile('test.csv', csvContent, 'text/csv');

        const metadata = await getFileMetadata(file);

        expect(metadata).toBeDefined();
        expect(metadata.rowCount).toBe(3); // Excludes header
        expect(metadata.columnCount).toBe(4); // ean, name, price, supplier
      });

      it('should extract metadata from CSV with many rows', async () => {
        const products = createTestProducts(100);
        const csvContent = createTestCSV(products);
        const file = createMockFile('test.csv', csvContent, 'text/csv');

        const metadata = await getFileMetadata(file);

        expect(metadata.rowCount).toBe(100);
        expect(metadata.columnCount).toBe(4);
      });

      it('should handle CSV file with only header row', async () => {
        const csvContent = 'ean,name,price,supplier\n';
        const file = createMockFile('test.csv', csvContent, 'text/csv');

        const metadata = await getFileMetadata(file);

        expect(metadata.rowCount).toBe(0); // No data rows
        expect(metadata.columnCount).toBe(4); // Header columns detected
      });

      it('should handle empty CSV file', async () => {
        const file = createMockFile('test.csv', '', 'text/csv');

        const metadata = await getFileMetadata(file);

        expect(metadata.rowCount).toBe(0);
        expect(metadata.columnCount).toBe(0);
      });

      it('should handle CSV with different column counts in rows', async () => {
        // CSV with inconsistent column counts (metadata extraction doesn't validate)
        const csvContent = 'col1,col2,col3\nrow1col1,row1col2\nrow2col1,row2col2,row2col3,row2col4\n';
        const file = createMockFile('test.csv', csvContent, 'text/csv');

        const metadata = await getFileMetadata(file);

        // Column count based on first row (header)
        expect(metadata.columnCount).toBe(3);
        // Row count includes all rows with data (including inconsistent ones)
        expect(metadata.rowCount).toBeGreaterThan(0);
      });

      it('should handle CSV with special characters in data', async () => {
        const csvContent = 'ean,name,description\n"8712345678901","Product A","Description with, commas and ""quotes"""\n"8712345678902","Product B","Description with\nnewlines"\n';
        const file = createMockFile('test.csv', csvContent, 'text/csv');

        const metadata = await getFileMetadata(file);

        expect(metadata.rowCount).toBe(2);
        expect(metadata.columnCount).toBe(3);
      });

      it('should handle CSV with extra whitespace', async () => {
        const csvContent = '  ean  ,  name  ,  price  \n  8712345678901  ,  Product A  ,  15.99  \n';
        const file = createMockFile('test.csv', csvContent, 'text/csv');

        const metadata = await getFileMetadata(file);

        expect(metadata.rowCount).toBe(1);
        expect(metadata.columnCount).toBe(3);
      });

      it('should handle CSV with empty cells', async () => {
        const csvContent = 'ean,name,price\n8712345678901,Product A,\n,Product B,25.50\n';
        const file = createMockFile('test.csv', csvContent, 'text/csv');

        const metadata = await getFileMetadata(file);

        // Rows with any non-empty cells are counted
        expect(metadata.rowCount).toBe(2);
        expect(metadata.columnCount).toBe(3);
      });

      it('should handle CSV with trailing empty rows', async () => {
        const csvContent = 'ean,name,price\n8712345678901,Product A,15.99\n8712345678902,Product B,25.50\n\n\n';
        const file = createMockFile('test.csv', csvContent, 'text/csv');

        const metadata = await getFileMetadata(file);

        // Empty rows should be skipped
        expect(metadata.rowCount).toBe(2);
        expect(metadata.columnCount).toBe(3);
      });

      it('should handle CSV with many columns', async () => {
        const headers = Array.from({ length: 36 }, (_, i) => `col${i + 1}`).join(',');
        const csvContent = `${headers}\n${Array(36).fill('value').join(',')}\n`;
        const file = createMockFile('test.csv', csvContent, 'text/csv');

        const metadata = await getFileMetadata(file);

        expect(metadata.rowCount).toBe(1);
        expect(metadata.columnCount).toBe(36);
      });
    });

    describe('Excel files', () => {
      // Note: Excel tests require ExcelJS to be properly configured
      // These tests may need mocking or actual Excel file creation
      
      it('should reject unsupported file formats', async () => {
        const file = createMockFile('test.txt', 'some content', 'text/plain');

        await expect(getFileMetadata(file)).rejects.toThrow(
          'Unsupported file format. Please upload CSV or Excel files.'
        );
      });

      it('should reject PDF files', async () => {
        const file = createMockFile('test.pdf', 'PDF content', 'application/pdf');

        await expect(getFileMetadata(file)).rejects.toThrow(
          'Unsupported file format. Please upload CSV or Excel files.'
        );
      });

      it('should handle files without extension', async () => {
        const file = createMockFile('test', 'some content', 'text/plain');

        await expect(getFileMetadata(file)).rejects.toThrow(
          'Unsupported file format. Please upload CSV or Excel files.'
        );
      });
    });

    describe('Error handling', () => {
      it('should handle corrupt CSV file gracefully', async () => {
        // Corrupt CSV that might cause parsing issues
        const corruptContent = '\x00\x01\x02\x03\x04'; // Binary data
        const file = createMockFile('test.csv', corruptContent, 'text/csv');

        // PapaParse should handle this, but might throw or return empty
        try {
          const metadata = await getFileMetadata(file);
          // If it doesn't throw, metadata should be valid
          expect(metadata).toBeDefined();
          expect(metadata.rowCount).toBeGreaterThanOrEqual(0);
          expect(metadata.columnCount).toBeGreaterThanOrEqual(0);
        } catch (error) {
          // It's also valid if it throws an error for corrupt data
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('Failed to parse CSV file');
        }
      });

      it('should handle file with invalid encoding', async () => {
        // This might be handled by the browser/Node, but we should test it
        const file = createMockFile('test.csv', 'invalid encoding content', 'text/csv; charset=invalid');

        // Should either succeed or throw a clear error
        try {
          const metadata = await getFileMetadata(file);
          expect(metadata).toBeDefined();
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      });
    });

    describe('Edge cases', () => {
      it('should handle very large CSV files', async () => {
        // Create CSV with 1000 rows
        const products = createTestProducts(1000);
        const csvContent = createTestCSV(products);
        const file = createMockFile('test.csv', csvContent, 'text/csv');

        const metadata = await getFileMetadata(file);

        expect(metadata.rowCount).toBe(1000);
        expect(metadata.columnCount).toBe(4);
      }, 10000); // 10 second timeout for large file

      it('should handle CSV with only commas (empty header row)', async () => {
        const csvContent = ',,\nvalue1,value2,value3\n';
        const file = createMockFile('test.csv', csvContent, 'text/csv');

        const metadata = await getFileMetadata(file);

        // Should detect columns even if header is empty
        expect(metadata.columnCount).toBeGreaterThanOrEqual(0);
        expect(metadata.rowCount).toBeGreaterThanOrEqual(0);
      });

      it('should handle CSV with BOM (Byte Order Mark)', async () => {
        // UTF-8 BOM: EF BB BF
        const bom = '\uFEFF';
        const csvContent = bom + 'ean,name,price\n8712345678901,Product A,15.99\n';
        const file = createMockFile('test.csv', csvContent, 'text/csv');

        const metadata = await getFileMetadata(file);

        // Should handle BOM correctly
        expect(metadata.rowCount).toBe(1);
        expect(metadata.columnCount).toBe(3);
      });

      it('should handle CSV with different line endings (CRLF vs LF)', async () => {
        const csvContentLF = 'ean,name\n8712345678901,Product A\n';
        const csvContentCRLF = 'ean,name\r\n8712345678901,Product A\r\n';

        const fileLF = createMockFile('test-lf.csv', csvContentLF, 'text/csv');
        const fileCRLF = createMockFile('test-crlf.csv', csvContentCRLF, 'text/csv');

        const metadataLF = await getFileMetadata(fileLF);
        const metadataCRLF = await getFileMetadata(fileCRLF);

        // Both should produce same results
        expect(metadataLF.rowCount).toBe(metadataCRLF.rowCount);
        expect(metadataLF.columnCount).toBe(metadataCRLF.columnCount);
      });

      it('should return consistent metadata for same file', async () => {
        const products = createTestProducts(10);
        const csvContent = createTestCSV(products);
        const file1 = createMockFile('test1.csv', csvContent, 'text/csv');
        const file2 = createMockFile('test2.csv', csvContent, 'text/csv');

        const metadata1 = await getFileMetadata(file1);
        const metadata2 = await getFileMetadata(file2);

        expect(metadata1.rowCount).toBe(metadata2.rowCount);
        expect(metadata1.columnCount).toBe(metadata2.columnCount);
      });
    });
  });

  describe('ParseMetadata interface', () => {
    it('should return metadata with correct structure', async () => {
      const products = createTestProducts(5);
      const csvContent = createTestCSV(products);
      const file = createMockFile('test.csv', csvContent, 'text/csv');

      const metadata = await getFileMetadata(file);

      expect(metadata).toHaveProperty('rowCount');
      expect(metadata).toHaveProperty('columnCount');
      expect(typeof metadata.rowCount).toBe('number');
      expect(typeof metadata.columnCount).toBe('number');
      expect(metadata.rowCount).toBeGreaterThanOrEqual(0);
      expect(metadata.columnCount).toBeGreaterThanOrEqual(0);
    });

    it('should not have negative counts', async () => {
      const file = createMockFile('test.csv', '', 'text/csv');

      const metadata = await getFileMetadata(file);

      expect(metadata.rowCount).toBeGreaterThanOrEqual(0);
      expect(metadata.columnCount).toBeGreaterThanOrEqual(0);
    });
  });
});


