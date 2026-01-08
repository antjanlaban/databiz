import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { processEANAnalysis } from '@/lib/eanAnalysisProcessor';

export const dynamic = 'force-dynamic';
// Set timeout for processing large files (5 minutes)
export const maxDuration = 300;

/**
 * POST /api/analyze-ean
 * Process EAN analysis for files with status 'analyzing_ean'
 * Uses database-level locking to prevent concurrent processing of the same file
 */
export async function POST(request: NextRequest) {
  console.log('[EANAnalysis] Analyze EAN endpoint called');
  
  try {
    const supabase = getSupabaseServer();

    // Step 1: Find a session with status 'analyzing_ean'
    // Also check for stuck analyses (status 'analyzing_ean' for more than 10 minutes without ean_analysis_at)
    console.log('[EANAnalysis] Searching for sessions ready for EAN analysis');
    
    // First, check for stuck analyses (analyzing_ean for more than 10 minutes without completion)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: stuckSessions } = await supabase
      .from('import_sessions')
      .select('id, file_name, status, ean_analysis_at')
      .eq('status', 'analyzing_ean')
      .not('ean_analysis_at', 'is', null)
      .lt('ean_analysis_at', tenMinutesAgo)
      .limit(1);
    
    if (stuckSessions && stuckSessions.length > 0) {
      console.log('[EANAnalysis] Found stuck analysis, will be retried:', stuckSessions[0].id);
      // Note: We don't reset status here - let it be retried naturally
    }
    
    const { data: readySessions, error: selectError } = await supabase
      .from('import_sessions')
      .select('id, file_name, status')
      .eq('status', 'analyzing_ean')
      .order('created_at', { ascending: true })
      .limit(1);

    if (selectError) {
      console.error('[EANAnalysis] Error selecting sessions:', selectError);
      return NextResponse.json(
        {
          success: false,
          error: 'DATABASE_ERROR',
          message: `Failed to query sessions: ${selectError.message}`,
        },
        { status: 500 }
      );
    }

    console.log('[EANAnalysis] Found sessions:', readySessions?.length || 0);

    if (!readySessions || readySessions.length === 0) {
      console.log('[EANAnalysis] No files ready for EAN analysis');
      return NextResponse.json(
        {
          success: true,
          processed: 0,
          message: 'No files ready for EAN analysis',
        },
        { status: 200 }
      );
    }

    const sessionId = readySessions[0].id;
    console.log('[EANAnalysis] Processing session:', sessionId, readySessions[0].file_name);

    // Step 2: Process EAN analysis (processEANAnalysis will handle status updates)
    try {
      await processEANAnalysis(sessionId);
      
      console.log('[EANAnalysis] Successfully analyzed session:', sessionId);
      
      return NextResponse.json(
        {
          success: true,
          processed: 1,
          sessionId: sessionId,
          message: 'EAN analysis completed successfully',
        },
        { status: 200 }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.error(`[EANAnalysis] Error processing session ${sessionId}:`, errorMessage);

      // Session status already updated by processEANAnalysis on error
      return NextResponse.json(
        {
          success: false,
          processed: 0,
          sessionId: sessionId,
          error: 'PROCESSING_ERROR',
          message: `Failed to analyze EAN codes: ${errorMessage}`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[EANAnalysis] Unexpected error:', error);
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

