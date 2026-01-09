import Papa from 'papaparse';
import ExcelJS from 'exceljs';

export interface ParsedProduct {
  ean: string;
  name: string;
  price: number;
  supplier: string;
}

export interface ParseResult {
  data: ParsedProduct[];
  errors: string[];
}

export interface ParseMetadata {
  rowCount: number;
  columnCount: number;
}

export const parseCSV = async (file: File): Promise<ParseResult> => {
  // CRITICAL: Read file as text first to avoid FileReaderSync error in Node.js
  // PapaParse with File objects tries to use FileReaderSync which is not available server-side
  const csvText = await file.text();
  
  return new Promise((resolve) => {
    // Use text string instead of File object to avoid FileReaderSync issues
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      worker: false, // Disable worker to avoid FileReaderSync error in Node.js
      complete: (results) => {
        const errors: string[] = [];
        const data: ParsedProduct[] = [];

        results.data.forEach((row: any, index: number) => {
          try {
            if (!row.ean || !row.name || !row.price || !row.supplier) {
              errors.push(`Row ${index + 1}: Missing required fields`);
              return;
            }

            const price = parseFloat(row.price);
            if (isNaN(price)) {
              errors.push(`Row ${index + 1}: Invalid price value`);
              return;
            }

            data.push({
              ean: String(row.ean).trim(),
              name: String(row.name).trim(),
              price,
              supplier: String(row.supplier).trim(),
            });
          } catch (error) {
            errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
          }
        });

        resolve({ data, errors });
      },
      error: (error: Error) => {
        resolve({ data: [], errors: [error.message] });
      },
    });
  });
};

export const parseExcel = async (file: File): Promise<ParseResult> => {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return { data: [], errors: ['No worksheet found in Excel file'] };
    }

    const errors: string[] = [];
    const products: ParsedProduct[] = [];
    
    // Get headers from first row
    const headerRow = worksheet.getRow(1);
    const headers: { [key: string]: number } = {};
    
    headerRow.eachCell((cell, colNumber) => {
      const headerName = String(cell.value).toLowerCase().trim();
      headers[headerName] = colNumber;
    });

    // Validate required headers exist
    const requiredHeaders = ['ean', 'name', 'price', 'supplier'];
    const missingHeaders = requiredHeaders.filter(h => !headers[h]);
    if (missingHeaders.length > 0) {
      return { 
        data: [], 
        errors: [`Missing required columns: ${missingHeaders.join(', ')}`] 
      };
    }

    // Process data rows (skip header row)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row
      
      try {
        const eanCell = row.getCell(headers['ean']);
        const nameCell = row.getCell(headers['name']);
        const priceCell = row.getCell(headers['price']);
        const supplierCell = row.getCell(headers['supplier']);

        const ean = eanCell.value ? String(eanCell.value).trim() : '';
        const name = nameCell.value ? String(nameCell.value).trim() : '';
        const priceValue = priceCell.value;
        const supplier = supplierCell.value ? String(supplierCell.value).trim() : '';

        if (!ean) {
          errors.push(`Row ${rowNumber}: Missing EAN`);
          return;
        }
        if (!name) {
          errors.push(`Row ${rowNumber}: Missing name`);
          return;
        }
        if (!priceValue) {
          errors.push(`Row ${rowNumber}: Missing price`);
          return;
        }
        if (!supplier) {
          errors.push(`Row ${rowNumber}: Missing supplier`);
          return;
        }

        const price = typeof priceValue === 'number' 
          ? priceValue 
          : parseFloat(String(priceValue));
          
        if (isNaN(price)) {
          errors.push(`Row ${rowNumber}: Invalid price value`);
          return;
        }

        products.push({
          ean,
          name,
          price,
          supplier,
        });
      } catch (error) {
        errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    return { data: products, errors };
  } catch (error) {
    return { 
      data: [], 
      errors: [`Failed to parse Excel file: ${error instanceof Error ? error.message : String(error)}`] 
    };
  }
};

export const parseFile = async (file: File): Promise<ParseResult> => {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    return parseCSV(file);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcel(file);
  } else {
    return {
      data: [],
      errors: ['Unsupported file format. Please upload CSV or Excel files.'],
    };
  }
};

/**
 * Get file metadata (row count and column count) without full parsing
 * @param file File to analyze
 * @returns ParseMetadata with rowCount and columnCount
 * @throws Error if file cannot be parsed
 */
export async function getFileMetadata(file: File): Promise<ParseMetadata> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    return getCSVMetadata(file);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return getExcelMetadata(file);
  } else {
    throw new Error('Unsupported file format. Please upload CSV or Excel files.');
  }
}

/**
 * Get CSV file metadata (row and column counts)
 * @param file CSV file
 * @returns ParseMetadata
 */
async function getCSVMetadata(file: File): Promise<ParseMetadata> {
  console.log('[FileParser] Starting CSV metadata extraction:', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type
  });

  // Read file as text first to avoid FileReaderSync issue in Node.js
  // FileReaderSync is browser-only and not available in server-side context
  const text = await file.text();

  return new Promise((resolve, reject) => {
    let rowCount = 0;
    let columnCount = 0;
    let firstRowProcessed = false;

    Papa.parse(text, {
      header: false,
      skipEmptyLines: true,
      quoteChar: '"',
      escapeChar: '"',
      worker: false, // Disable worker to avoid FileReaderSync issue
      step: (results) => {
        if (results.data && Array.isArray(results.data)) {
          // Check if row has any data (non-empty cells)
          const nonEmptyCells = results.data.filter(
            (cell) => cell !== null && cell !== undefined && cell !== ''
          );

          if (nonEmptyCells.length > 0) {
            // First non-empty row determines column count
            if (!firstRowProcessed) {
              columnCount = nonEmptyCells.length;
              firstRowProcessed = true;
            }
            // Count all rows with data
            rowCount++;
          }
        }
      },
      complete: () => {
        // Exclude header row from count (first row is usually header)
        const dataRowCount = Math.max(0, rowCount > 0 ? rowCount - 1 : 0);
        
        resolve({
          rowCount: dataRowCount,
          columnCount: columnCount,
        });
      },
      error: (error: any) => {
        console.error('[FileParser] CSV parsing error details:', {
          message: error.message,
          type: error.type,
          code: error.code,
          fileName: file.name,
          fileSize: file.size,
          error: error
        });
        reject(new Error(`Failed to parse CSV file: ${error.message}${error.code ? ` (code: ${error.code})` : ''}${error.type ? ` (type: ${error.type})` : ''}`));
      },
    });
  });
}

/**
 * Get Excel file metadata (row and column counts)
 * @param file Excel file (.xlsx or .xls)
 * @returns ParseMetadata
 */
async function getExcelMetadata(file: File): Promise<ParseMetadata> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('No worksheet found in Excel file');
    }

    // Get actual row count (excluding empty rows at the end)
    let rowCount = 0;
    worksheet.eachRow((row, rowNumber) => {
      // Check if row has any data
      const values = row.values;
      if (!values || !Array.isArray(values)) return;
      const hasData = values.some(
        (cell, index) => index > 0 && cell !== null && cell !== undefined && cell !== ''
      );
      if (hasData) {
        rowCount = rowNumber;
      }
    });

    // Subtract 1 to exclude header row
    const dataRowCount = Math.max(0, rowCount - 1);

    // Get column count from header row (first row)
    let columnCount = 0;
    if (rowCount > 0) {
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell, colNumber) => {
        if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
          columnCount = Math.max(columnCount, colNumber);
        }
      });
    }

    return {
      rowCount: dataRowCount,
      columnCount: columnCount,
    };
  } catch (error) {
    throw new Error(
      `Failed to parse Excel file: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Extract all values from a specific column in a file
 * @param file File to extract values from
 * @param columnName Name of the column to extract
 * @returns Promise resolving to array of column values (as strings)
 */
export async function extractEANColumnValues(file: File, columnName: string): Promise<string[]> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    return extractEANColumnValuesCSV(file, columnName);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return extractEANColumnValuesExcel(file, columnName);
  } else {
    throw new Error('Unsupported file format. Please upload CSV or Excel files.');
  }
}

/**
 * Extract column values from CSV file
 * Reads the file as text first to avoid FileReaderSync issues in Node.js
 */
async function extractEANColumnValuesCSV(file: File, columnName: string): Promise<string[]> {
  // CRITICAL: Read file as text first to avoid FileReaderSync error in Node.js
  // PapaParse with File objects tries to use FileReaderSync which is not available server-side
  const csvText = await file.text();
  
  return new Promise((resolve, reject) => {
    const values: string[] = [];

    // Use text string instead of File object to avoid FileReaderSync issues
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      worker: false, // Disable worker to avoid FileReaderSync error in Node.js
      step: (results) => {
        const row = results.data as any;
        const value = row[columnName];
        
        if (value !== null && value !== undefined && value !== '') {
          // Clean the value - remove quotes and whitespace
          const cleanedValue = String(value).trim().replace(/^["']+|["']+$/g, '').trim();
          if (cleanedValue) {
            values.push(cleanedValue);
          }
        }
      },
      complete: () => {
        resolve(values);
      },
      error: (error: Error) => {
        reject(new Error(`Failed to extract column values from CSV: ${error.message}`));
      },
    });
  });
}

/**
 * Extract column values from Excel file
 */
async function extractEANColumnValuesExcel(file: File, columnName: string): Promise<string[]> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('No worksheet found in Excel file');
    }

    const values: string[] = [];

    // Get header row to find column index
    const headerRow = worksheet.getRow(1);
    let columnIndex: number | null = null;

    headerRow.eachCell((cell, colNumber) => {
      const headerName = String(cell.value).trim();
      if (headerName === columnName) {
        columnIndex = colNumber;
      }
    });

    if (columnIndex === null) {
      throw new Error(`Column "${columnName}" not found in Excel file`);
    }

    // Extract values from data rows
    const finalColumnIndex = columnIndex; // Type narrowing
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      const cell = row.getCell(finalColumnIndex);
      const value = cell.value;

      if (value !== null && value !== undefined && value !== '') {
        // Clean the value - remove quotes and whitespace
        const cleanedValue = String(value).trim().replace(/^["']+|["']+$/g, '').trim();
        if (cleanedValue) {
          values.push(cleanedValue);
        }
      }
    });

    return values;
  } catch (error) {
    throw new Error(
      `Failed to extract column values from Excel: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}