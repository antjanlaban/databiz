import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * POST /api/test-ean-analysis
 * Test endpoint to trigger EAN analysis for all sessions with analyzing_ean status
 * This is a testing/debugging endpoint
 */
export async function POST(request: NextRequest) {
  console.log('[TestEAN] Test EAN analysis endpoint called');
  
  try {
    const supabase = getSupabaseServer();

    // Find all sessions with analyzing_ean status
    const { data: readySessions, error: selectError } = await supabase
      .from('import_sessions')
      .select('id, file_name, status, unique_ean_count, duplicate_ean_count, detected_ean_column')
      .eq('status', 'analyzing_ean')
      .order('created_at', { ascending: true });

    if (selectError) {
      console.error('[TestEAN] Error selecting sessions:', selectError);
      return NextResponse.json(
        {
          success: false,
          error: 'DATABASE_ERROR',
          message: `Failed to query sessions: ${selectError.message}`,
        },
        { status: 500 }
      );
    }

    if (!readySessions || readySessions.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: 'No sessions with analyzing_ean status found',
          sessions: [],
        },
        { status: 200 }
      );
    }

    console.log(`[TestEAN] Found ${readySessions.length} sessions ready for EAN analysis`);

    // Trigger EAN analysis for each session
    const results = [];
    const origin = request.headers.get('origin') || request.nextUrl.origin;

    for (const session of readySessions) {
      console.log(`[TestEAN] Triggering EAN analysis for session ${session.id}: ${session.file_name}`);
      
      try {
        const response = await fetch(`${origin}/api/analyze-ean`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        const data = await response.json();
        
        results.push({
          sessionId: session.id,
          fileName: session.file_name,
          status: session.status,
          success: response.ok && data.success,
          message: data.message || data.error,
          processed: data.processed || 0,
        });

        // Wait a bit between requests to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({
          sessionId: session.id,
          fileName: session.file_name,
          status: session.status,
          success: false,
          message: error instanceof Error ? error.message : String(error),
          processed: 0,
        });
      }
    }

    // Fetch updated session data
    const { data: updatedSessions } = await supabase
      .from('import_sessions')
      .select('id, file_name, status, unique_ean_count, duplicate_ean_count, detected_ean_column, error_message')
      .in('id', readySessions.map(s => s.id))
      .order('created_at', { ascending: true });

    return NextResponse.json(
      {
        success: true,
        message: `Processed ${readySessions.length} sessions`,
        sessions: updatedSessions || readySessions,
        results: results,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[TestEAN] Unexpected error:', error);
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

/**
 * GET /api/test-ean-analysis
 * Get status of sessions ready for EAN analysis
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServer();

    const { data: readySessions, error: selectError } = await supabase
      .from('import_sessions')
      .select('id, file_name, status, unique_ean_count, duplicate_ean_count, detected_ean_column, error_message, created_at')
      .eq('status', 'analyzing_ean')
      .order('created_at', { ascending: true });

    if (selectError) {
      return NextResponse.json(
        {
          success: false,
          error: 'DATABASE_ERROR',
          message: `Failed to query sessions: ${selectError.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        count: readySessions?.length || 0,
        sessions: readySessions || [],
      },
      { status: 200 }
    );
  } catch (error) {
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

