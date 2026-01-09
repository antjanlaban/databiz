import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { processFile } from '@/lib/fileProcessor';
import { convertApprovedDatasetToJSON } from '@/lib/dataConverter';

export const dynamic = 'force-dynamic';
// Set timeout for processing large files (5 minutes)
export const maxDuration = 300;

/**
 * POST /api/process-queue
 * Process files with status 'parsing' or 'approved' from the queue
 * - 'parsing': Process file and trigger EAN analysis
 * - 'approved': Convert to JSON automatically
 * Uses database-level locking to prevent concurrent processing of the same file
 */
export async function POST(request: NextRequest) {
  console.log('[Queue] Process queue endpoint called');
  
  try {
    const supabase = getSupabaseServer();

    // Step 1: First check for approved or converting sessions that need JSON conversion
    // Include 'converting' to handle retry scenarios where conversion was interrupted
    console.log('[Queue] Searching for sessions with status "approved" or "converting" (for JSON conversion)');
    
    const { data: approvedSessions, error: approvedSelectError } = await supabase
      .from('import_sessions')
      .select('id, file_name, status, file_storage_path')
      .in('status', ['approved', 'converting'])
      .order('created_at', { ascending: true })
      .limit(1);

    if (approvedSelectError) {
      console.error('[Queue] Error selecting approved sessions:', approvedSelectError);
    }

    if (approvedSessions && approvedSessions.length > 0) {
      const sessionId = approvedSessions[0].id;
      console.log('[Queue] Found approved session for JSON conversion:', sessionId, approvedSessions[0].file_name);

      try {
        // Convert to JSON (this will update status: approved → converting → ready_for_activation)
        const jsonPath = await convertApprovedDatasetToJSON(sessionId);
        
        console.log('[Queue] Successfully converted session to JSON:', sessionId, jsonPath);
        
        return NextResponse.json(
          {
            success: true,
            processed: 1,
            sessionId: sessionId,
            action: 'json_conversion',
            jsonPath: jsonPath,
            message: 'JSON conversion completed successfully',
          },
          { status: 200 }
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Queue] Error converting session ${sessionId} to JSON:`, errorMessage);

        // Status already updated to 'failed' by convertApprovedDatasetToJSON
        return NextResponse.json(
          {
            success: false,
            processed: 0,
            sessionId: sessionId,
            action: 'json_conversion',
            error: 'JSON_CONVERSION_ERROR',
            message: `Failed to convert to JSON: ${errorMessage}`,
          },
          { status: 500 }
        );
      }
    }

    // Step 2: If no approved sessions, check for parsing sessions
    console.log('[Queue] Searching for sessions with status "parsing"');
    
    const { data: parsingSessions, error: selectError } = await supabase
      .from('import_sessions')
      .select('id, file_name, status, file_storage_path')
      .eq('status', 'parsing')
      .order('created_at', { ascending: true })
      .limit(1);

    if (selectError) {
      console.error('[Queue] Error selecting queued sessions:', selectError);
      return NextResponse.json(
        {
          success: false,
          error: 'DATABASE_ERROR',
          message: `Failed to query queue: ${selectError.message}`,
        },
        { status: 500 }
      );
    }

    console.log('[Queue] Found parsing sessions:', parsingSessions?.length || 0);

    if (!parsingSessions || parsingSessions.length === 0) {
      console.log('[Queue] No files in queue');
      return NextResponse.json(
        {
          success: true,
          processed: 0,
          message: 'No files in queue',
        },
        { status: 200 }
      );
    }

    const sessionId = parsingSessions[0].id;
    console.log('[Queue] Processing session:', sessionId, parsingSessions[0].file_name);

    // Step 3: Process the file (processFile will handle status update and file move)
    try {
      const metadata = await processFile(sessionId);
      
      console.log('[Queue] Successfully processed session:', sessionId, metadata);
      
      // Step 4: Trigger EAN analysis automatically (fire-and-forget)
      // Note: processFile already updated status to 'analyzing_ean' and moved file to processing/
      try {
        const origin = request.headers.get('origin') || request.nextUrl.origin;
        fetch(`${origin}/api/analyze-ean`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }).catch((err) => {
          console.error('[Queue] Failed to trigger EAN analysis:', err);
          // Don't fail the request if EAN analysis trigger fails
        });
      } catch (triggerError) {
        console.error('[Queue] Error triggering EAN analysis:', triggerError);
        // Continue with response even if trigger fails
      }
      
      return NextResponse.json(
        {
          success: true,
          processed: 1,
          sessionId: sessionId,
          action: 'file_processing',
          metadata: {
            rowCount: metadata.rowCount,
            columnCount: metadata.columnCount,
          },
          message: 'File processed successfully',
        },
        { status: 200 }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      console.error(`[Queue] Error processing session ${sessionId}:`, errorMessage);

      // Session status already updated by processFile on error
      return NextResponse.json(
        {
          success: false,
          processed: 0,
          sessionId: sessionId,
          action: 'file_processing',
          error: 'PROCESSING_ERROR',
          message: `Failed to process file: ${errorMessage}`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Queue] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'UNEXPECTED_ERROR',
        message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 }
    );
  }
}

