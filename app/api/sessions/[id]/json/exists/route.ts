import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { STORAGE_BUCKET_NAME, STORAGE_APPROVED_FOLDER } from '@/lib/upload-constants';
import { downloadFileFromStorage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sessions/[id]/json/exists
 * Check if JSON file exists for a session
 * 
 * @param request - NextRequest object
 * @param params - Route parameters containing id
 * @returns NextResponse with exists status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionIdNum = parseInt(id, 10);

    if (isNaN(sessionIdNum)) {
      return NextResponse.json(
        { success: false, error: 'Invalid session ID' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // Verify session exists
    const { data: session, error: sessionError } = await supabase
      .from('import_sessions')
      .select('id, status')
      .eq('id', sessionIdNum)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if JSON file exists (try new path structure first, then old structure for backward compatibility)
    let exists = false;
    let path = '';
    
    try {
      // Try new path structure first: approved/{sessionId}-data.json.gz
      path = `${STORAGE_APPROVED_FOLDER}/${sessionIdNum}-data.json.gz`;
      await downloadFileFromStorage(STORAGE_BUCKET_NAME, path);
      exists = true;
    } catch (error) {
      // Fallback to old path structure
      try {
        path = `${STORAGE_APPROVED_FOLDER}/${sessionIdNum}/data.json.gz`;
        await downloadFileFromStorage(STORAGE_BUCKET_NAME, path);
        exists = true;
      } catch {
        // Try uncompressed versions
        try {
          path = `${STORAGE_APPROVED_FOLDER}/${sessionIdNum}-data.json`;
          await downloadFileFromStorage(STORAGE_BUCKET_NAME, path);
          exists = true;
        } catch {
          try {
            path = `${STORAGE_APPROVED_FOLDER}/${sessionIdNum}/data.json`;
            await downloadFileFromStorage(STORAGE_BUCKET_NAME, path);
            exists = true;
          } catch {
            exists = false;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      exists,
      path: exists ? path : null,
    });
  } catch (error) {
    console.error('Error in GET /api/sessions/[id]/json/exists:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

