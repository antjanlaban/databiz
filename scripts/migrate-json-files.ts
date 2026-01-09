import { config } from 'dotenv';
import { resolve } from 'path';
import { getSupabaseServer } from '../lib/supabase-server';
import { STORAGE_BUCKET_NAME, STORAGE_APPROVED_FOLDER } from '../lib/upload-constants';
import { downloadFileFromStorage } from '../lib/storage';

config({ path: resolve(process.cwd(), '.env.local') });

/**
 * Migrate JSON files from old structure (approved/{id}/data.json.gz) 
 * to new structure (approved/{id}-data.json.gz)
 */
async function migrateJSONFiles() {
  const supabase = getSupabaseServer();

  console.log('🔄 Starting JSON file migration...\n');

  try {
    // Step 1: List all folders in approved/ directory
    console.log('📁 Listing files in approved/ directory...');
    const { data: folders, error: listError } = await supabase.storage
      .from(STORAGE_BUCKET_NAME)
      .list(STORAGE_APPROVED_FOLDER, {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (listError) {
      throw new Error(`Failed to list approved folder: ${listError.message}`);
    }

    if (!folders || folders.length === 0) {
      console.log('✅ No files found in approved/ directory. Migration complete.');
      return;
    }

    console.log(`   Found ${folders.length} items in approved/ directory\n`);

    // Step 2: Process each folder/item
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const item of folders) {
      // Check if it's a folder (old structure) or already a file (new structure)
      if (item.id === null) {
        // It's a folder - check for data.json.gz inside
        const folderPath = `${STORAGE_APPROVED_FOLDER}/${item.name}`;
        const sessionId = parseInt(item.name, 10);

        if (isNaN(sessionId)) {
          console.log(`   ⚠️  Skipping non-numeric folder: ${item.name}`);
          skippedCount++;
          continue;
        }

        console.log(`   📦 Processing folder: ${item.name} (session ${sessionId})`);

        // Check if data.json.gz exists in this folder
        const oldPath = `${folderPath}/data.json.gz`;
        const newPath = `${STORAGE_APPROVED_FOLDER}/${sessionId}-data.json.gz`;

        try {
          // Try to download the old file
          const fileData = await downloadFileFromStorage(STORAGE_BUCKET_NAME, oldPath);
          
          if (fileData) {
            console.log(`      ✅ Found old file: ${oldPath}`);

            // Check if new file already exists
            try {
              await downloadFileFromStorage(STORAGE_BUCKET_NAME, newPath);
              console.log(`      ⚠️  New file already exists, skipping: ${newPath}`);
              skippedCount++;
              continue;
            } catch {
              // New file doesn't exist, proceed with migration
            }

            // Upload to new location
            console.log(`      📤 Uploading to new location: ${newPath}`);
            const { error: uploadError } = await supabase.storage
              .from(STORAGE_BUCKET_NAME)
              .upload(newPath, fileData, {
                contentType: 'application/gzip',
                upsert: true,
              });

            if (uploadError) {
              console.error(`      ❌ Failed to upload to new location: ${uploadError.message}`);
              errorCount++;
              continue;
            }

            console.log(`      ✅ Successfully migrated to: ${newPath}`);

            // Delete old file
            console.log(`      🗑️  Deleting old file: ${oldPath}`);
            const { error: deleteError } = await supabase.storage
              .from(STORAGE_BUCKET_NAME)
              .remove([oldPath]);

            if (deleteError) {
              console.error(`      ⚠️  Failed to delete old file: ${deleteError.message}`);
              // Continue anyway - file was migrated successfully
            } else {
              console.log(`      ✅ Old file deleted`);
            }

            // Try to delete the empty folder (if possible)
            try {
              const { data: folderContents } = await supabase.storage
                .from(STORAGE_BUCKET_NAME)
                .list(folderPath);

              if (!folderContents || folderContents.length === 0) {
                // Folder is empty, try to remove it (Supabase doesn't support folder deletion directly,
                // but we can try to remove any remaining files)
                console.log(`      ℹ️  Folder ${folderPath} is now empty (will be cleaned up automatically)`);
              }
            } catch {
              // Ignore folder cleanup errors
            }

            migratedCount++;
          } else {
            console.log(`      ⚠️  No data.json.gz found in folder ${item.name}`);
            skippedCount++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
            console.log(`      ℹ️  No JSON file found in folder ${item.name}`);
            skippedCount++;
          } else {
            console.error(`      ❌ Error processing folder ${item.name}: ${errorMessage}`);
            errorCount++;
          }
        }
      } else {
        // It's a file - check if it's already in new format
        const fileName = item.name;
        if (fileName.match(/^\d+-data\.json\.gz$/)) {
          console.log(`   ✅ Already in new format: ${fileName}`);
          skippedCount++;
        } else {
          console.log(`   ⚠️  Unknown file format: ${fileName}`);
          skippedCount++;
        }
      }
    }

    // Summary
    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Migrated: ${migratedCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`\n✅ Migration complete!`);
  } catch (error) {
    console.error('❌ Migration failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run migration
migrateJSONFiles();

