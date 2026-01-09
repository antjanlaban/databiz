import { getSupabaseServer } from './supabase-server';
import { Brand } from './database.types';

/**
 * Simple fuzzy string matching (Levenshtein-like)
 * Returns similarity score between 0 and 1
 */
function fuzzyMatch(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Simple character overlap check
  const chars1 = new Set(s1.split(''));
  const chars2 = new Set(s2.split(''));
  const intersection = new Set([...chars1].filter(x => chars2.has(x)));
  const union = new Set([...chars1, ...chars2]);
  
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Brand column name patterns to search for
 */
const BRAND_COLUMN_PATTERNS = [
  'merk',
  'brand',
  'fabrikant',
  'manufacturer',
  'producent',
  'leverancier',
  'supplier',
  'marca',
  'marque',
];

/**
 * Detect brand column in dataset
 * @param columnNames Array of column names from dataset
 * @returns Best matching column name or null if not found
 */
export function detectBrandColumn(columnNames: string[]): string | null {
  if (!columnNames || columnNames.length === 0) {
    return null;
  }

  // Normalize column names for matching
  const normalizedColumns = columnNames.map(name => ({
    original: name,
    normalized: name.toLowerCase().trim(),
  }));

  // First, try exact match (case-insensitive)
  for (const pattern of BRAND_COLUMN_PATTERNS) {
    const exactMatch = normalizedColumns.find(
      col => col.normalized === pattern
    );
    if (exactMatch) {
      return exactMatch.original;
    }
  }

  // Then, try fuzzy match
  let bestMatch: { column: string; score: number } | null = null;
  const threshold = 0.6; // Minimum similarity score

  for (const pattern of BRAND_COLUMN_PATTERNS) {
    for (const col of normalizedColumns) {
      const score = fuzzyMatch(col.normalized, pattern);
      if (score >= threshold) {
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { column: col.original, score };
        }
      }
    }
  }

  return bestMatch ? bestMatch.column : null;
}

/**
 * Get all distinct brand values from a column in dataset
 * @param data Array of row objects
 * @param columnName Name of the column to extract values from
 * @returns Array of distinct brand values (non-empty, trimmed)
 */
export function extractDistinctBrandValues(
  data: Record<string, any>[],
  columnName: string
): string[] {
  if (!data || data.length === 0) {
    return [];
  }

  const values = new Set<string>();
  
  for (const row of data) {
    const value = row[columnName];
    if (value !== null && value !== undefined && value !== '') {
      const trimmed = String(value).trim();
      if (trimmed) {
        values.add(trimmed);
      }
    }
  }

  return Array.from(values).sort();
}

/**
 * Check which brand values exist in brands table
 * @param brandValues Array of brand names to check
 * @returns Object with existing and missing brands
 */
export async function checkBrandsExist(
  brandValues: string[]
): Promise<{
  existing: Brand[];
  missing: string[];
}> {
  const supabase = getSupabaseServer();

  if (!brandValues || brandValues.length === 0) {
    return { existing: [], missing: [] };
  }

  // Get all brands and match case-insensitively
  const { data: allBrands, error } = await supabase
    .from('brands')
    .select('id, name');

  if (error) {
    console.error('[BrandDetector] Error checking brands:', error);
    // If error, assume all are missing (conservative approach)
    return { existing: [], missing: brandValues };
  }

  // Create map of lowercase name to brand
  const brandMap = new Map<string, Brand>();
  (allBrands || []).forEach(brand => {
    brandMap.set(brand.name.toLowerCase(), brand);
  });

  // Match brand values case-insensitively
  const existing: Brand[] = [];
  const missing: string[] = [];

  for (const value of brandValues) {
    const normalized = value.toLowerCase();
    const brand = brandMap.get(normalized);
    if (brand) {
      existing.push(brand);
    } else {
      missing.push(value);
    }
  }

  return { existing, missing };
}

/**
 * Create brand in brands table
 * @param brandName Name of the brand to create
 * @returns Created brand
 */
export async function createBrand(brandName: string): Promise<Brand> {
  const supabase = getSupabaseServer();

  const { data: brand, error } = await supabase
    .from('brands')
    .insert({ name: brandName })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create brand: ${error.message}`);
  }

  if (!brand) {
    throw new Error('Brand creation returned no data');
  }

  return brand;
}

/**
 * Get all brands from database
 * @returns Array of all brands
 */
export async function getAllBrands(): Promise<Brand[]> {
  const supabase = getSupabaseServer();

  const { data: brands, error } = await supabase
    .from('brands')
    .select('id, name, created_at')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch brands: ${error.message}`);
  }

  return brands || [];
}

/**
 * Match brand value to existing brand (fuzzy search)
 * @param brandValue Brand value to match
 * @param existingBrands Array of existing brands
 * @returns Best matching brand or null if no good match
 */
export function matchBrandToExisting(
  brandValue: string,
  existingBrands: Brand[]
): Brand | null {
  if (!brandValue || !existingBrands || existingBrands.length === 0) {
    return null;
  }

  const normalizedValue = brandValue.toLowerCase().trim();

  // First, try exact match (case-insensitive)
  const exactMatch = existingBrands.find(
    b => b.name.toLowerCase().trim() === normalizedValue
  );
  if (exactMatch) {
    return exactMatch;
  }

  // Then, try fuzzy match
  let bestMatch: { brand: Brand; score: number } | null = null;
  const threshold = 0.7; // Higher threshold for brand matching

  for (const brand of existingBrands) {
    const score = fuzzyMatch(normalizedValue, brand.name);
    if (score >= threshold) {
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { brand, score };
      }
    }
  }

  return bestMatch ? bestMatch.brand : null;
}

