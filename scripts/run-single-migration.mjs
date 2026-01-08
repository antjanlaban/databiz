#!/usr/bin/env node

/**
 * Run a single Supabase migration
 * Usage: node scripts/run-single-migration.mjs 004_add_ean_analysis_fields
 */

import { readFileSync, existsSync } from 'fs';
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
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  });
}

Object.keys(env).forEach(key => {
  process.env[key] = env[key];
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_URL) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL in .env.local');
  process.exit(1);
}

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
  process.exit(1);
}

const migrationName = process.argv[2];
if (!migrationName) {
  console.error('❌ Please specify migration name');
  console.error('   Usage: node scripts/run-single-migration.mjs 004_add_ean_analysis_fields');
  process.exit(1);
}

const migrationPath = join(projectRoot, 'supabase', 'migrations', `${migrationName}.sql`);
if (!existsSync(migrationPath)) {
  console.error(`❌ Migration file not found: ${migrationPath}`);
  process.exit(1);
}

async function executeMigration(sql, migrationName) {
  try {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: sql,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(`Failed to run sql query: ${errorMessage}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    if (error.message.includes('Authentication failed') || error.message.includes('401')) {
      throw new Error('Authentication failed. Please check your SUPABASE_ACCESS_TOKEN.');
    }
    throw error;
  }
}

async function runSingleMigration() {
  console.log('🚀 Running single Supabase migration...\n');
  console.log(`📦 Project: ${projectRef}\n`);
  console.log(`📄 Migration: ${migrationName}.sql\n`);

  try {
    const sql = readFileSync(migrationPath, 'utf-8');
    
    if (!sql.trim()) {
      console.log('   ⚠️  Migration file is empty');
      return;
    }
    
    await executeMigration(sql, migrationName);
    console.log(`   ✅ Successfully executed: ${migrationName}.sql`);
    console.log('\n✅ Migration executed successfully!');
  } catch (error) {
    console.error(`   ❌ Failed to execute ${migrationName}.sql:`, error.message);
    
    if (error.message.includes('Authentication failed')) {
      console.error('\n   Please check:');
      console.error('   1. SUPABASE_ACCESS_TOKEN is correct');
      console.error('   2. Token has proper permissions');
      console.error('   3. Token is not expired');
      console.error('   4. Get a new token from: https://supabase.com/dashboard/account/tokens');
    }
    
    process.exit(1);
  }
}

runSingleMigration();

