#!/usr/bin/env node

/**
 * Brands Seeder
 * 
 * Loads brands from CSV file and inserts them into the brands table.
 * Idempotent: skips brands that already exist (case-insensitive).
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..', '..');

// Load environment variables from .env.local
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
      
      process.env[key] = value;
    }
  });
}

// Import Supabase client (we need to create a server-side compatible version)
// Since we're in a .mjs file, we can't directly import TypeScript files
// We'll create the Supabase client directly here

/**
 * Get Supabase client for seeding
 */
async function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Supabase credentials required. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment.'
    );
  }

  // Dynamic import of @supabase/supabase-js
  const { createClient } = await import('@supabase/supabase-js');
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Main seeder function
 */
export default async function seedBrands() {
  const csvPath = join(__dirname, '..', 'data', 'brands.csv');

  // Check if CSV exists
  if (!existsSync(csvPath)) {
    throw new Error(`Brands CSV not found: ${csvPath}`);
  }

  console.log(`   📄 Reading CSV: ${csvPath}`);

  // Read CSV file
  const csvContent = readFileSync(csvPath, 'utf-8');

  // Parse CSV
  return new Promise((resolve, reject) => {
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      worker: false,
      complete: async (results) => {
        if (results.errors.length > 0) {
          const errorMessages = results.errors.map(e => e.message).join('; ');
          reject(new Error(`CSV parsing errors: ${errorMessages}`));
          return;
        }

        try {
          // Extract brand names from CSV
          const brandNames = results.data
            .map(row => {
              const name = row.name;
              if (!name || typeof name !== 'string') {
                return null;
              }
              return name.trim();
            })
            .filter(name => name && name.length > 0);

          if (brandNames.length === 0) {
            throw new Error('No valid brand names found in CSV');
          }

          console.log(`   📊 Found ${brandNames.length} brands in CSV`);

          // Get Supabase client
          const supabase = await getSupabaseClient();

          // STEP 1: Check if brands table is empty (SEED STRATEGY: Empty Table Only)
          console.log(`   🔍 Checking if brands table is empty...`);
          const { count, error: countError } = await supabase
            .from('brands')
            .select('*', { count: 'exact', head: true });

          if (countError) {
            throw new Error(`Failed to check brands table: ${countError.message}`);
          }

          if (count > 0) {
            throw new Error(
              `Table 'brands' is not empty (${count} rows). ` +
              `Seed can only run on empty tables. ` +
              `To reset the table, manually delete all rows first.`
            );
          }

          console.log(`   ✅ Brands table is empty, proceeding with seed...`);

          // STEP 2: Proceed with seeding (no need to check for duplicates since table is empty)
          console.log(`   ➕ Inserting ${brandNames.length} brands...`);

          if (fetchError) {
            throw new Error(`Failed to fetch existing brands: ${fetchError.message}`);
          }

          // Prepare brands for insertion (table is empty, so all brands are new)
          const brandsData = brandNames.map(name => ({
            name,
          }));

          // Batch insert (500 per batch)
          const batchSize = 500;
          let inserted = 0;
          const errors = [];

          for (let i = 0; i < brandsData.length; i += batchSize) {
            const batch = brandsData.slice(i, i + batchSize);
            
            const { error: insertError } = await supabase
              .from('brands')
              .insert(batch);

            if (insertError) {
              // Handle unique constraint violations (shouldn't happen since table is empty, but just in case)
              if (insertError.code === '23505') {
                console.log(`   ⚠️  Batch ${Math.floor(i / batchSize) + 1} has duplicates, skipping`);
                errors.push(`Batch ${Math.floor(i / batchSize) + 1}: Duplicate brands detected`);
              } else {
                throw new Error(`Failed to insert brands: ${insertError.message}`);
              }
            } else {
              inserted += batch.length;
            }
          }

          resolve({
            inserted,
            skipped: 0, // Table was empty, so nothing was skipped
            errors,
          });
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      },
    });
  });
}

