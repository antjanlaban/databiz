#!/usr/bin/env node
/**
 * Pre-flight check - Verify system state before executing commands
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';

// Load environment
const env = {};
if (existsSync('.env.local')) {
  const envFile = readFileSync('.env.local', 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
  });
}

const checks = {
  devServer() {
    try {
      const running = execSync('ps aux | grep "[n]ext-server.*3000"', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
      return { status: 'running', port: 3000, ok: true };
    } catch {
      return { status: 'stopped', port: 3000, ok: false };
    }
  },

  async supabase() {
    if (!env.NEXT_PUBLIC_SUPABASE_URL) {
      return { ok: false, error: 'NEXT_PUBLIC_SUPABASE_URL missing in .env.local' };
    }
    
    try {
      const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        headers: { 'apikey': env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' },
        signal: AbortSignal.timeout(5000)
      });
      return { ok: response.ok, status: response.status };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  },

  async database() {
    if (!env.NEXT_PUBLIC_SUPABASE_URL) return { ok: false, tables: [] };
    
    const tables = ['products', 'import_sessions', 'ean_conflicts'];
    const results = {};
    
    for (const table of tables) {
      try {
        const response = await fetch(
          `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?select=count&limit=0`,
          { 
            headers: { 'apikey': env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' },
            signal: AbortSignal.timeout(3000)
          }
        );
        results[table] = response.ok;
      } catch {
        results[table] = false;
      }
    }
    
    return { ok: Object.values(results).every(r => r), tables: results };
  }
};

async function preflight() {
  console.log('🔍 Pre-flight check...\n');
  
  const devServer = checks.devServer();
  const supabase = await checks.supabase();
  const database = await checks.database();

  // Report
  console.log(`Dev Server: ${devServer.ok ? '✅ Running on :3000' : '⚠️  Not running'}`);
  console.log(`Supabase:   ${supabase.ok ? '✅ Connected' : '❌ ' + (supabase.error || 'Cannot connect')}`);
  console.log(`Database:   ${database.ok ? '✅ All tables exist' : '⚠️  Missing tables: ' + Object.entries(database.tables).filter(([,v]) => !v).map(([k]) => k).join(', ')}`);
  console.log('');

  const allOk = supabase.ok && database.ok;
  
  if (!allOk) {
    console.log('⚠️  Some checks failed. System may not work correctly.\n');
  }

  return { devServer, supabase, database, ok: allOk };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const results = await preflight();
  process.exit(results.ok ? 0 : 1);
}

export { preflight, checks };
