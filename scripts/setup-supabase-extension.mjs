#!/usr/bin/env node

/**
 * Configureer Supabase VS Code/Cursor extensie automatisch
 * 
 * Gebruikt SUPABASE_ACCESS_TOKEN uit .env.local
 * Maakt .vscode/settings.json aan met juiste configuratie
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const ENV_FILE = join(projectRoot, '.env.local');
const VSCODE_DIR = join(projectRoot, '.vscode');
const SETTINGS_FILE = join(VSCODE_DIR, 'settings.json');

// Load environment variables from .env.local
function loadEnv() {
  const env = {};
  
  if (!existsSync(ENV_FILE)) {
    return env;
  }
  
  const envFile = readFileSync(ENV_FILE, 'utf-8');
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
  
  return env;
}

function readSettings() {
  if (!existsSync(SETTINGS_FILE)) {
    return {};
  }
  try {
    const content = readFileSync(SETTINGS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('⚠️  Fout bij lezen bestaande settings.json:', error.message);
    return {};
  }
}

function writeSettings(settings) {
  if (!existsSync(VSCODE_DIR)) {
    mkdirSync(VSCODE_DIR, { recursive: true });
  }
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
}

async function setupExtension() {
  console.log('🔧 Supabase Extensie Configuratie\n');
  
  // Load environment
  const env = loadEnv();
  
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const accessToken = env.SUPABASE_ACCESS_TOKEN;
  
  // Check if .env.local exists
  if (!existsSync(ENV_FILE)) {
    console.error('❌ .env.local bestand niet gevonden');
    console.error('\n📝 Maak eerst .env.local aan met:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL=https://smpkbweozrkjalpceqwu.supabase.co');
    console.error('   SUPABASE_ACCESS_TOKEN=sbp_...');
    process.exit(1);
  }
  
  // Check for Supabase URL
  if (!supabaseUrl) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL niet gevonden in .env.local');
    process.exit(1);
  }
  
  // Extract project ref
  const projectRefMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!projectRefMatch) {
    console.error('❌ Kon project ref niet extraheren uit SUPABASE_URL');
    process.exit(1);
  }
  const projectRef = projectRefMatch[1];
  
  // Check for access token
  if (!accessToken) {
    console.error('❌ SUPABASE_ACCESS_TOKEN niet gevonden in .env.local');
    console.error('\n📝 Om een access token te krijgen:');
    console.error('   1. Ga naar: https://supabase.com/dashboard/account/tokens');
    console.error('   2. Klik "Generate new token"');
    console.error('   3. Kopieer de token (begint met sbp_)');
    console.error('   4. Voeg toe aan .env.local: SUPABASE_ACCESS_TOKEN=sbp_...');
    console.error('\n💡 Of gebruik project-specifieke token:');
    console.error(`   https://supabase.com/dashboard/project/${projectRef}/settings/access-tokens`);
    process.exit(1);
  }
  
  // Validate token format
  if (!accessToken.startsWith('sbp_')) {
    console.warn('⚠️  Token begint niet met "sbp_" - controleer of dit correct is');
  }
  
  // Read existing settings
  const settings = readSettings();
  
  // Update Supabase settings
  const newSettings = {
    ...settings,
    'supabase.accessToken': accessToken,
    'supabase.projectRef': projectRef,
  };
  
  // Write settings
  writeSettings(newSettings);
  
  console.log('✅ Supabase extensie geconfigureerd!');
  console.log(`   - Project: ${projectRef}`);
  console.log(`   - Token: ${accessToken.substring(0, 10)}...${accessToken.substring(accessToken.length - 4)}`);
  console.log(`   - Settings bestand: .vscode/settings.json`);
  console.log('\n📋 Volgende stappen:');
  console.log('   1. Herstart Cursor volledig (sluit alle vensters)');
  console.log('   2. De extensie zou nu moeten werken zonder foutmeldingen');
  console.log('\n💡 Als je nog steeds foutmeldingen ziet:');
  console.log('   - Check of token niet verlopen is');
  console.log('   - Check internet verbinding');
  console.log('   - Zie docs/TROUBLESHOOTING_SUPABASE_EXTENSION.md voor meer hulp');
}

// Run
setupExtension().catch(error => {
  console.error('❌ Fout:', error.message);
  process.exit(1);
});

