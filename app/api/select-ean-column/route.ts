import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { processEANAnalysisWithColumn } from '@/lib/eanAnalysisProcessor';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * POST /api/select-ean-column
 * Allows user to select an EAN column when multiple columns are detected
 * Body: { sessionId: number, columnName: string }
 */
export async function POST(request: NextRequest) {
  console.log('[EANColumnSelect] Select EAN column endpoint called');
  
  try {
    const body = await request.json();
    const { sessionId, columnName } = body;

    if (!sessionId || typeof sessionId !== 'number') {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'sessionId is required and must be a number',
        },
        { status: 400 }
      );
    }

    if (!columnName || typeof columnName !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'columnName is required and must be a string',
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // Verify session exists and is in correct state
    const { data: session, error: fetchError } = await supabase
      .from('import_sessions')
      .select('id, file_name, status')
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) {
      return NextResponse.json(
        {
          success: false,
          error: 'SESSION_NOT_FOUND',
          message: `Session ${sessionId} not found`,
        },
        { status: 404 }
      );
    }

    if (session.status !== 'waiting_column_selection') {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_STATUS',
          message: `Session ${sessionId} is not in 'waiting_column_selection' status. Current status: ${session.status}`,
        },
        { status: 400 }
      );
    }

    console.log(`[EANColumnSelect] Processing session ${sessionId} with column: ${columnName}`);

    // Process EAN analysis with selected column
    try {
      await processEANAnalysisWithColumn(sessionId, columnName);
      
      console.log(`[EANColumnSelect] Successfully analyzed session ${sessionId} with column ${columnName}`);
      
      return NextResponse.json(
        {
          success: true,
          sessionId: sessionId,
          columnName: columnName,
          message: 'EAN analysis completed successfully with selected column',
        },
        { status: 200 }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.error(`[EANColumnSelect] Error processing session ${sessionId}:`, errorMessage);

      return NextResponse.json(
        {
          success: false,
          sessionId: sessionId,
          error: 'PROCESSING_ERROR',
          message: `Failed to analyze EAN codes with selected column: ${errorMessage}`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[EANColumnSelect] Unexpected error:', error);
    
    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_JSON',
          message: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }

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

