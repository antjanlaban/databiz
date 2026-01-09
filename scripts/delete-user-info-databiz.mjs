#!/usr/bin/env node

/**
 * Delete all data for info@databiz.app
 * ⚠️ WARNING: This will permanently delete the user and related data
 * 
 * This script:
 * 1. Shows what will be deleted
 * 2. Deletes user invites created by this user (optional)
 * 3. Deletes user profile
 * 4. Deletes user from auth.users
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

async function deleteUser() {
  try {
    console.log('🗑️  Deleting user and all related data...\n');
    console.log(`📦 Project: ${projectRef}\n`);
    console.log(`📧 Email: ${email}\n`);
    console.log('⚠️  WARNING: This action cannot be undone!\n');

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
      const errorText = await getUserResponse.text();
      throw new Error(`Failed to get user: ${errorText}`);
    }

    const usersData = await getUserResponse.json();
    if (!usersData.users || usersData.users.length === 0) {
      console.log('ℹ️  User not found. Nothing to delete.');
      process.exit(0);
    }

    const userId = usersData.users[0].id;
    console.log(`📋 User ID: ${userId}\n`);

    // Show what will be deleted
    console.log('📊 Checking related data...\n');

    // Check user profile
    const profileResponse = await fetch(
      `https://${projectRef}.supabase.co/rest/v1/user_profiles?id=eq.${userId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );

    if (profileResponse.ok) {
      const profiles = await profileResponse.json();
      if (profiles.length > 0) {
        console.log(`   ✓ User profile found (will be deleted via CASCADE)`);
      }
    }

    // Check user invites created by this user
    const invitesResponse = await fetch(
      `https://${projectRef}.supabase.co/rest/v1/user_invites?created_by=eq.${userId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );

    if (invitesResponse.ok) {
      const invites = await invitesResponse.json();
      if (invites.length > 0) {
        console.log(`   ✓ ${invites.length} user invite(s) found (will be kept, created_by will become NULL)`);
      }
    }

    console.log('\n');

    // Delete user profile first (though it will be deleted via CASCADE, this is cleaner)
    console.log('🗑️  Deleting user profile...');
    const deleteProfileResponse = await fetch(
      `https://${projectRef}.supabase.co/rest/v1/user_profiles?id=eq.${userId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );

    if (deleteProfileResponse.ok) {
      console.log('   ✅ User profile deleted');
    } else {
      const errorText = await deleteProfileResponse.text();
      // If profile doesn't exist, that's okay
      if (!errorText.includes('No rows')) {
        console.log(`   ⚠️  Could not delete profile: ${errorText}`);
      }
    }

    // Delete user from auth.users
    console.log('🗑️  Deleting user from auth.users...');
    const deleteUserResponse = await fetch(
      `https://${projectRef}.supabase.co/auth/v1/admin/users/${userId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );

    if (!deleteUserResponse.ok) {
      const errorText = await deleteUserResponse.text();
      throw new Error(`Failed to delete user: ${errorText}`);
    }

    console.log('   ✅ User deleted from auth.users\n');

    console.log('✅ User and all related data successfully deleted!');
    console.log('\n📋 Summary:');
    console.log(`   Email: ${email}`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Status: Deleted`);
    
  } catch (error) {
    console.error('❌ Failed to delete user:', error.message);
    console.error('\n💡 Alternative: Delete the user manually in Supabase Dashboard:');
    console.error('   Authentication > Users > Find user > Delete');
    process.exit(1);
  }
}

// Ask for confirmation (in a real scenario, you might want to use readline)
console.log('⚠️  This will permanently delete the user: info@databiz.app');
console.log('⚠️  Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');

setTimeout(() => {
  deleteUser();
}, 3000);

