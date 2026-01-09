import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import { getSupabaseServer } from './supabase-server';
import { downloadFileFromStorage, STORAGE_BUCKET_NAME, STORAGE_APPROVED_FOLDER, ensureBucketExists } from './storage';

/**
 * Parse CSV file and return all columns as array of objects
 * @param file CSV file
 * @returns Array of row objects with all columns
 */
async function parseCSVAllColumns(file: File): Promise<Record<string, any>[]> {
  const csvText = await file.text();
  
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      worker: false,
      complete: (results) => {
        if (results.errors.length > 0) {
          const errorMessages = results.errors.map(e => e.message).join('; ');
          reject(new Error(`CSV parsing errors: ${errorMessages}`));
          return;
        }

        // Convert to array of objects, preserving all columns
        const data = results.data as Record<string, any>[];
        
        // Clean up values (trim strings, handle nulls)
        const cleanedData = data.map((row, index) => {
          const cleanedRow: Record<string, any> = {};
          for (const [key, value] of Object.entries(row)) {
            if (value === null || value === undefined || value === '') {
              cleanedRow[key] = '';
            } else {
              cleanedRow[key] = String(value).trim();
            }
          }
          return cleanedRow;
        });

        resolve(cleanedData);
      },
      error: (error: Error) => {
        reject(new Error(`Failed to parse CSV file: ${error.message}`));
      },
    });
  });
}

/**
 * Parse Excel file and return all columns as array of objects
 * @param file Excel file
 * @returns Array of row objects with all columns
 */
async function parseExcelAllColumns(file: File): Promise<Record<string, any>[]> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('No worksheet found in Excel file');
    }

    const data: Record<string, any>[] = [];
    
    // Get headers from first row
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    
    headerRow.eachCell((cell, colNumber) => {
      const headerName = cell.value ? String(cell.value).trim() : `Column${colNumber}`;
      headers[colNumber - 1] = headerName;
    });

    if (headers.length === 0) {
      throw new Error('No headers found in Excel file');
    }

    // Process data rows (skip header row)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row
      
      const rowData: Record<string, any> = {};
      
      headers.forEach((header, index) => {
        const cell = row.getCell(index + 1);
        const value = cell.value;
        
        if (value === null || value === undefined || value === '') {
          rowData[header] = '';
        } else {
          rowData[header] = String(value).trim();
        }
      });

      // Only add row if it has at least one non-empty value
      if (Object.values(rowData).some(v => v !== '')) {
        data.push(rowData);
      }
    });

    return data;
  } catch (error) {
    throw new Error(
      `Failed to parse Excel file: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Parse file and return all columns as array of objects
 * @param file File to parse (CSV or Excel)
 * @returns Array of row objects with all columns
 */
export async function parseFileAllColumns(file: File): Promise<Record<string, any>[]> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    return parseCSVAllColumns(file);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcelAllColumns(file);
  } else {
    throw new Error('Unsupported file format. Please upload CSV or Excel files.');
  }
}

/**
 * Validate that data is readable and has columns
 * @param data Array of row objects
 * @returns Validation result with errors if any
 */
export function validateDataReadability(data: Record<string, any>[]): {
  valid: boolean;
  errors: string[];
  columnCount: number;
  rowCount: number;
} {
  const errors: string[] = [];

  if (!data || data.length === 0) {
    errors.push('No data rows found in file');
    return { valid: false, errors, columnCount: 0, rowCount: 0 };
  }

  // Get column names from first row
  const firstRow = data[0];
  const columnNames = Object.keys(firstRow);
  const columnCount = columnNames.length;

  if (columnCount === 0) {
    errors.push('No columns found in file');
    return { valid: false, errors, columnCount: 0, rowCount: data.length };
  }

  // Check if all rows have the same columns (warn if not, but don't fail)
  const inconsistentRows: number[] = [];
  data.forEach((row, index) => {
    const rowColumns = Object.keys(row);
    if (rowColumns.length !== columnCount) {
      inconsistentRows.push(index + 1);
    }
  });

  if (inconsistentRows.length > 0) {
    errors.push(
      `Warning: ${inconsistentRows.length} rows have inconsistent column counts (rows: ${inconsistentRows.slice(0, 10).join(', ')}${inconsistentRows.length > 10 ? '...' : ''})`
    );
  }

  return {
    valid: errors.length === 0 || errors.every(e => e.startsWith('Warning:')),
    errors,
    columnCount,
    rowCount: data.length,
  };
}

/**
 * Convert approved dataset to JSON and save to Storage
 * @param sessionId Import session ID
 * @returns Path to saved JSON file in Storage
 * @throws Error if conversion fails
 */
export async function convertApprovedDatasetToJSON(sessionId: number): Promise<string> {
  const supabase = getSupabaseServer();

  try {
    // Step 1: Fetch session
    const { data: session, error: fetchError } = await supabase
      .from('import_sessions')
      .select('id, file_storage_path, file_name, file_type, status')
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) {
      throw new Error(
        `Failed to fetch session ${sessionId}: ${fetchError?.message || 'Session not found'}`
      );
    }

    // Allow conversion if status is 'approved' or 'converting' (for retry scenarios)
    if (session.status !== 'approved' && session.status !== 'converting') {
      throw new Error(
        `Session ${sessionId} has status '${session.status}', expected 'approved' or 'converting'`
      );
    }

    // Step 1a: Update status to 'converting' before starting conversion (if not already converting)
    if (session.status !== 'converting') {
      const { error: statusUpdateError } = await supabase
        .from('import_sessions')
        .update({ status: 'converting' })
        .eq('id', sessionId);

      if (statusUpdateError) {
        console.error(`[DataConverter] Failed to update status to 'converting':`, statusUpdateError);
        // Continue anyway - status update is not critical, but log it
      } else {
        console.log(`[DataConverter] Updated status to 'converting' for session ${sessionId}`);
      }
    } else {
      console.log(`[DataConverter] Session ${sessionId} already in 'converting' status, continuing conversion...`);
    }

    if (!session.file_storage_path) {
      throw new Error(`Session ${sessionId} has no storage path`);
    }

    // Step 2: Download approved file from Storage
    console.log(`[DataConverter] Downloading approved file: ${session.file_storage_path}`);
    const fileBlob = await downloadFileFromStorage(STORAGE_BUCKET_NAME, session.file_storage_path);
    
    // Step 3: Convert Blob to File
    const file = new File([fileBlob], session.file_name, {
      type: session.file_type === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    // Step 4: Parse all columns
    console.log(`[DataConverter] Parsing file with all columns...`);
    const data = await parseFileAllColumns(file);
    console.log(`[DataConverter] Parsed ${data.length} rows with ${Object.keys(data[0] || {}).length} columns`);

    // Step 5: Validate data readability
    const validation = validateDataReadability(data);
    if (!validation.valid) {
      throw new Error(`Data validation failed: ${validation.errors.join('; ')}`);
    }

    if (validation.errors.length > 0) {
      console.warn(`[DataConverter] Validation warnings: ${validation.errors.join('; ')}`);
    }

    // Step 6: Convert to JSON string (compact format to reduce size)
    // Use compact JSON (no pretty printing) to minimize file size
    const jsonString = JSON.stringify(data); // Compact format
    const jsonBlob = new Blob([jsonString], { type: 'application/json' });
    
    const jsonSizeMB = jsonBlob.size / 1024 / 1024;
    console.log(`[DataConverter] JSON size (uncompressed): ${jsonSizeMB.toFixed(2)} MB (${data.length} rows, ${Object.keys(data[0] || {}).length} columns)`);
    
    // Step 6a: Compress JSON using gzip to reduce file size
    const jsonBytes = new TextEncoder().encode(jsonString);
    const compressionStream = new CompressionStream('gzip');
    const writer = compressionStream.writable.getWriter();
    const reader = compressionStream.readable.getReader();
    
    writer.write(jsonBytes);
    writer.close();
    
    const chunks: Uint8Array[] = [];
    let done = false;
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) chunks.push(value);
    }
    
    // Combine compressed chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const compressed = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      compressed.set(chunk, offset);
      offset += chunk.length;
    }
    
    const compressedBlob = new Blob([compressed], { type: 'application/gzip' });
    const compressedSizeMB = compressedBlob.size / 1024 / 1024;
    const compressionRatio = ((1 - compressedBlob.size / jsonBlob.size) * 100).toFixed(1);
    console.log(`[DataConverter] JSON size (compressed): ${compressedSizeMB.toFixed(2)} MB (${compressionRatio}% reduction)`);
    
    // Check if compressed file is too large for storage (Supabase limit is 50MB)
    const MAX_STORAGE_SIZE = 50 * 1024 * 1024; // 50MB
    if (compressedBlob.size > MAX_STORAGE_SIZE) {
      throw new Error(
        `Compressed JSON file is still too large (${compressedSizeMB.toFixed(2)} MB). ` +
        `Supabase Storage limit is 50MB. ` +
        `Dataset has ${data.length} rows with ${Object.keys(data[0] || {}).length} columns. ` +
        `Consider splitting the dataset or using a different storage solution.`
      );
    }
    
    // Use compressed blob for upload
    const jsonBlobToUpload = compressedBlob;
    // New path structure: approved/{sessionId}-data.json.gz (all files in approved/ root)
    const jsonPath = `${STORAGE_APPROVED_FOLDER}/${sessionId}-data.json.gz`;

    // Step 7: Ensure bucket exists before saving
    console.log(`[DataConverter] Ensuring storage bucket exists: ${STORAGE_BUCKET_NAME}`);
    await ensureBucketExists(STORAGE_BUCKET_NAME);

    // Step 8: Save compressed JSON to Storage
    console.log(`[DataConverter] Saving compressed JSON to Storage: ${jsonPath}`);
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET_NAME)
      .upload(jsonPath, jsonBlobToUpload, {
        contentType: 'application/gzip',
        upsert: true, // Overwrite if exists
      });

    if (uploadError) {
      // Update status to failed on upload error
      await supabase
        .from('import_sessions')
        .update({
          status: 'failed',
          error_message: `Failed to save JSON to Storage: ${uploadError.message}`,
        })
        .eq('id', sessionId);
      throw new Error(`Failed to save JSON to Storage: ${uploadError.message}`);
    }

    // Step 9: Update status to 'ready_for_activation' after successful conversion
    console.log(`[DataConverter] Updating status to 'ready_for_activation' for session ${sessionId}...`);
    const { error: finalStatusError } = await supabase
      .from('import_sessions')
      .update({ status: 'ready_for_activation' })
      .eq('id', sessionId);

    if (finalStatusError) {
      console.error(`[DataConverter] Failed to update status to 'ready_for_activation':`, finalStatusError);
      // This is critical - retry once
      console.log(`[DataConverter] Retrying status update...`);
      const { error: retryError } = await supabase
        .from('import_sessions')
        .update({ status: 'ready_for_activation' })
        .eq('id', sessionId);
      
      if (retryError) {
        console.error(`[DataConverter] Retry also failed:`, retryError);
        // Log but don't throw - file was saved successfully
      } else {
        console.log(`[DataConverter] Status update succeeded on retry`);
      }
    } else {
      console.log(`[DataConverter] Status successfully updated to 'ready_for_activation'`);
    }

    console.log(`[DataConverter] JSON conversion completed successfully: ${jsonPath}`);
    return jsonPath;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[DataConverter] Error converting dataset to JSON:`, errorMessage);
    
    // Update status to failed on any error
    try {
      await supabase
        .from('import_sessions')
        .update({
          status: 'failed',
          error_message: errorMessage,
        })
        .eq('id', sessionId);
    } catch (updateError) {
      console.error(`[DataConverter] Failed to update status to 'failed':`, updateError);
    }
    
    throw error;
  }
}

/**
 * Load JSON data from Storage
 * @param sessionId Import session ID
 * @returns Array of row objects with all columns
 * @throws Error if loading fails
 */
export async function loadJSONDataFromStorage(sessionId: number): Promise<Record<string, any>[]> {
  const supabase = getSupabaseServer();

  try {
    // Try new path structure first: approved/{sessionId}-data.json.gz
    let jsonPath = `${STORAGE_APPROVED_FOLDER}/${sessionId}-data.json.gz`;
    let isCompressed = true;
    
    console.log(`[DataConverter] Loading JSON from Storage: ${jsonPath}`);
    
    // Use downloadFileFromStorage helper which has better error handling
    let data: Blob | null = null;
    let downloadError: Error | null = null;
    
    try {
      data = await downloadFileFromStorage(STORAGE_BUCKET_NAME, jsonPath);
    } catch (error) {
      downloadError = error instanceof Error ? error : new Error(String(error));
      
      // Fallback to old path structure for backward compatibility during migration
      if (downloadError.message.includes('not found') || downloadError.message.includes('does not exist')) {
        console.log(`[DataConverter] New path not found, trying old path structure...`);
        const oldPath = `${STORAGE_APPROVED_FOLDER}/${sessionId}/data.json.gz`;
        
        try {
          data = await downloadFileFromStorage(STORAGE_BUCKET_NAME, oldPath);
          downloadError = null; // Success with old path
          jsonPath = oldPath;
        } catch (oldPathError) {
          // Try uncompressed versions
          const newUncompressed = `${STORAGE_APPROVED_FOLDER}/${sessionId}-data.json`;
          const oldUncompressed = `${STORAGE_APPROVED_FOLDER}/${sessionId}/data.json`;
          
          try {
            data = await downloadFileFromStorage(STORAGE_BUCKET_NAME, newUncompressed);
            downloadError = null;
            jsonPath = newUncompressed;
            isCompressed = false;
          } catch {
            try {
              data = await downloadFileFromStorage(STORAGE_BUCKET_NAME, oldUncompressed);
              downloadError = null;
              jsonPath = oldUncompressed;
              isCompressed = false;
            } catch (uncompressedError) {
              downloadError = uncompressedError instanceof Error ? uncompressedError : new Error(String(uncompressedError));
            }
          }
        }
      }
    }

    if (downloadError || !data) {
      // Log full error details for debugging
      console.error(`[DataConverter] Storage download error:`, {
        message: downloadError?.message || 'No data returned',
        error: downloadError,
        path: jsonPath,
        bucket: STORAGE_BUCKET_NAME,
        hasData: !!data,
      });
      
      // Check for specific error types
      const errorMessage = downloadError?.message || 'No data returned from storage';
      
      if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
        throw new Error(`JSON file not found in storage: ${jsonPath}. The dataset may not have been converted to JSON yet.`);
      }
      
      throw new Error(`Failed to download JSON from Storage: ${errorMessage}`);
    }

    if (!data) {
      throw new Error(`No data returned from Storage for path: ${jsonPath}`);
    }

    // Decompress if needed, then parse JSON
    let jsonText: string;
    if (isCompressed) {
      console.log(`[DataConverter] Decompressing gzip file...`);
      const arrayBuffer = await data.arrayBuffer();
      const decompressionStream = new DecompressionStream('gzip');
      const writer = decompressionStream.writable.getWriter();
      const reader = decompressionStream.readable.getReader();
      
      writer.write(new Uint8Array(arrayBuffer));
      writer.close();
      
      const chunks: Uint8Array[] = [];
      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) chunks.push(value);
      }
      
      // Combine decompressed chunks
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const decompressed = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        decompressed.set(chunk, offset);
        offset += chunk.length;
      }
      
      jsonText = new TextDecoder().decode(decompressed);
    } else {
      jsonText = await data.text();
    }
    
    const parsedData = JSON.parse(jsonText) as Record<string, any>[];

    console.log(`[DataConverter] Loaded ${parsedData.length} rows from JSON`);
    return parsedData;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[DataConverter] Error loading JSON from Storage:`, errorMessage);
    throw error;
  }
}

