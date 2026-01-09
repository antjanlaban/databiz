/**
 * Script to check if all datasets have been removed from database and storage
 * Run with: npx tsx scripts/check-cleanup.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { getSupabaseServer } from '../lib/supabase-server';
import { STORAGE_BUCKET_NAME } from '../lib/storage';

async function checkCleanup() {
  const supabase = getSupabaseServer();

  console.log('🔍 Checking database and storage cleanup...\n');

  // 1. Check import_sessions
  console.log('📊 Database Tables:');
  console.log('─'.repeat(50));

  const { data: sessions, error: sessionsError } = await supabase
    .from('import_sessions')
    .select('id, file_name, status, file_storage_path, created_at')
    .order('created_at', { ascending: false });

  if (sessionsError) {
    console.error('❌ Error fetching import_sessions:', sessionsError.message);
  } else {
    console.log(`\n📁 import_sessions: ${sessions?.length || 0} records`);
    if (sessions && sessions.length > 0) {
      console.log('   Remaining sessions:');
      sessions.forEach((session) => {
        console.log(`   - ID: ${session.id}, File: ${session.file_name}, Status: ${session.status}`);
        if (session.file_storage_path) {
          console.log(`     Storage: ${session.file_storage_path}`);
        }
      });
    } else {
      console.log('   ✅ No import sessions found');
    }
  }

  // 2. Check ean_conflicts
  const { data: conflicts, error: conflictsError } = await supabase
    .from('ean_conflicts')
    .select('id, session_id, ean, resolved, created_at')
    .order('created_at', { ascending: false });

  if (conflictsError) {
    console.error('❌ Error fetching ean_conflicts:', conflictsError.message);
  } else {
    console.log(`\n⚠️  ean_conflicts: ${conflicts?.length || 0} records`);
    if (conflicts && conflicts.length > 0) {
      console.log('   Remaining conflicts:');
      conflicts.slice(0, 10).forEach((conflict) => {
        console.log(`   - ID: ${conflict.id}, Session: ${conflict.session_id}, EAN: ${conflict.ean}, Resolved: ${conflict.resolved}`);
      });
      if (conflicts.length > 10) {
        console.log(`   ... and ${conflicts.length - 10} more`);
      }
    } else {
      console.log('   ✅ No conflicts found');
    }
  }

  // 3. Check ean_variants
  const { data: variants, error: variantsError } = await supabase
    .from('ean_variants')
    .select('id, ean, name, import_session_id, is_active, created_at')
    .order('created_at', { ascending: false });

  if (variantsError) {
    console.error('❌ Error fetching ean_variants:', variantsError.message);
  } else {
    console.log(`\n📦 ean_variants: ${variants?.length || 0} records`);
    if (variants && variants.length > 0) {
      const activeCount = variants.filter((v) => v.is_active).length;
      const inactiveCount = variants.length - activeCount;
      console.log(`   Active: ${activeCount}, Inactive: ${inactiveCount}`);
      console.log('   Sample variants:');
      variants.slice(0, 5).forEach((variant) => {
        console.log(`   - EAN: ${variant.ean}, Name: ${variant.name?.substring(0, 40)}..., Session: ${variant.import_session_id}, Active: ${variant.is_active}`);
      });
      if (variants.length > 5) {
        console.log(`   ... and ${variants.length - 5} more`);
      }
    } else {
      console.log('   ✅ No variants found');
    }
  }

  // 4. Check products (might be deprecated)
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, ean, name, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (productsError) {
    // Table might not exist, that's OK
    console.log(`\n📦 products: Table might not exist or error: ${productsError.message}`);
  } else {
    const { count: productsCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    console.log(`\n📦 products: ${productsCount || 0} records`);
    if (products && products.length > 0) {
      console.log('   Sample products:');
      products.forEach((product) => {
        console.log(`   - EAN: ${product.ean}, Name: ${product.name?.substring(0, 40)}...`);
      });
    } else {
      console.log('   ✅ No products found');
    }
  }

  // 5. Check storage
  console.log('\n💾 Storage:');
  console.log('─'.repeat(50));

  let files: any[] | null = null;
  try {
    // List all files in the bucket
    const { data: storageFiles, error: listError } = await supabase.storage
      .from(STORAGE_BUCKET_NAME)
      .list('', {
        limit: 1000,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (listError) {
      console.error('❌ Error listing storage files:', listError.message);
    } else {
      files = storageFiles || null;
      console.log(`\n📁 Storage bucket "${STORAGE_BUCKET_NAME}": ${files?.length || 0} items`);
      
      if (files && files.length > 0) {
        // Group by folder
        const folders = new Map<string, number>();
        const fileList: string[] = [];

        files.forEach((file) => {
          if (file.id) {
            // It's a file
            const pathParts = file.id.split('/');
            const folder = pathParts.length > 1 ? pathParts[0] : 'root';
            folders.set(folder, (folders.get(folder) || 0) + 1);
            fileList.push(file.id);
          } else {
            // It's a folder
            folders.set(file.name, 0);
          }
        });

        console.log('\n   Folder structure:');
        folders.forEach((count, folder) => {
          console.log(`   - ${folder}/: ${count} files`);
        });

        console.log('\n   Sample files:');
        fileList.slice(0, 10).forEach((file) => {
          console.log(`   - ${file}`);
        });
        if (fileList.length > 10) {
          console.log(`   ... and ${fileList.length - 10} more files`);
        }
      } else {
        console.log('   ✅ No files found in storage');
      }
    }

    // Check specific folders
    const folders = ['incoming', 'processing', 'approved', 'rejected'];
    for (const folder of folders) {
      const { data: folderFiles, error: folderError } = await supabase.storage
        .from(STORAGE_BUCKET_NAME)
        .list(folder, {
          limit: 100,
          offset: 0,
        });

      if (!folderError && folderFiles && folderFiles.length > 0) {
        console.log(`\n   📂 ${folder}/: ${folderFiles.length} items`);
        folderFiles.slice(0, 5).forEach((file) => {
          console.log(`      - ${file.name}${file.id ? ` (${file.id})` : ''}`);
        });
        if (folderFiles.length > 5) {
          console.log(`      ... and ${folderFiles.length - 5} more`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error checking storage:', error);
  }

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('📋 Summary:');
  console.log('─'.repeat(50));

  const hasSessions = sessions && sessions.length > 0;
  const hasConflicts = conflicts && conflicts.length > 0;
  const hasVariants = variants && variants.length > 0;
  const hasProducts = products && products.length > 0;
  const hasStorageFiles = files !== null && files.length > 0;

  if (!hasSessions && !hasConflicts && !hasVariants && !hasProducts && !hasStorageFiles) {
    console.log('✅ All datasets have been removed from database and storage!');
  } else {
    console.log('⚠️  Some data still remains:');
    if (hasSessions) console.log(`   - ${sessions?.length || 0} import sessions`);
    if (hasConflicts) console.log(`   - ${conflicts?.length || 0} EAN conflicts`);
    if (hasVariants) console.log(`   - ${variants?.length || 0} EAN variants`);
    if (hasProducts) console.log(`   - ${products?.length || 0} products`);
    if (hasStorageFiles) console.log(`   - ${files?.length || 0} storage files`);
  }

  console.log('\n');
}

// Run the check
checkCleanup().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

