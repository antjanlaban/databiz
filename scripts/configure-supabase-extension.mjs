#!/usr/bin/env node

/**
 * Script om Supabase extensie te configureren of uit te schakelen
 * 
 * Gebruik:
 *   node scripts/configure-supabase-extension.mjs disable    # Schakel extensie uit (via instructies)
 *   node scripts/configure-supabase-extension.mjs check     # Check huidige configuratie
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const VSCODE_DIR = join(projectRoot, '.vscode');
const SETTINGS_FILE = join(VSCODE_DIR, 'settings.json');

function readSettings() {
  if (!existsSync(SETTINGS_FILE)) {
    return {};
  }
  try {
    const content = readFileSync(SETTINGS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('❌ Fout bij lezen settings.json:', error.message);
    return {};
  }
}

function writeSettings(settings) {
  if (!existsSync(VSCODE_DIR)) {
    mkdirSync(VSCODE_DIR, { recursive: true });
  }
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
}

function checkConfiguration() {
  console.log('🔍 Supabase Extensie Configuratie Check\n');
  
  const settings = readSettings();
  
  const hasToken = settings['supabase.accessToken'] && 
                   settings['supabase.accessToken'] !== 'sbp_VERVANG_DIT_MET_JE_ECHTE_TOKEN';
  const hasProjectRef = settings['supabase.projectRef'] === 'smpkbweozrkjalpceqwu';
  
  console.log('Huidige status:');
  console.log(`  - Settings bestand: ${existsSync(SETTINGS_FILE) ? '✅ Aanwezig' : '❌ Niet aanwezig'}`);
  console.log(`  - Access Token: ${hasToken ? '✅ Geconfigureerd' : '❌ Niet geconfigureerd'}`);
  console.log(`  - Project Ref: ${hasProjectRef ? '✅ Correct' : '❌ Niet correct'}`);
  
  if (!hasToken || !hasProjectRef) {
    console.log('\n⚠️  Extensie is niet correct geconfigureerd.');
    console.log('\n📋 Oplossingen:');
    console.log('  1. Schakel extensie uit in Cursor Settings (snelste fix)');
    console.log('  2. Configureer extensie met geldige token:');
    console.log('     - Ga naar: https://supabase.com/dashboard/project/smpkbweozrkjalpceqwu/settings/access-tokens');
    console.log('     - Genereer nieuwe token');
    console.log('     - Kopieer token en voeg toe aan .vscode/settings.json');
    console.log('\n📖 Zie docs/TROUBLESHOOTING_SUPABASE_EXTENSION.md voor details');
  } else {
    console.log('\n✅ Extensie lijkt correct geconfigureerd.');
    console.log('   Als je nog steeds foutmeldingen ziet:');
    console.log('   - Check of token niet verlopen is');
    console.log('   - Herstart Cursor volledig');
    console.log('   - Check internet verbinding');
  }
}

function showDisableInstructions() {
  console.log('📋 Instructies om Supabase Extensie uit te schakelen:\n');
  console.log('1. Open Cursor Settings:');
  console.log('   - Druk op Ctrl+, (of Cmd+, op Mac)');
  console.log('   - Of: File > Preferences > Settings\n');
  console.log('2. Zoek naar "Supabase":');
  console.log('   - Type "supabase" in de zoekbalk\n');
  console.log('3. Disable de extensie:');
  console.log('   - Ga naar Extensions (Ctrl+Shift+X)');
  console.log('   - Zoek "Supabase" extensie');
  console.log('   - Klik op "Disable" of "Uninstall"\n');
  console.log('✅ Na het uitschakelen zouden de foutmeldingen moeten stoppen.\n');
  console.log('💡 Tip: De extensie is optioneel - je applicatie werkt zonder.');
}

// Main
const command = process.argv[2] || 'check';

switch (command) {
  case 'check':
    checkConfiguration();
    break;
    
  case 'disable':
    showDisableInstructions();
    break;
    
  default:
    console.log('Gebruik:');
    console.log('  node scripts/configure-supabase-extension.mjs check    # Check configuratie');
    console.log('  node scripts/configure-supabase-extension.mjs disable  # Toon disable instructies');
    process.exit(1);
}

