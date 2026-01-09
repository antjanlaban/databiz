#!/usr/bin/env node

/**
 * Apply RLS fix migration to Supabase
 * This fixes the infinite recursion issue in user_profiles RLS policies
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
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

async function applyMigration() {
  try {
    console.log('🔧 Applying RLS fix migration...\n');
    console.log(`📦 Project: ${projectRef}\n`);

    // Read the migration file
    const migrationPath = join(projectRoot, 'supabase', 'migrations', '013_fix_user_profiles_rls_recursion.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Execute via Supabase REST API (PostgREST)
    // Note: We'll use the service role key to execute SQL
    // For Supabase, we need to use the Management API or SQL Editor API
    
    // Alternative: Use Supabase client to execute SQL
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Execute SQL using rpc or direct query
    // Since Supabase JS client doesn't support raw SQL directly,
    // we'll need to use the REST API or tell user to run it manually
    
    console.log('⚠️  Supabase JS client cannot execute raw SQL directly.');
    console.log('📋 Please run this migration manually in Supabase SQL Editor:\n');
    console.log('   1. Go to your Supabase project dashboard');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Copy and paste the contents of:');
    console.log(`      ${migrationPath}`);
    console.log('   4. Click "Run"\n');
    
    console.log('💡 Or use the Supabase CLI:');
    console.log('   supabase db push\n');
    
  } catch (error) {
    console.error('❌ Failed to apply migration:', error.message);
    process.exit(1);
  }
}

applyMigration();

