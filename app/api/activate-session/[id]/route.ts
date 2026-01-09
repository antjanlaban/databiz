import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { convertApprovedDatasetToJSON, loadJSONDataFromStorage } from '@/lib/dataConverter';
import {
  detectBrandColumn,
  extractDistinctBrandValues,
  checkBrandsExist,
  createBrand,
  getAllBrands,
} from '@/lib/brandDetector';
import { generateNames, validateTemplate, checkNameUniqueness, NameTemplate } from '@/lib/nameGenerator';
import {
  detectDuplicates,
  deactivateVariants,
} from '@/lib/duplicateDetector';
import { EANVariant } from '@/lib/database.types';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for large datasets

/**
 * GET /api/activate-session/[id]
 * Get activation data (JSON data, columns, etc.)
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

    // Fetch session
    const { data: session, error: sessionError } = await supabase
      .from('import_sessions')
      .select('*')
      .eq('id', sessionIdNum)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // Only allow activation for sessions with ready_for_activation or activating status
    // JSON conversion must be completed before activation can start
    if (session.status !== 'ready_for_activation' && session.status !== 'activating') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Session status is '${session.status}', expected 'ready_for_activation' or 'activating'. JSON conversion must be completed first.` 
        },
        { status: 400 }
      );
    }

    // Try to load JSON data
    let jsonData: Record<string, any>[] | null = null;
    let columns: string[] = [];
    let error: string | null = null;

    try {
      jsonData = await loadJSONDataFromStorage(sessionIdNum);
      if (jsonData && jsonData.length > 0) {
        columns = Object.keys(jsonData[0]);
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      // JSON not found is OK, it means we need to convert first
    }

    // Get all brands for selection
    const brands = await getAllBrands();

    // Detect brand column if JSON data is available
    let detectedBrandColumn: string | null = null;
    if (jsonData && columns.length > 0) {
      detectedBrandColumn = detectBrandColumn(columns);
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        file_name: session.file_name,
        status: session.status,
        total_rows_in_file: session.total_rows_in_file,
        columns_count: session.columns_count,
        detected_ean_column: session.detected_ean_column,
      },
      data: {
        hasJsonData: jsonData !== null,
        rowCount: jsonData?.length || 0,
        columns,
        detectedBrandColumn,
        error,
      },
      brands,
    });
  } catch (error) {
    console.error('[ActivateSession] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/activate-session/[id]
 * Handle activation workflow actions
 */
export async function POST(
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

    const body = await request.json();
    const { action } = body;

    const supabase = getSupabaseServer();

    // Fetch session
    const { data: session, error: sessionError } = await supabase
      .from('import_sessions')
      .select('*')
      .eq('id', sessionIdNum)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // Handle different actions
    switch (action) {
      case 'prepare':
        return await handlePrepare(sessionIdNum, session);
      
      case 'detect-brand':
        return await handleDetectBrand(sessionIdNum, body);
      
      case 'map-columns':
        return await handleMapColumns(sessionIdNum, body);
      
      case 'configure-template':
        return await handleConfigureTemplate(sessionIdNum, body);
      
      case 'activate':
        return await handleActivate(sessionIdNum, body);
      
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[ActivateSession] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * Prepare: Load JSON data (conversion happens automatically, this just loads it)
 * Note: JSON conversion is now automatic after approved status, so this function
 * just verifies JSON exists and loads it
 */
async function handlePrepare(sessionId: number, session: any) {
  const supabase = getSupabaseServer();

  // JSON conversion should already be done (status should be ready_for_activation)
  if (session.status !== 'ready_for_activation' && session.status !== 'activating') {
    return NextResponse.json(
      { 
        success: false, 
        error: `Session status is '${session.status}', expected 'ready_for_activation' or 'activating'. JSON conversion must be completed first.` 
      },
      { status: 400 }
    );
  }

  try {
    // Load JSON data (should already exist)
    const jsonData = await loadJSONDataFromStorage(sessionId);
    const columns = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];

    return NextResponse.json({
      success: true,
      rowCount: jsonData.length,
      columns,
      message: 'JSON data loaded successfully',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        error: 'JSON_NOT_FOUND',
        message: `JSON data not found: ${errorMessage}. Please wait for JSON conversion to complete.`,
      },
      { status: 404 }
    );
  }
}

/**
 * Detect brand: Check if brand column exists and validate brands
 */
async function handleDetectBrand(sessionId: number, body: any) {
  const { brandColumn, manualBrand } = body;

  if (manualBrand) {
    // Manual brand selection (one brand for entire dataset)
    return NextResponse.json({
      success: true,
      mode: 'manual',
      brand: manualBrand,
    });
  }

  if (!brandColumn) {
    return NextResponse.json(
      { success: false, error: 'brandColumn or manualBrand required' },
      { status: 400 }
    );
  }

  // Load JSON data
  const jsonData = await loadJSONDataFromStorage(sessionId);

  // Extract distinct brand values
  const brandValues = extractDistinctBrandValues(jsonData, brandColumn);

  // Check which brands exist
  const { existing, missing } = await checkBrandsExist(brandValues);

  return NextResponse.json({
    success: true,
    mode: 'column',
    brandColumn,
    brandValues,
    existing,
    missing,
  });
}

/**
 * Map columns: Store column mappings
 */
async function handleMapColumns(sessionId: number, body: any) {
  const { colorColumn, sizeColumn } = body;

  // Validate required columns
  if (!colorColumn || !sizeColumn) {
    return NextResponse.json(
      { success: false, error: 'colorColumn and sizeColumn are required' },
      { status: 400 }
    );
  }

  // Store mappings (we'll use this in activate step)
  // For now, just validate
  const jsonData = await loadJSONDataFromStorage(sessionId);
  const columns = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];

  if (!columns.includes(colorColumn)) {
    return NextResponse.json(
      { success: false, error: `Color column '${colorColumn}' not found` },
      { status: 400 }
    );
  }

  if (!columns.includes(sizeColumn)) {
    return NextResponse.json(
      { success: false, error: `Size column '${sizeColumn}' not found` },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    mappings: {
      color: colorColumn,
      size: sizeColumn,
    },
  });
}

/**
 * Configure template: Validate name template
 */
async function handleConfigureTemplate(sessionId: number, body: any) {
  const { template } = body as { template: NameTemplate };

  if (!template) {
    return NextResponse.json(
      { success: false, error: 'template is required' },
      { status: 400 }
    );
  }

  // Validate template
  const validation = validateTemplate(template);
  if (!validation.valid) {
    return NextResponse.json(
      { success: false, error: `Template validation failed: ${validation.errors.join('; ')}` },
      { status: 400 }
    );
  }

  // Load JSON data and generate preview names
  const jsonData = await loadJSONDataFromStorage(sessionId);
  const previewRows = jsonData.slice(0, 5);
  const previewNames = generateNames(template, previewRows);

  // Check uniqueness
  const allNames = generateNames(template, jsonData);
  const uniqueness = checkNameUniqueness(allNames);

  return NextResponse.json({
    success: true,
    preview: previewNames,
    uniqueness,
  });
}

/**
 * Activate: Create EAN variants
 */
async function handleActivate(sessionId: number, body: any) {
  const {
    brandId,
    brandColumn,
    manualBrand,
    colorColumn,
    sizeColumn,
    template,
    eanColumn,
  } = body;

  const supabase = getSupabaseServer();

  // Verify session status is ready_for_activation before allowing activation
  const { data: session, error: sessionError } = await supabase
    .from('import_sessions')
    .select('status')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json(
      { success: false, error: 'Session not found' },
      { status: 404 }
    );
  }

  if (session.status !== 'ready_for_activation') {
    return NextResponse.json(
      { 
        success: false, 
        error: `Session status is '${session.status}', expected 'ready_for_activation'. JSON conversion must be completed first.` 
      },
      { status: 400 }
    );
  }

  // Validate required fields
  if (!brandId && !manualBrand && !brandColumn) {
    return NextResponse.json(
      { success: false, error: 'brandId, manualBrand, or brandColumn is required' },
      { status: 400 }
    );
  }

  if (!colorColumn || !sizeColumn) {
    return NextResponse.json(
      { success: false, error: 'colorColumn and sizeColumn are required' },
      { status: 400 }
    );
  }

  if (!template) {
    return NextResponse.json(
      { success: false, error: 'template is required' },
      { status: 400 }
    );
  }

  if (!eanColumn) {
    return NextResponse.json(
      { success: false, error: 'eanColumn is required' },
      { status: 400 }
    );
  }

  try {
    // Update session status to activating
    await supabase
      .from('import_sessions')
      .update({ status: 'activating' })
      .eq('id', sessionId);

    // Load JSON data
    const jsonData = await loadJSONDataFromStorage(sessionId);

    // Get all brands for matching if brandColumn is used
    let brandMap: Map<string, string> | null = null;
    if (brandColumn) {
      const allBrands = await getAllBrands();
      brandMap = new Map();
      allBrands.forEach(brand => {
        brandMap!.set(brand.name.toLowerCase(), brand.id!);
      });
    }

    // Determine brand ID strategy
    let finalBrandId: string | null = null;
    if (manualBrand) {
      // Create brand if it doesn't exist, or get existing
      const { existing, missing } = await checkBrandsExist([manualBrand]);
      if (existing.length > 0) {
        finalBrandId = existing[0].id!;
      } else {
        const newBrand = await createBrand(manualBrand);
        finalBrandId = newBrand.id!;
      }
    } else if (brandId) {
      finalBrandId = brandId;
    }
    // If brandColumn, we'll determine per row

    // Generate names for all rows
    const names = generateNames(template, jsonData);

    // Prepare rows for duplicate detection
    const rowsForDuplicateCheck = jsonData.map((row, index) => ({
      ean: String(row[eanColumn] || '').trim(),
      name: names[index] || '',
    }));

    // Detect duplicates
    const duplicateResults = await detectDuplicates(rowsForDuplicateCheck);

    // Deactivate existing variants
    const variantsToDeactivate = duplicateResults
      .filter(r => r.isDuplicate && r.existingVariant)
      .map(r => r.existingVariant!.id!);
    
    if (variantsToDeactivate.length > 0) {
      await deactivateVariants(variantsToDeactivate);
    }

    // Prepare EAN variants for insertion
    const variantsToInsert: Omit<EANVariant, 'id' | 'created_at' | 'updated_at'>[] = [];
    const errors: string[] = [];

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const ean = String(row[eanColumn] || '').trim();
      const color = String(row[colorColumn] || '').trim();
      const size = String(row[sizeColumn] || '').trim();
      const name = names[i] || '';

      // Determine brand ID for this row
      let rowBrandId: string;
      if (brandColumn) {
        // Get brand from column
        const brandValue = String(row[brandColumn] || '').trim();
        if (!brandValue) {
          errors.push(`Row ${i + 1}: Brand value is empty`);
          continue;
        }
        
        // Find or create brand
        const normalizedBrand = brandValue.toLowerCase();
        const existingBrandId = brandMap?.get(normalizedBrand);
        
        if (existingBrandId) {
          rowBrandId = existingBrandId;
        } else {
          // Create brand if it doesn't exist
          try {
            const newBrand = await createBrand(brandValue);
            rowBrandId = newBrand.id!;
            // Update brandMap for future rows
            brandMap!.set(normalizedBrand, rowBrandId);
          } catch (error) {
            errors.push(`Row ${i + 1}: Failed to create brand '${brandValue}': ${error instanceof Error ? error.message : String(error)}`);
            continue;
          }
        }
      } else {
        // Use single brand for all rows
        if (!finalBrandId) {
          errors.push(`Row ${i + 1}: No brand ID available`);
          continue;
        }
        rowBrandId = finalBrandId;
      }

      // Validate required fields
      if (!ean) {
        errors.push(`Row ${i + 1}: EAN is empty`);
        continue;
      }
      if (!color) {
        errors.push(`Row ${i + 1}: Color is empty`);
        continue;
      }
      if (!size) {
        errors.push(`Row ${i + 1}: Size is empty`);
        continue;
      }
      if (!name) {
        errors.push(`Row ${i + 1}: Name is empty`);
        continue;
      }

      variantsToInsert.push({
        ean,
        brand_id: rowBrandId,
        color,
        size,
        name,
        import_session_id: sessionId,
        is_active: true,
      });
    }

    // Batch insert variants (500 per batch)
    const batchSize = 500;
    let insertedCount = 0;

    for (let i = 0; i < variantsToInsert.length; i += batchSize) {
      const batch = variantsToInsert.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('ean_variants')
        .insert(batch);

      if (insertError) {
        // Handle unique constraint violation (EAN already exists)
        if (insertError.code === '23505') {
          // EAN already exists, skip this batch or handle individually
          console.warn(`[Activate] Batch ${i / batchSize + 1} has duplicate EANs, skipping`);
        } else {
          throw new Error(`Failed to insert variants: ${insertError.message}`);
        }
      } else {
        insertedCount += batch.length;
      }
    }

    // Update session
    const duplicatesCount = duplicateResults.filter(r => r.isDuplicate).length;

    await supabase
      .from('import_sessions')
      .update({
        status: 'activated',
        activated_variants_count: insertedCount,
        activated_duplicates_count: duplicatesCount,
        activated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return NextResponse.json({
      success: true,
      inserted: insertedCount,
      duplicates: duplicatesCount,
      errors: errors.length > 0 ? errors.slice(0, 10) : [], // Return first 10 errors
      totalErrors: errors.length,
    });
  } catch (error) {
    // Update session with error
    await supabase
      .from('import_sessions')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : String(error),
      })
      .eq('id', sessionId);

    throw error;
  }
}

