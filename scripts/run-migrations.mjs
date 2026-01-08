#!/usr/bin/env node

/**
 * Run Supabase migrations automatically
 * Executes all migration files in supabase/migrations/ directory
 * 
 * Requires SUPABASE_ACCESS_TOKEN in .env.local
 * Get token from: https://supabase.com/dashboard/account/tokens
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Load environment variables
const env = {};
const envPath = join(projectRoot, '.env.local');
if (existsSync(envPath)) {
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    // Skip comments and empty lines
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    
    // Match KEY=VALUE (with optional quotes)
    const match = trimmed.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      
      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      env[key] = value;
    }
  });
}

// Set environment variables (override with .env.local values)
Object.keys(env).forEach(key => {
  process.env[key] = env[key];
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

// Debug: Check if variables are loaded
if (process.argv.includes('--debug')) {
  console.log('Debug: Environment variables loaded:');
  console.log('  NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
  console.log('  SUPABASE_ACCESS_TOKEN:', SUPABASE_ACCESS_TOKEN ? '✅ (length: ' + SUPABASE_ACCESS_TOKEN.length + ')' : '❌');
}

if (!SUPABASE_URL) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL in .env.local');
  process.exit(1);
}

// Extract project ref from URL
const projectRefMatch = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
if (!projectRefMatch) {
  console.error('❌ Could not extract project ref from SUPABASE_URL');
  process.exit(1);
}
const projectRef = projectRefMatch[1];

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('❌ Missing SUPABASE_ACCESS_TOKEN in .env.local');
  console.error('\n   📝 To get an access token:');
  console.error('   1. Go to https://supabase.com/dashboard/account/tokens');
  console.error('   2. Click "Generate new token"');
  console.error('   3. Copy the token');
  console.error('   4. Add to .env.local: SUPABASE_ACCESS_TOKEN=your_token_here');
  console.error('\n   💡 Or run migrations manually in Supabase SQL Editor:');
  console.error('      https://supabase.com/dashboard/project/' + projectRef + '/sql');
  process.exit(1);
}

/**
 * Get list of migration files in order
 * @param {string} singleMigration - Optional: only return this specific migration file
 */
function getMigrationFiles(singleMigration = null) {
  const migrationsDir = join(projectRoot, 'supabase', 'migrations');
  if (!existsSync(migrationsDir)) {
    return [];
  }
  
  let files = readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Sort alphabetically (001, 002, 003, etc.)
  
  // If singleMigration is specified, filter to only that file
  if (singleMigration) {
    files = files.filter(file => file.includes(singleMigration));
    if (files.length === 0) {
      console.error(`❌ Migration file containing "${singleMigration}" not found`);
      process.exit(1);
    }
  }
  
  return files.map(file => ({
    name: file,
    path: join(migrationsDir, file),
  }));
}

/**
 * Execute SQL via Supabase Management API
 */
async function executeMigration(sql, migrationName) {
  try {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          query: sql,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `${response.status} ${response.statusText}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    if (error.message.includes('401') || error.message.includes('403')) {
      throw new Error('Authentication failed. Please check your SUPABASE_ACCESS_TOKEN is valid and not expired.');
    }
    throw error;
  }
}

/**
 * Main function
 * @param {string} singleMigration - Optional: only run this specific migration
 */
async function runMigrations(singleMigration = null) {
  console.log('🚀 Running Supabase migrations...\n');
  console.log(`📦 Project: ${projectRef}\n`);

  const migrationFiles = getMigrationFiles(singleMigration);
  
  if (migrationFiles.length === 0) {
    console.log('ℹ️  No migration files found in supabase/migrations/');
    return;
  }
  
  console.log(`📋 Found ${migrationFiles.length} migration file(s):`);
  migrationFiles.forEach((file, index) => {
    console.log(`   ${index + 1}. ${file.name}`);
  });
  console.log('');

  // Execute each migration
  for (const migration of migrationFiles) {
    console.log(`\n📄 Executing: ${migration.name}`);
    
    try {
      const sql = readFileSync(migration.path, 'utf-8');
      
      // Skip empty files
      if (!sql.trim()) {
        console.log('   ⚠️  Skipping empty migration file');
        continue;
      }
      
      await executeMigration(sql, migration.name);
      console.log(`   ✅ Successfully executed: ${migration.name}`);
      
    } catch (error) {
      console.error(`   ❌ Failed to execute ${migration.name}:`, error.message);
      
      if (error.message.includes('Authentication failed')) {
        console.error('\n   Please check:');
        console.error('   1. SUPABASE_ACCESS_TOKEN is correct');
        console.error('   2. Token has proper permissions');
        console.error('   3. Token is not expired');
        console.error('   4. Get a new token from: https://supabase.com/dashboard/account/tokens');
      }
      
      throw error;
    }
  }
  
  console.log('\n✅ All migrations executed successfully!');
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (isMainModule || import.meta.url.includes('run-migrations.mjs')) {
  // Check for --single argument
  const singleArgIndex = process.argv.indexOf('--single');
  const singleMigration = singleArgIndex !== -1 && process.argv[singleArgIndex + 1] 
    ? process.argv[singleArgIndex + 1] 
    : null;
  
  runMigrations(singleMigration).catch(error => {
    console.error('\n❌ Migration execution failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  });
}

export { runMigrations };
