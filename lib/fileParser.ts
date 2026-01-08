import Papa from 'papaparse';
import * as XLSX from 'xlsx';

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
            errors.push(`Row ${index + 1}: ${error}`);
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
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        const errors: string[] = [];
        const products: ParsedProduct[] = [];

        jsonData.forEach((row: any, index: number) => {
          try {
            if (!row.ean && !row.EAN) {
              errors.push(`Row ${index + 1}: Missing EAN`);
              return;
            }
            if (!row.name && !row.Name) {
              errors.push(`Row ${index + 1}: Missing name`);
              return;
            }
            if (!row.price && !row.Price) {
              errors.push(`Row ${index + 1}: Missing price`);
              return;
            }
            if (!row.supplier && !row.Supplier) {
              errors.push(`Row ${index + 1}: Missing supplier`);
              return;
            }

            const price = parseFloat(row.price || row.Price);
            if (isNaN(price)) {
              errors.push(`Row ${index + 1}: Invalid price value`);
              return;
            }

            products.push({
              ean: String(row.ean || row.EAN).trim(),
              name: String(row.name || row.Name).trim(),
              price,
              supplier: String(row.supplier || row.Supplier).trim(),
            });
          } catch (error) {
            errors.push(`Row ${index + 1}: ${error}`);
          }
        });

        resolve({ data: products, errors });
      } catch (error) {
        resolve({ data: [], errors: [`Failed to parse Excel file: ${error}`] });
      }
    };

    reader.onerror = () => {
      resolve({ data: [], errors: ['Failed to read file'] });
    };

    reader.readAsArrayBuffer(file);
  });
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
