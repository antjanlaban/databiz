import { getSupabaseServer } from './supabase-server';
import { EANVariant } from './database.types';

/**
 * Simple fuzzy string matching for name comparison
 * Returns similarity score between 0 and 1
 */
function fuzzyMatch(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Simple character overlap check
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  
  // Check word overlap
  const words1Set = new Set(words1);
  const words2Set = new Set(words2);
  const wordIntersection = new Set([...words1Set].filter(x => words2Set.has(x)));
  const wordUnion = new Set([...words1Set, ...words2Set]);
  
  if (wordUnion.size === 0) return 0;
  const wordSimilarity = wordIntersection.size / wordUnion.size;
  
  // Character-level similarity
  const chars1 = new Set(s1.split(''));
  const chars2 = new Set(s2.split(''));
  const charIntersection = new Set([...chars1].filter(x => chars2.has(x)));
  const charUnion = new Set([...chars1, ...chars2]);
  
  const charSimilarity = charUnion.size > 0 ? charIntersection.size / charUnion.size : 0;
  
  // Combine word and character similarity
  return (wordSimilarity * 0.7 + charSimilarity * 0.3);
}

/**
 * Duplicate detection result
 */
export interface DuplicateResult {
  ean: string;
  isDuplicate: boolean;
  existingVariant: EANVariant | null;
  nameSimilarity: number;
  warning: string | null;
}

/**
 * Check if EAN already exists in ean_variants table
 * @param ean EAN code to check
 * @returns Existing variant or null
 */
export async function checkEANExists(ean: string): Promise<EANVariant | null> {
  const supabase = getSupabaseServer();

  const { data: variant, error } = await supabase
    .from('ean_variants')
    .select('*')
    .eq('ean', ean)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned (not found)
      return null;
    }
    throw new Error(`Failed to check EAN existence: ${error.message}`);
  }

  return variant;
}

/**
 * Check multiple EANs for duplicates
 * @param eans Array of EAN codes to check
 * @returns Map of EAN to existing variant (or null)
 */
export async function checkEANsExist(
  eans: string[]
): Promise<Map<string, EANVariant | null>> {
  const supabase = getSupabaseServer();

  if (!eans || eans.length === 0) {
    return new Map();
  }

  const { data: variants, error } = await supabase
    .from('ean_variants')
    .select('*')
    .in('ean', eans)
    .eq('is_active', true);

  if (error) {
    throw new Error(`Failed to check EANs existence: ${error.message}`);
  }

  // Create map of EAN to variant
  const eanMap = new Map<string, EANVariant | null>();
  
  // Initialize all EANs as null (not found)
  for (const ean of eans) {
    eanMap.set(ean, null);
  }

  // Set found variants
  for (const variant of variants || []) {
    eanMap.set(variant.ean, variant);
  }

  return eanMap;
}

/**
 * Detect duplicates for a single row
 * @param ean EAN code
 * @param name Generated product name
 * @returns Duplicate detection result
 */
export async function detectDuplicate(
  ean: string,
  name: string
): Promise<DuplicateResult> {
  const existingVariant = await checkEANExists(ean);

  if (!existingVariant) {
    return {
      ean,
      isDuplicate: false,
      existingVariant: null,
      nameSimilarity: 0,
      warning: null,
    };
  }

  // EAN exists, check name similarity
  const similarity = fuzzyMatch(name, existingVariant.name);
  const threshold = 0.5; // If similarity < 0.5, warn about name difference

  let warning: string | null = null;
  if (similarity < threshold) {
    warning = `EAN bestaat al, maar naam wijkt sterk af. Bestaande naam: "${existingVariant.name}", Nieuwe naam: "${name}"`;
  }

  return {
    ean,
    isDuplicate: true,
    existingVariant,
    nameSimilarity: similarity,
    warning,
  };
}

/**
 * Detect duplicates for multiple rows
 * @param rows Array of rows with EAN and name
 * @returns Array of duplicate detection results
 */
export async function detectDuplicates(
  rows: Array<{ ean: string; name: string }>
): Promise<DuplicateResult[]> {
  if (!rows || rows.length === 0) {
    return [];
  }

  // Batch check all EANs
  const eans = rows.map(r => r.ean);
  const eanMap = await checkEANsExist(eans);

  // Process each row
  const results: DuplicateResult[] = [];

  for (const row of rows) {
    const existingVariant = eanMap.get(row.ean) || null;

    if (!existingVariant) {
      results.push({
        ean: row.ean,
        isDuplicate: false,
        existingVariant: null,
        nameSimilarity: 0,
        warning: null,
      });
      continue;
    }

    // EAN exists, check name similarity
    const similarity = fuzzyMatch(row.name, existingVariant.name);
    const threshold = 0.5;

    let warning: string | null = null;
    if (similarity < threshold) {
      warning = `EAN bestaat al, maar naam wijkt sterk af. Bestaande naam: "${existingVariant.name}", Nieuwe naam: "${row.name}"`;
    }

    results.push({
      ean: row.ean,
      isDuplicate: true,
      existingVariant,
      nameSimilarity: similarity,
      warning,
    });
  }

  return results;
}

/**
 * Deactivate existing variant (set is_active = false)
 * @param variantId Variant ID to deactivate
 */
export async function deactivateVariant(variantId: string): Promise<void> {
  const supabase = getSupabaseServer();

  const { error } = await supabase
    .from('ean_variants')
    .update({ is_active: false })
    .eq('id', variantId);

  if (error) {
    throw new Error(`Failed to deactivate variant: ${error.message}`);
  }
}

/**
 * Deactivate multiple variants
 * @param variantIds Array of variant IDs to deactivate
 */
export async function deactivateVariants(variantIds: string[]): Promise<void> {
  if (!variantIds || variantIds.length === 0) {
    return;
  }

  const supabase = getSupabaseServer();

  const { error } = await supabase
    .from('ean_variants')
    .update({ is_active: false })
    .in('id', variantIds);

  if (error) {
    throw new Error(`Failed to deactivate variants: ${error.message}`);
  }
}

