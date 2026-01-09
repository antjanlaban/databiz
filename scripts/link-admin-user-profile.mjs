#!/usr/bin/env node

/**
 * Link admin user profile to auth.users for admin@databiz.app
 * Executes SQL to create user_profile for an existing auth user
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

const email = 'admin@databiz.app';

async function linkProfile() {
  try {
    console.log('🔗 Linking admin user profile...\n');
    console.log(`📦 Project: ${projectRef}\n`);
    console.log(`📧 Email: ${email}\n`);

    // Get user ID from Supabase Auth
    const getUserResponse = await fetch(
      `https://${projectRef}.supabase.co/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );

    if (!getUserResponse.ok) {
      const errorText = await getUserResponse.text();
      throw new Error(`Failed to get user: ${errorText}`);
    }

    const usersData = await getUserResponse.json();
    if (!usersData.users || usersData.users.length === 0) {
      throw new Error(`User with email ${email} not found in auth.users. Please create the user first in Supabase Authentication.`);
    }

    const userId = usersData.users[0].id;
    console.log(`📋 User ID: ${userId}\n`);

    // Create profile using Supabase REST API (via PostgREST)
    const createProfileResponse = await fetch(
      `https://${projectRef}.supabase.co/rest/v1/user_profiles`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          id: userId,
          role: 'admin',
          status: 'active',
        }),
      }
    );

    if (!createProfileResponse.ok) {
      const errorText = await createProfileResponse.text();
      let errorMessage = `${createProfileResponse.status} ${createProfileResponse.statusText}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorJson.hint || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      // If profile already exists, that's okay
      if (errorMessage.includes('duplicate') || errorMessage.includes('already exists')) {
        console.log('ℹ️  Profile already exists, updating...\n');
        
        // Update existing profile
        const updateProfileResponse = await fetch(
          `https://${projectRef}.supabase.co/rest/v1/user_profiles?id=eq.${userId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
            },
            body: JSON.stringify({
              role: 'admin',
              status: 'active',
            }),
          }
        );

        if (!updateProfileResponse.ok) {
          const updateErrorText = await updateProfileResponse.text();
          throw new Error(`Failed to update profile: ${updateErrorText}`);
        }

        console.log('✅ Admin user profile successfully updated!');
      } else {
        throw new Error(`Failed to create profile: ${errorMessage}`);
      }
    } else {
      console.log('✅ Admin user profile successfully created!');
    }

    console.log('\n📋 Summary:');
    console.log(`   Email: ${email}`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Role: admin`);
    console.log(`   Status: active`);
    console.log('\n✨ You can now login at /login');
    
  } catch (error) {
    console.error('❌ Failed to link admin user profile:', error.message);
    console.error('\n💡 Alternative: Run the SQL script directly in Supabase SQL Editor:');
    console.error('   scripts/link-admin-user-profile.sql');
    process.exit(1);
  }
}

linkProfile();

