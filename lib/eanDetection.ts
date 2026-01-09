import Papa from 'papaparse';
import ExcelJS from 'exceljs';

/**
 * Validates if a value conforms to GTIN-13/EAN-13 standard
 * GTIN-13/EAN-13: exactly 13 digits, numeric only
 * 
 * @param value - The value to validate
 * @returns true if the value is a valid GTIN-13/EAN-13 code
 */
export function validateGTIN13(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  // Remove whitespace and quotes (both single and double quotes at start/end)
  const cleaned = value.trim().replace(/^["']+|["']+$/g, '').trim();

  // Must be exactly 13 characters
  if (cleaned.length !== 13) {
    return false;
  }

  // Must contain only digits
  if (!/^\d+$/.test(cleaned)) {
    return false;
  }

  return true;
}

/**
 * Detects columns in a file that contain GTIN-13/EAN-13 codes
 * Analyzes sample rows from each column to determine if values match the standard
 * 
 * @param file - The file to analyze
 * @param headers - Array of column headers/names
 * @returns Promise resolving to array of column names that likely contain EAN codes
 */
export async function detectEANColumns(file: File, headers: string[]): Promise<string[]> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    return detectEANColumnsCSV(file, headers);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return detectEANColumnsExcel(file, headers);
  } else {
    throw new Error('Unsupported file format. Please upload CSV or Excel files.');
  }
}

/**
 * Detects EAN columns in a CSV file
 * Reads the file as text first to avoid FileReaderSync issues in Node.js
 */
async function detectEANColumnsCSV(file: File, headers: string[]): Promise<string[]> {
  // CRITICAL: Read file as text first to avoid FileReaderSync error in Node.js
  // PapaParse with File objects tries to use FileReaderSync which is not available server-side
  const csvText = await file.text();
  
  return new Promise((resolve, reject) => {
    const columnEANCounts: { [key: string]: number } = {};
    const columnTotalCounts: { [key: string]: number } = {};
    
    // Initialize counts for all headers
    headers.forEach(header => {
      columnEANCounts[header] = 0;
      columnTotalCounts[header] = 0;
    });

    // Sample up to 100 rows for efficiency
    let rowCount = 0;
    const maxSampleRows = 100;

    // Use text string instead of File object to avoid FileReaderSync issues
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      worker: false, // Disable worker to avoid FileReaderSync error in Node.js
      step: (results) => {
        if (rowCount >= maxSampleRows) {
          return; // Stop after sampling enough rows
        }

        const row = results.data as any;
        rowCount++;

        // Check each column
        headers.forEach(header => {
          const value = row[header];
          if (value !== null && value !== undefined && value !== '') {
            columnTotalCounts[header]++;
            
            // Clean the value - remove quotes and whitespace before validation
            // PapaParse should handle quotes, but we clean defensively
            const cleanedValue = String(value).trim().replace(/^["']+|["']+$/g, '').trim();
            
            if (validateGTIN13(cleanedValue)) {
              columnEANCounts[header]++;
            }
          }
        });
      },
      complete: () => {
        // Find columns where at least 80% of non-empty values are valid GTIN-13
        const eanColumns: string[] = [];
        
        headers.forEach(header => {
          const total = columnTotalCounts[header];
          const eanCount = columnEANCounts[header];
          
          // Column must have at least 5 values and at least 80% must be valid GTIN-13
          if (total >= 5 && eanCount > 0 && (eanCount / total) >= 0.8) {
            eanColumns.push(header);
          }
        });

        resolve(eanColumns);
      },
      error: (error: Error) => {
        reject(new Error(`Failed to parse CSV file for EAN detection: ${error.message}`));
      },
    });
  });
}

/**
 * Detects EAN columns in an Excel file
 */
async function detectEANColumnsExcel(file: File, headers: string[]): Promise<string[]> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('No worksheet found in Excel file');
    }

    const columnEANCounts: { [key: string]: number } = {};
    const columnTotalCounts: { [key: string]: number } = {};
    
    // Initialize counts for all headers
    headers.forEach(header => {
      columnEANCounts[header] = 0;
      columnTotalCounts[header] = 0;
    });

    // Create header to column index mapping
    const headerRow = worksheet.getRow(1);
    const headerToIndex: { [key: string]: number } = {};
    
    headerRow.eachCell((cell, colNumber) => {
      const headerName = String(cell.value).trim();
      if (headers.includes(headerName)) {
        headerToIndex[headerName] = colNumber;
      }
    });

    // Sample up to 100 rows for efficiency
    let rowCount = 0;
    const maxSampleRows = 100;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row
      if (rowCount >= maxSampleRows) return; // Stop after sampling enough rows

      rowCount++;

      // Check each column
      headers.forEach(header => {
        const colIndex = headerToIndex[header];
        if (colIndex) {
          const cell = row.getCell(colIndex);
          const value = cell.value;
          
          if (value !== null && value !== undefined && value !== '') {
            columnTotalCounts[header]++;
            
            // Clean the value - remove quotes and whitespace before validation
            const cleanedValue = String(value).trim().replace(/^["']+|["']+$/g, '').trim();
            
            if (validateGTIN13(cleanedValue)) {
              columnEANCounts[header]++;
            }
          }
        }
      });
    });

    // Find columns where at least 80% of non-empty values are valid GTIN-13
    const eanColumns: string[] = [];
    
    headers.forEach(header => {
      const total = columnTotalCounts[header];
      const eanCount = columnEANCounts[header];
      
      // Column must have at least 5 values and at least 80% must be valid GTIN-13
      if (total >= 5 && eanCount > 0 && (eanCount / total) >= 0.8) {
        eanColumns.push(header);
      }
    });

    return eanColumns;
  } catch (error) {
    throw new Error(
      `Failed to parse Excel file for EAN detection: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

