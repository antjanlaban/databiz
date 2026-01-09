import { getSupabaseServer } from './supabase-server';
import { downloadFileFromStorage, STORAGE_BUCKET_NAME, moveToProcessing } from './storage';
import { getFileMetadata, ParseMetadata } from './fileParser';

/**
 * Process a file by downloading it, extracting metadata, and updating the session
 * @param sessionId Import session ID
 * @throws Error if processing fails
 */
export async function processFile(sessionId: number): Promise<ParseMetadata> {
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

    if (session.status !== 'parsing') {
      console.warn(
        `[FileProcessor] Session ${sessionId} has status '${session.status}', expected 'parsing'`
      );
    }

    console.log(`[FileProcessor] Processing session ${sessionId}: ${session.file_name}`);

    // Step 2: Download file from storage
    let fileBlob: Blob;
    try {
      fileBlob = await downloadFileFromStorage(STORAGE_BUCKET_NAME, session.file_storage_path);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      
      // Update session with error
      await supabase
        .from('import_sessions')
        .update({
          status: 'failed',
          error_message: `Failed to download file from storage: ${errorMessage}`,
        })
        .eq('id', sessionId);

      throw new Error(`Storage download failed: ${errorMessage}`);
    }

    // Step 3: Convert Blob to File for parser
    // Note: We need to reconstruct the File object with the original filename
    const file = new File([fileBlob], session.file_name, {
      type: session.file_type === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    // Step 4: Extract metadata (row and column counts)
    let metadata: ParseMetadata;
    try {
      metadata = await getFileMetadata(file);
      console.log(
        `[FileProcessor] Extracted metadata for session ${sessionId}: ${metadata.rowCount} rows, ${metadata.columnCount} columns`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Update session with error
      await supabase
        .from('import_sessions')
        .update({
          status: 'failed',
          error_message: `Failed to parse file: ${errorMessage}`,
        })
        .eq('id', sessionId);

      throw new Error(`File parsing failed: ${errorMessage}`);
    }

    // Step 5: Move file from incoming/ to processing/ folder
    // Extract UUID from storage path (format: incoming/{uuid}/{filename})
    let newStoragePath: string;
    try {
      const pathParts = session.file_storage_path.split('/');
      const uuidFromPath = pathParts.length >= 2 ? pathParts[1] : sessionId.toString();
      
      console.log(`[FileProcessor] Moving file from incoming/ to processing/ for session ${sessionId}`);
      newStoragePath = await moveToProcessing(
        uuidFromPath,
        session.file_name,
        session.file_storage_path
      );
      console.log(`[FileProcessor] File moved to: ${newStoragePath}`);
    } catch (moveError) {
      const moveErrorMessage = moveError instanceof Error ? moveError.message : String(moveError);
      console.error(`[FileProcessor] Failed to move file to processing/: ${moveErrorMessage}`);
      // Log error but continue - file stays in incoming/ folder
      // This is graceful degradation - we can still process the file
      newStoragePath = session.file_storage_path;
    }

    // Step 6: Update session with metadata and new status
    const { error: updateError } = await supabase
      .from('import_sessions')
      .update({
        status: 'analyzing_ean',
        total_rows_in_file: metadata.rowCount,
        columns_count: metadata.columnCount,
        parsed_at: new Date().toISOString(),
        file_storage_path: newStoragePath, // Update path if file was moved
        error_message: null, // Clear any previous errors
      })
      .eq('id', sessionId);

    if (updateError) {
      throw new Error(
        `Failed to update session with metadata: ${updateError.message}`
      );
    }

    console.log(
      `[FileProcessor] Successfully processed session ${sessionId}: ${metadata.rowCount} rows, ${metadata.columnCount} columns`
    );

    return metadata;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    console.error(`[FileProcessor] Error processing session ${sessionId}:`, errorMessage);

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
        `[FileProcessor] Failed to update session ${sessionId} status to failed:`,
        updateError
      );
    }

    throw error;
  }
}

