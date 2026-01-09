/**
 * Script to check session status and storage files
 * Run with: npx tsx scripts/check-session-storage.ts <sessionId>
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { getSupabaseServer } from '../lib/supabase-server';
import { STORAGE_BUCKET_NAME, STORAGE_APPROVED_FOLDER } from '../lib/upload-constants';

async function checkSessionStorage(sessionId: number) {
  const supabase = getSupabaseServer();

  console.log(`🔍 Checking session ${sessionId} and storage...\n`);

  // 1. Check session in database
  console.log('📊 Database Session:');
  console.log('─'.repeat(50));
  
  const { data: session, error: sessionError } = await supabase
    .from('import_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessionError) {
    console.error('❌ Error fetching session:', sessionError.message);
    return;
  }

  if (!session) {
    console.error(`❌ Session ${sessionId} not found in database`);
    return;
  }

  console.log(`✅ Session found:`);
  console.log(`   ID: ${session.id}`);
  console.log(`   File: ${session.file_name}`);
  console.log(`   Status: ${session.status}`);
  console.log(`   Storage path: ${session.file_storage_path || 'N/A'}`);
  console.log(`   Created: ${session.created_at}`);

  // 2. Check storage files
  console.log('\n💾 Storage Files:');
  console.log('─'.repeat(50));

  // Try compressed version first, then uncompressed
  let jsonPath = `${STORAGE_APPROVED_FOLDER}/${sessionId}/data.json.gz`;
  console.log(`\n📁 Checking JSON file (compressed): ${jsonPath}`);

  // Try to download the compressed file
  let { data: fileData, error: downloadError } = await supabase.storage
    .from(STORAGE_BUCKET_NAME)
    .download(jsonPath);
  
  // If compressed doesn't exist, try uncompressed
  if (downloadError && (downloadError.message.includes('not found') || (downloadError as any).statusCode === 404)) {
    jsonPath = `${STORAGE_APPROVED_FOLDER}/${sessionId}/data.json`;
    console.log(`   Compressed not found, trying uncompressed: ${jsonPath}`);
    const result = await supabase.storage
      .from(STORAGE_BUCKET_NAME)
      .download(jsonPath);
    fileData = result.data;
    downloadError = result.error;
  }

  if (downloadError) {
    console.error(`❌ Error downloading JSON file:`);
    console.error(`   Message: ${downloadError.message}`);
    console.error(`   StatusCode: ${(downloadError as any).statusCode || 'N/A'}`);
    console.error(`   Full error:`, JSON.stringify(downloadError, null, 2));
    
    // Check if file exists by listing the folder
    console.log(`\n📂 Listing folder: ${STORAGE_APPROVED_FOLDER}/${sessionId}/`);
    const { data: folderFiles, error: listError } = await supabase.storage
      .from(STORAGE_BUCKET_NAME)
      .list(`${STORAGE_APPROVED_FOLDER}/${sessionId}`);

    if (listError) {
      console.error(`   ❌ Error listing folder: ${listError.message}`);
    } else if (folderFiles && folderFiles.length > 0) {
      console.log(`   ✅ Folder exists, files found:`);
      folderFiles.forEach((file) => {
        console.log(`      - ${file.name} (${file.id || 'no id'})`);
      });
    } else {
      console.log(`   ⚠️  Folder does not exist or is empty`);
    }
  } else {
    console.log(`✅ JSON file found!`);
    console.log(`   Size: ${fileData?.size || 0} bytes`);
    
    // Try to parse it
    try {
      const jsonText = await fileData.text();
      const parsed = JSON.parse(jsonText);
      console.log(`   ✅ Valid JSON, ${Array.isArray(parsed) ? parsed.length : 'N/A'} rows`);
    } catch (parseError) {
      console.error(`   ❌ Failed to parse JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
  }

  // 3. Check original file location
  if (session.file_storage_path) {
    console.log(`\n📁 Checking original file: ${session.file_storage_path}`);
    const { data: originalFile, error: originalError } = await supabase.storage
      .from(STORAGE_BUCKET_NAME)
      .download(session.file_storage_path);

    if (originalError) {
      console.error(`   ❌ Original file not found: ${originalError.message}`);
    } else {
      console.log(`   ✅ Original file found (${originalFile?.size || 0} bytes)`);
    }
  }

  // 4. Summary
  console.log('\n' + '═'.repeat(50));
  console.log('📋 Summary:');
  console.log('─'.repeat(50));
  
  const hasJson = !downloadError && fileData;
  const needsConversion = session.status === 'approved' && !hasJson;
  
  if (hasJson) {
    console.log('✅ JSON file exists and is accessible');
  } else if (needsConversion) {
    console.log('⚠️  Session is approved but JSON file does not exist');
    console.log('   → Run convertApprovedDatasetToJSON() to create the JSON file');
  } else {
    console.log('❌ JSON file not found or not accessible');
    console.log(`   → Session status: ${session.status}`);
    console.log(`   → Expected path: ${jsonPath}`);
  }
  
  console.log('\n');
}

// Get session ID from command line argument
const sessionIdArg = process.argv[2];
if (!sessionIdArg) {
  console.error('Usage: npx tsx scripts/check-session-storage.ts <sessionId>');
  process.exit(1);
}

const sessionId = parseInt(sessionIdArg, 10);
if (isNaN(sessionId)) {
  console.error('Invalid session ID. Must be a number.');
  process.exit(1);
}

// Run the check
checkSessionStorage(sessionId).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

