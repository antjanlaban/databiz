import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { processFile } from '@/lib/fileProcessor';

export const dynamic = 'force-dynamic';
// Set timeout for processing large files (5 minutes)
export const maxDuration = 300;

/**
 * POST /api/process-queue
 * Process files with status 'parsing' from the queue
 * Uses database-level locking to prevent concurrent processing of the same file
 */
export async function POST(request: NextRequest) {
  console.log('[Queue] Process queue endpoint called');
  
  try {
    const supabase = getSupabaseServer();

    // Step 1: Find a session with status 'parsing' (already set by upload)
    // We process it and then update to 'analyzing_ean'
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

    console.log('[Queue] Found sessions:', parsingSessions?.length || 0);

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

    // Step 2: Process the file (processFile will handle status update and file move)
    try {
      const metadata = await processFile(sessionId);
      
      console.log('[Queue] Successfully processed session:', sessionId, metadata);
      
      // Step 3: Trigger EAN analysis automatically (fire-and-forget)
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
      const errorStack = error instanceof Error ? error.stack : undefined;

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/e76be008-7184-4337-ad4e-a2bce7ed3b96',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-queue/route.ts:105',message:'Queue processing error caught',data:{sessionId,error:errorMessage,errorStack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1,H2,H3,H4,H5,H6'})}).catch(()=>{});
      // #endregion

      console.error(`[Queue] Error processing session ${sessionId}:`, errorMessage);

      // Session status already updated by processFile on error
      return NextResponse.json(
        {
          success: false,
          processed: 0,
          sessionId: sessionId,
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

