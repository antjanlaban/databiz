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

export const parseCSV = (file: File): Promise<ParseResult> => {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
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
      error: (error) => {
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
