import { getSupabaseServer } from './supabase-server';
import { downloadFileFromStorage, STORAGE_BUCKET_NAME, moveToApproved, moveToRejected } from './storage';
import { detectEANColumns } from './eanDetection';
import { analyzeEANs } from './eanAnalyzer';
import { getFileMetadata } from './fileParser';

/**
 * Process EAN analysis for a file session
 * @param sessionId Import session ID
 * @throws Error if processing fails
 */
export async function processEANAnalysis(sessionId: number): Promise<void> {
  const supabase = getSupabaseServer();

  try {
    // Step 1: Fetch session from database
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

    if (!session.file_storage_path) {
      throw new Error(`Session ${sessionId} has no storage path`);
    }

    if (session.status !== 'analyzing_ean') {
      throw new Error(
        `Session ${sessionId} has status '${session.status}', expected 'analyzing_ean'`
      );
    }

    console.log(`[EANAnalysis] Processing session ${sessionId}: ${session.file_name}`);

    // Step 2: Download file from storage
    let fileBlob: Blob;
    try {
      console.log(`[EANAnalysis] Downloading file from storage: ${session.file_storage_path}`);
      fileBlob = await downloadFileFromStorage(STORAGE_BUCKET_NAME, session.file_storage_path);
      console.log(`[EANAnalysis] File downloaded, size: ${fileBlob.size} bytes`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[EANAnalysis] Storage download failed:`, errorMessage);
      
      // Update session with error
      await supabase
        .from('import_sessions')
        .update({
          status: 'failed',
          error_message: `Failed to download file from storage for EAN analysis: ${errorMessage}`,
        })
        .eq('id', sessionId);

      throw new Error(`Storage download failed: ${errorMessage}`);
    }

    // Step 3: Convert Blob to File for parser
    const file = new File([fileBlob], session.file_name, {
      type: session.file_type === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    // Step 4: Get file headers
    // For CSV, read text once and reuse
    // For Excel, read buffer once and reuse
    let headers: string[] = [];
    let csvText: string | null = null;
    let excelBuffer: ArrayBuffer | null = null;
    
    if (session.file_type === 'csv') {
      // Read text once for headers and later reuse
      csvText = await fileBlob.text();
      
      // Use PapaParse to properly parse CSV headers (handles delimiters, quotes, etc.)
      const Papa = (await import('papaparse')).default;
      const lines = csvText.split('\n').filter(line => line.trim());
      if (lines.length > 0) {
        // Parse first line to get headers
        await new Promise<void>((resolve, reject) => {
          try {
            Papa.parse(lines[0], {
              header: false,
              skipEmptyLines: true,
              worker: false, // CRITICAL: Disable worker to avoid FileReaderSync error in Node.js
              complete: (results) => {
                try {
                  if (results.data && results.data.length > 0 && Array.isArray(results.data[0])) {
                    headers = results.data[0].map((h: any) => String(h).trim().replace(/^"|"$/g, ''));
                  }
                  resolve();
                } catch (err) {
                  console.error('[EANAnalysis] Error processing PapaParse results:', err);
                  resolve(); // Continue with fallback
                }
              },
              error: (error: Error) => {
                console.error('[EANAnalysis] PapaParse error:', error);
                resolve(); // Continue with fallback
              },
            });
          } catch (err) {
            console.error('[EANAnalysis] Error setting up PapaParse:', err);
            resolve(); // Continue with fallback
          }
        });
      }
      
      // Fallback: if PapaParse didn't work, try simple split
      if (headers.length === 0 && lines.length > 0) {
        headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      }
      
      // Remove empty headers
      headers = headers.filter(h => h && h.length > 0);
    } else {
      // For Excel, read buffer once for headers and later reuse
      excelBuffer = await fileBlob.arrayBuffer();
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(excelBuffer);
      const worksheet = workbook.worksheets[0];
      if (worksheet) {
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell, colNumber) => {
          const headerName = String(cell.value).trim();
          if (headerName) {
            headers.push(headerName);
          }
        });
      }
    }

    if (headers.length === 0) {
      console.error(`[EANAnalysis] No headers found in file ${session.file_name}`);
      throw new Error('No headers found in file');
    }

    console.log(`[EANAnalysis] Found ${headers.length} headers: ${headers.join(', ')}`);

    // Step 5: Detect EAN columns
    let eanColumns: string[];
    try {
      console.log(`[EANAnalysis] Starting EAN column detection...`);
      // Recreate file for detection using the already-read data
      // IMPORTANT: Blob can only be read once, so we must use the stored data
      let fileForDetection: File;
      if (session.file_type === 'csv') {
        if (!csvText) {
          throw new Error('CSV text not available for detection');
        }
        fileForDetection = new File([csvText], session.file_name, {
          type: 'text/csv',
        });
      } else {
        if (!excelBuffer) {
          throw new Error('Excel buffer not available for detection');
        }
        fileForDetection = new File([excelBuffer], session.file_name, {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
      }
      
      eanColumns = await detectEANColumns(fileForDetection, headers);
      console.log(`[EANAnalysis] Detected ${eanColumns.length} EAN column(s): ${eanColumns.join(', ')}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(`[EANAnalysis] EAN column detection failed:`, errorMessage, errorStack);
      
      await supabase
        .from('import_sessions')
        .update({
          status: 'failed',
          error_message: `Failed to detect EAN columns: ${errorMessage}`,
        })
        .eq('id', sessionId);

      throw new Error(`EAN column detection failed: ${errorMessage}`);
    }

    // Step 6: Handle different scenarios
    if (eanColumns.length === 0) {
      // No EAN column found - automatically reject and move to rejected/
      console.log(`[EANAnalysis] Session ${sessionId}: No EAN column found - rejecting file`);
      
      // Extract UUID from storage path for file move
      const pathParts = session.file_storage_path.split('/');
      const uuidFromPath = pathParts.length >= 2 ? pathParts[1] : sessionId.toString();
      
      let newStoragePath = session.file_storage_path;
      try {
        newStoragePath = await moveToRejected(
          uuidFromPath,
          session.file_name,
          session.file_storage_path
        );
        console.log(`[EANAnalysis] File moved to rejected/: ${newStoragePath}`);
      } catch (moveError) {
        console.error(`[EANAnalysis] Failed to move file to rejected/: ${moveError}`);
        // Continue - file stays in current location
      }
      
      await supabase
        .from('import_sessions')
        .update({
          status: 'rejected',
          error_message: 'No EAN/GTIN-13 column found in file. File cannot proceed without EAN codes.',
          ean_analysis_at: new Date().toISOString(),
          file_storage_path: newStoragePath, // Update path if file was moved
        })
        .eq('id', sessionId);

      console.log(`[EANAnalysis] Session ${sessionId}: File rejected - no EAN column`);
      return;
    }

    if (eanColumns.length > 1) {
      // Multiple EAN columns - need user selection
      const columnsList = eanColumns.join(', ');
      
      console.log(`[EANAnalysis] Session ${sessionId}: Multiple EAN columns detected: ${columnsList}`);
      
      // Update status to waiting_column_selection
      const { error: updateError } = await supabase
        .from('import_sessions')
        .update({
          status: 'waiting_column_selection',
          error_message: `Multiple EAN columns detected: ${columnsList}. Please select the correct column.`,
          ean_analysis_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .eq('status', 'analyzing_ean'); // Only update if still 'analyzing_ean' (atomic lock)

      if (updateError) {
        console.error(`[EANAnalysis] Failed to update session ${sessionId} to waiting_column_selection:`, updateError);
        throw new Error(`Failed to update session status: ${updateError.message}`);
      }

      console.log(`[EANAnalysis] Successfully updated session ${sessionId} status to: waiting_column_selection`);
      console.log(`[EANAnalysis] Detected columns: ${columnsList}`);
      
      return;
    }

    // Step 7: Single EAN column - proceed with analysis
    const selectedColumn = eanColumns[0];
    
    // Recreate file for analysis using the already-read data
    // IMPORTANT: Blob can only be read once, so we must use the stored data
    let fileForAnalysis: File;
    if (session.file_type === 'csv') {
      if (!csvText) {
        throw new Error('CSV text not available for analysis');
      }
      fileForAnalysis = new File([csvText], session.file_name, {
        type: 'text/csv',
      });
    } else {
      if (!excelBuffer) {
        throw new Error('Excel buffer not available for analysis');
      }
      fileForAnalysis = new File([excelBuffer], session.file_name, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    }

    let analysisResult;
    try {
      analysisResult = await analyzeEANs(fileForAnalysis, selectedColumn);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      await supabase
        .from('import_sessions')
        .update({
          status: 'failed',
          error_message: `Failed to analyze EAN codes: ${errorMessage}`,
        })
        .eq('id', sessionId);

      throw new Error(`EAN analysis failed: ${errorMessage}`);
    }

    // Step 7.5: Check 95% policy - reject if less than 95% of rows have valid EAN codes
    if (analysisResult.totalRows === 0) {
      // No data rows found
      const pathParts = session.file_storage_path.split('/');
      const uuidFromPath = pathParts.length >= 2 ? pathParts[1] : sessionId.toString();
      
      let newStoragePath = session.file_storage_path;
      try {
        newStoragePath = await moveToRejected(
          uuidFromPath,
          session.file_name,
          session.file_storage_path
        );
        console.log(`[EANAnalysis] File moved to rejected/: ${newStoragePath}`);
      } catch (moveError) {
        console.error(`[EANAnalysis] Failed to move file to rejected/: ${moveError}`);
      }
      
      await supabase
        .from('import_sessions')
        .update({
          status: 'rejected',
          error_message: 'Geen data rijen gevonden in bestand.',
          ean_analysis_at: new Date().toISOString(),
          file_storage_path: newStoragePath,
        })
        .eq('id', sessionId);

      console.log(`[EANAnalysis] Session ${sessionId}: File rejected - no data rows`);
      return;
    }

    if (analysisResult.validEANPercentage < 95) {
      // Less than 95% of rows have valid EAN codes - reject
      console.log(`[EANAnalysis] Session ${sessionId}: Insufficient valid EAN codes (${analysisResult.validEANPercentage.toFixed(1)}%) - rejecting file`);
      
      const pathParts = session.file_storage_path.split('/');
      const uuidFromPath = pathParts.length >= 2 ? pathParts[1] : sessionId.toString();
      
      let newStoragePath = session.file_storage_path;
      try {
        newStoragePath = await moveToRejected(
          uuidFromPath,
          session.file_name,
          session.file_storage_path
        );
        console.log(`[EANAnalysis] File moved to rejected/: ${newStoragePath}`);
      } catch (moveError) {
        console.error(`[EANAnalysis] Failed to move file to rejected/: ${moveError}`);
      }
      
      const errorMessage = `Onvoldoende geldige EAN codes: ${analysisResult.totalEANs} van ${analysisResult.totalRows} rijen hebben een geldige EAN code (${analysisResult.validEANPercentage.toFixed(1)}%). Minimum 95% vereist.`;
      
      await supabase
        .from('import_sessions')
        .update({
          status: 'rejected',
          error_message: errorMessage,
          ean_analysis_at: new Date().toISOString(),
          file_storage_path: newStoragePath,
        })
        .eq('id', sessionId);

      console.log(`[EANAnalysis] Session ${sessionId}: File rejected - insufficient valid EAN codes`);
      return;
    }

    // Step 8: Move file to approved/ folder and update database with results
    // Extract UUID from storage path for file move
    const pathParts = session.file_storage_path.split('/');
    const uuidFromPath = pathParts.length >= 2 ? pathParts[1] : sessionId.toString();
    
    let newStoragePath = session.file_storage_path;
    try {
      console.log(`[EANAnalysis] Moving file to approved/ for session ${sessionId}`);
      newStoragePath = await moveToApproved(
        uuidFromPath,
        session.file_name,
        session.file_storage_path
      );
      console.log(`[EANAnalysis] File moved to approved/: ${newStoragePath}`);
    } catch (moveError) {
      console.error(`[EANAnalysis] Failed to move file to approved/: ${moveError}`);
      // Log error but continue - file stays in current location
      // This is graceful degradation
    }
    
    // Update database with results and set status to 'approved' (auto-approved)
    const { error: updateError } = await supabase
      .from('import_sessions')
      .update({
        status: 'approved', // Auto-approved - has valid EAN column
        unique_ean_count: analysisResult.uniqueCount,
        duplicate_ean_count: analysisResult.duplicateCount,
        detected_ean_column: selectedColumn,
        ean_analysis_at: new Date().toISOString(),
        file_storage_path: newStoragePath, // Update path if file was moved
        error_message: null, // Clear any previous errors
      })
      .eq('id', sessionId);

    if (updateError) {
      throw new Error(
        `Failed to update session with EAN analysis results: ${updateError.message}`
      );
    }

    console.log(
      `[EANAnalysis] Successfully analyzed and approved session ${sessionId}: ${analysisResult.uniqueCount} unique EANs, ${analysisResult.duplicateCount} duplicates`
    );

    // Trigger JSON conversion automatically (fire-and-forget)
    // JSON conversion will be picked up by process-queue
    try {
      const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      fetch(`${origin}/api/process-queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).catch((err) => {
        console.error('[EANAnalysis] Failed to trigger JSON conversion:', err);
        // Don't fail the request if JSON conversion trigger fails
      });
    } catch (triggerError) {
      console.error('[EANAnalysis] Error triggering JSON conversion:', triggerError);
      // Continue - JSON conversion will be picked up by next queue poll
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`[EANAnalysis] Error processing session ${sessionId}:`, errorMessage);

    // Ensure session is marked as failed if not already updated
    try {
      await supabase
        .from('import_sessions')
        .update({
          status: 'failed',
          error_message: errorMessage,
        })
        .eq('id', sessionId);
    } catch (updateError) {
      console.error(
        `[EANAnalysis] Failed to update session ${sessionId} status to failed:`,
        updateError
      );
    }

    throw error;
  }
}

/**
 * Process EAN analysis with a user-selected column
 * @param sessionId Import session ID
 * @param columnName Name of the EAN column to use
 * @throws Error if processing fails
 */
export async function processEANAnalysisWithColumn(
  sessionId: number,
  columnName: string
): Promise<void> {
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

    if (!session.file_storage_path) {
      throw new Error(`Session ${sessionId} has no storage path`);
    }

    if (session.status !== 'waiting_column_selection') {
      throw new Error(
        `Session ${sessionId} has status '${session.status}', expected 'waiting_column_selection'`
      );
    }

    // Step 2: Download file
    const fileBlob = await downloadFileFromStorage(STORAGE_BUCKET_NAME, session.file_storage_path);
    const file = new File([fileBlob], session.file_name, {
      type: session.file_type === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    // Step 3: Analyze EANs
    const analysisResult = await analyzeEANs(file, columnName);

    // Step 3.5: Check 95% policy - reject if less than 95% of rows have valid EAN codes
    if (analysisResult.totalRows === 0) {
      // No data rows found
      const pathParts = session.file_storage_path.split('/');
      const uuidFromPath = pathParts.length >= 2 ? pathParts[1] : sessionId.toString();
      
      let newStoragePath = session.file_storage_path;
      try {
        newStoragePath = await moveToRejected(
          uuidFromPath,
          session.file_name,
          session.file_storage_path
        );
        console.log(`[EANAnalysis] File moved to rejected/: ${newStoragePath}`);
      } catch (moveError) {
        console.error(`[EANAnalysis] Failed to move file to rejected/: ${moveError}`);
      }
      
      await supabase
        .from('import_sessions')
        .update({
          status: 'rejected',
          error_message: 'Geen data rijen gevonden in bestand.',
          ean_analysis_at: new Date().toISOString(),
          file_storage_path: newStoragePath,
        })
        .eq('id', sessionId);

      console.log(`[EANAnalysis] Session ${sessionId}: File rejected - no data rows`);
      return;
    }

    if (analysisResult.validEANPercentage < 95) {
      // Less than 95% of rows have valid EAN codes - reject
      console.log(`[EANAnalysis] Session ${sessionId}: Insufficient valid EAN codes (${analysisResult.validEANPercentage.toFixed(1)}%) - rejecting file`);
      
      const pathParts = session.file_storage_path.split('/');
      const uuidFromPath = pathParts.length >= 2 ? pathParts[1] : sessionId.toString();
      
      let newStoragePath = session.file_storage_path;
      try {
        newStoragePath = await moveToRejected(
          uuidFromPath,
          session.file_name,
          session.file_storage_path
        );
        console.log(`[EANAnalysis] File moved to rejected/: ${newStoragePath}`);
      } catch (moveError) {
        console.error(`[EANAnalysis] Failed to move file to rejected/: ${moveError}`);
      }
      
      const errorMessage = `Onvoldoende geldige EAN codes: ${analysisResult.totalEANs} van ${analysisResult.totalRows} rijen hebben een geldige EAN code (${analysisResult.validEANPercentage.toFixed(1)}%). Minimum 95% vereist.`;
      
      await supabase
        .from('import_sessions')
        .update({
          status: 'rejected',
          error_message: errorMessage,
          ean_analysis_at: new Date().toISOString(),
          file_storage_path: newStoragePath,
        })
        .eq('id', sessionId);

      console.log(`[EANAnalysis] Session ${sessionId}: File rejected - insufficient valid EAN codes`);
      return;
    }

    // Step 4: Move file to approved/ folder and update database
    // Extract UUID from storage path for file move
    const pathParts = session.file_storage_path.split('/');
    const uuidFromPath = pathParts.length >= 2 ? pathParts[1] : sessionId.toString();
    
    let newStoragePath = session.file_storage_path;
    try {
      console.log(`[EANAnalysis] Moving file to approved/ for session ${sessionId}`);
      newStoragePath = await moveToApproved(
        uuidFromPath,
        session.file_name,
        session.file_storage_path
      );
      console.log(`[EANAnalysis] File moved to approved/: ${newStoragePath}`);
    } catch (moveError) {
      console.error(`[EANAnalysis] Failed to move file to approved/: ${moveError}`);
      // Log error but continue - file stays in current location
    }
    
    // Update database with results and set status to 'approved' (auto-approved)
    const { error: updateError } = await supabase
      .from('import_sessions')
      .update({
        status: 'approved', // Auto-approved - has valid EAN column
        unique_ean_count: analysisResult.uniqueCount,
        duplicate_ean_count: analysisResult.duplicateCount,
        detected_ean_column: columnName,
        ean_analysis_at: new Date().toISOString(),
        file_storage_path: newStoragePath, // Update path if file was moved
        error_message: null,
      })
      .eq('id', sessionId);

    if (updateError) {
      throw new Error(
        `Failed to update session with EAN analysis results: ${updateError.message}`
      );
    }

    console.log(
      `[EANAnalysis] Successfully analyzed and approved session ${sessionId} with column ${columnName}: ${analysisResult.uniqueCount} unique EANs, ${analysisResult.duplicateCount} duplicates`
    );

    // Trigger JSON conversion automatically (fire-and-forget)
    // JSON conversion will be picked up by process-queue
    try {
      const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      fetch(`${origin}/api/process-queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).catch((err) => {
        console.error('[EANAnalysis] Failed to trigger JSON conversion:', err);
        // Don't fail the request if JSON conversion trigger fails
      });
    } catch (triggerError) {
      console.error('[EANAnalysis] Error triggering JSON conversion:', triggerError);
      // Continue - JSON conversion will be picked up by next queue poll
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`[EANAnalysis] Error processing session ${sessionId}:`, errorMessage);

    await supabase
      .from('import_sessions')
      .update({
        status: 'failed',
        error_message: errorMessage,
      })
      .eq('id', sessionId);

    throw error;
  }
}

