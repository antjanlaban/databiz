#!/usr/bin/env node

/**
 * Create admin user and profile
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

const email = 'info@databiz.app';
const password = process.argv[2] || 'Xd.l70\'9|HO+';

async function createUser() {
  try {
    console.log('👤 Creating admin user...\n');
    console.log(`📦 Project: ${projectRef}\n`);
    console.log(`📧 Email: ${email}\n`);

    // Create user via Supabase Admin API
    const createUserResponse = await fetch(
      `https://${projectRef}.supabase.co/auth/v1/admin/users`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            role: 'admin',
          },
        }),
      }
    );

    if (!createUserResponse.ok) {
      const errorText = await createUserResponse.text();
      let errorMessage = `${createUserResponse.status} ${createUserResponse.statusText}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
        
        // If user already exists, that's okay - we'll just create the profile
        if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
          console.log('ℹ️  User already exists in auth.users, continuing with profile creation...\n');
        } else {
          throw new Error(errorMessage);
        }
      } catch {
        throw new Error(errorText || errorMessage);
      }
    } else {
      const userData = await createUserResponse.json();
      console.log('✅ User created in auth.users:');
      console.log(`   ID: ${userData.id}`);
      console.log(`   Email: ${userData.email}\n`);
    }

    // Get user ID
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
      throw new Error('Failed to get user ID');
    }

    const usersData = await getUserResponse.json();
    if (!usersData.users || usersData.users.length === 0) {
      throw new Error('User not found after creation');
    }

    const userId = usersData.users[0].id;
    console.log(`📋 User ID: ${userId}\n`);

    // Create profile
    const createProfileSql = `
    INSERT INTO user_profiles (id, role, status)
    VALUES ('${userId}', 'admin', 'active')
    ON CONFLICT (id) DO UPDATE
    SET 
      role = 'admin',
      status = 'active';
    `;

    const profileResponse = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          query: createProfileSql,
        }),
      }
    );

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      throw new Error(`Failed to create profile: ${errorText}`);
    }

    console.log('✅ User profile created/updated successfully!');
    console.log('\n📋 Summary:');
    console.log(`   Email: ${email}`);
    console.log(`   Role: admin`);
    console.log(`   Status: active`);
    console.log('\n✨ You can now login at /login');
    
  } catch (error) {
    console.error('❌ Failed to create user:', error.message);
    process.exit(1);
  }
}

createUser();

