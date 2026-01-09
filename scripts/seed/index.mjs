#!/usr/bin/env node

/**
 * Seed Runner - Generic seed system for loading initial data
 * 
 * Usage:
 *   npm run seed              # Run all seeders
 *   npm run seed -- --only brands  # Run only brands seeder
 *   npm run seed -- --all     # Run all seeders (same as default)
 */

import { readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');
const seedersDir = join(__dirname, 'seeders');

/**
 * Load all seeders or a specific seeder
 */
function getSeeders(onlySeeder = null) {
  if (!existsSync(seedersDir)) {
    console.error('❌ Seeders directory not found:', seedersDir);
    process.exit(1);
  }

  const files = readdirSync(seedersDir)
    .filter(file => file.endsWith('.mjs'))
    .map(file => file.replace('.mjs', ''));

  if (files.length === 0) {
    console.error('❌ No seeders found in:', seedersDir);
    process.exit(1);
  }

  if (onlySeeder) {
    if (!files.includes(onlySeeder)) {
      console.error(`❌ Seeder "${onlySeeder}" not found. Available seeders: ${files.join(', ')}`);
      process.exit(1);
    }
    return [onlySeeder];
  }

  return files;
}

/**
 * Run a single seeder
 */
async function runSeeder(seederName) {
  try {
    const seederPath = join(seedersDir, `${seederName}.mjs`);
    
    if (!existsSync(seederPath)) {
      throw new Error(`Seeder file not found: ${seederPath}`);
    }

    console.log(`\n🌱 Running seeder: ${seederName}`);
    console.log('─'.repeat(50));

    // Dynamic import of seeder
    const seederModule = await import(`file://${seederPath}`);
    
    if (typeof seederModule.default !== 'function') {
      throw new Error(`Seeder ${seederName} must export a default function`);
    }

    // Run seeder
    const result = await seederModule.default();

    // Log results
    if (result) {
      if (result.inserted !== undefined) {
        console.log(`   ✅ Inserted: ${result.inserted}`);
      }
      if (result.skipped !== undefined) {
        console.log(`   ⏭️  Skipped: ${result.skipped}`);
      }
      if (result.errors !== undefined && result.errors.length > 0) {
        console.log(`   ⚠️  Errors: ${result.errors.length}`);
        result.errors.slice(0, 5).forEach(error => {
          console.log(`      - ${error}`);
        });
        if (result.errors.length > 5) {
          console.log(`      ... and ${result.errors.length - 5} more errors`);
        }
      }
    }

    console.log(`   ✅ Completed: ${seederName}`);
    return result;
  } catch (error) {
    console.error(`   ❌ Failed: ${seederName}`);
    console.error(`      ${error.message}`);
    if (error.stack) {
      console.error(`      ${error.stack.split('\n').slice(1, 3).join('\n      ')}`);
    }
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🌱 Starting seed process...\n');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const onlyIndex = args.indexOf('--only');
  const onlySeeder = onlyIndex !== -1 && args[onlyIndex + 1] 
    ? args[onlyIndex + 1] 
    : null;

  // Get seeders to run
  const seeders = getSeeders(onlySeeder);

  console.log(`📋 Found ${seeders.length} seeder(s) to run:`);
  seeders.forEach((seeder, index) => {
    console.log(`   ${index + 1}. ${seeder}`);
  });

  // Run seeders
  const results = [];
  let hasErrors = false;

  for (const seeder of seeders) {
    try {
      const result = await runSeeder(seeder);
      results.push({ seeder, result, success: true });
    } catch (error) {
      results.push({ seeder, error: error.message, success: false });
      hasErrors = true;
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('📊 Seed Summary:');
  console.log('═'.repeat(50));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  results.forEach(({ seeder, success, result, error }) => {
    if (success) {
      const stats = [];
      if (result?.inserted) stats.push(`${result.inserted} inserted`);
      if (result?.skipped) stats.push(`${result.skipped} skipped`);
      if (result?.errors?.length) stats.push(`${result.errors.length} errors`);
      console.log(`   ✅ ${seeder}${stats.length > 0 ? ` (${stats.join(', ')})` : ''}`);
    } else {
      console.log(`   ❌ ${seeder}: ${error}`);
    }
  });

  console.log(`\n   Total: ${successful} successful, ${failed} failed`);

  if (hasErrors) {
    console.log('\n❌ Seed process completed with errors');
    process.exit(1);
  } else {
    console.log('\n✅ Seed process completed successfully');
  }
}

// Run if called directly
main().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});

