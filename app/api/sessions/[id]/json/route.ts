import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { loadJSONDataFromStorage } from '@/lib/dataConverter';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sessions/[id]/json
 * Get JSON data for a session with server-side pagination and search
 * 
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Rows per page (default: 50, max: 200)
 * - search: Search term (optional, searches in all columns, case-insensitive)
 * 
 * @param request - NextRequest object
 * @param params - Route parameters containing id
 * @returns NextResponse with paginated JSON data
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const search = searchParams.get('search')?.trim() || null;

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

    // Load JSON data from storage
    let allData: Record<string, any>[];
    try {
      allData = await loadJSONDataFromStorage(sessionIdNum);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // If JSON not found and session is approved, try to convert it automatically
      if (
        (errorMessage.includes('not found') || 
         errorMessage.includes('does not exist') ||
         errorMessage.includes('JSON file not found')) &&
        session.status === 'approved'
      ) {
        console.log(`[Sessions/JSON] JSON not found for approved session ${sessionIdNum}, attempting automatic conversion...`);
        
        try {
          const { convertApprovedDatasetToJSON } = await import('@/lib/dataConverter');
          await convertApprovedDatasetToJSON(sessionIdNum);
          
          // Try loading again after conversion
          allData = await loadJSONDataFromStorage(sessionIdNum);
          console.log(`[Sessions/JSON] Successfully converted and loaded JSON for session ${sessionIdNum}`);
        } catch (convertError) {
          const convertErrorMessage = convertError instanceof Error ? convertError.message : String(convertError);
          console.error(`[Sessions/JSON] Failed to auto-convert JSON:`, convertErrorMessage);
          return NextResponse.json(
            { 
              success: false, 
              error: 'JSON data not found and automatic conversion failed',
              message: `Failed to convert dataset to JSON: ${convertErrorMessage}`,
            },
            { status: 500 }
          );
        }
      } else {
        // Other errors or session not approved
        if (errorMessage.includes('not found') || errorMessage.includes('No data')) {
          return NextResponse.json(
            { success: false, error: 'JSON data not found for this session' },
            { status: 404 }
          );
        }
        return NextResponse.json(
          { success: false, error: `Failed to load JSON data: ${errorMessage}` },
          { status: 500 }
        );
      }
    }

    if (!allData || allData.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: [],
          pagination: {
            page: 1,
            limit,
            total: 0,
            totalPages: 0,
          },
          columns: [],
          searchResults: 0,
        },
        { status: 200 }
      );
    }

    // Get column names from first row
    const columns = Object.keys(allData[0] || {});

    // Filter data if search term is provided
    let filteredData = allData;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredData = allData.filter((row) => {
        return columns.some((col) => {
          const value = row[col];
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(searchLower);
        });
      });
    }

    const total = filteredData.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      data: paginatedData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      columns,
      searchResults: search ? filteredData.length : null,
    });
  } catch (error) {
    console.error('Error in GET /api/sessions/[id]/json:', error);
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

