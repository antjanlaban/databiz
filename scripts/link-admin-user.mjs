#!/usr/bin/env node

/**
 * Link admin user profile to auth.users
 * Executes SQL to create user_profile for info@databiz.app
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
  process.exit(1);
}

const sql = `
-- Find user ID by email and create profile
INSERT INTO user_profiles (id, role, status)
SELECT 
  id,
  'admin'::VARCHAR(20),
  'active'::VARCHAR(20)
FROM auth.users
WHERE email = 'info@databiz.app'
ON CONFLICT (id) DO UPDATE
SET 
  role = 'admin',
  status = 'active';
`;

async function executeSQL() {
  try {
    console.log('🔗 Linking admin user profile...\n');
    console.log(`📦 Project: ${projectRef}\n`);
    console.log('📧 Email: info@databiz.app\n');

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
    console.log('✅ Admin user profile successfully linked!');
    console.log('\n📋 Verification:');
    console.log('   User: info@databiz.app');
    console.log('   Role: admin');
    console.log('   Status: active');
    console.log('\n✨ You can now login at /login');
    
  } catch (error) {
    if (error.message.includes('401') || error.message.includes('403')) {
      console.error('❌ Authentication failed. Please check your SUPABASE_ACCESS_TOKEN is valid.');
    } else {
      console.error('❌ Failed to link admin user:', error.message);
    }
    process.exit(1);
  }
}

executeSQL();

