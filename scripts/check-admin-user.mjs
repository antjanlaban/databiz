#!/usr/bin/env node

/**
 * Check admin user and profile status
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
-- Check admin user and profile
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  u.created_at as user_created_at,
  up.id as profile_id,
  up.role,
  up.status,
  up.company_id,
  up.created_at as profile_created_at
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
WHERE u.email = 'info@databiz.app';
`;

async function checkUser() {
  try {
    console.log('🔍 Checking admin user status...\n');
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
    
    if (result.data && result.data.length > 0) {
      const user = result.data[0];
      console.log('✅ User found in auth.users:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Email confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`   Created: ${user.user_created_at}\n`);
      
      if (user.profile_id) {
        console.log('✅ User profile found:');
        console.log(`   Role: ${user.role}`);
        console.log(`   Status: ${user.status}`);
        console.log(`   Company ID: ${user.company_id || 'NULL (correct for admin)'}`);
        console.log(`   Profile created: ${user.profile_created_at}\n`);
        
        if (user.status !== 'active') {
          console.log('⚠️  WARNING: User status is not "active"');
          console.log(`   Current status: ${user.status}`);
          console.log('   User needs status "active" to login.\n');
        }
      } else {
        console.log('❌ User profile NOT found!');
        console.log('   The user exists in auth.users but has no profile in user_profiles.');
        console.log('   Running fix script...\n');
        
        // Run fix
        const fixSql = `
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
        
        const fixResponse = await fetch(
          `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
              query: fixSql,
            }),
          }
        );
        
        if (fixResponse.ok) {
          console.log('✅ User profile created/updated successfully!');
        } else {
          const errorText = await fixResponse.text();
          console.error('❌ Failed to create profile:', errorText);
        }
      }
    } else {
      console.log('❌ User not found in auth.users!');
      console.log('   Please create the user in Supabase Dashboard first.');
    }
    
  } catch (error) {
    if (error.message.includes('401') || error.message.includes('403')) {
      console.error('❌ Authentication failed. Please check your SUPABASE_ACCESS_TOKEN is valid.');
    } else {
      console.error('❌ Failed to check user:', error.message);
    }
    process.exit(1);
  }
}

checkUser();

