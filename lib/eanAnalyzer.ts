import { extractEANColumnValues } from './fileParser';
import { validateGTIN13 } from './eanDetection';

/**
 * Result of EAN analysis
 */
export interface EANAnalysisResult {
  uniqueCount: number;
  duplicateCount: number;
  totalEANs: number;
}

/**
 * Analyzes EAN codes in a file column
 * Counts unique EAN codes and detects duplicates
 * 
 * @param file - The file to analyze
 * @param eanColumnName - Name of the column containing EAN codes
 * @returns Promise resolving to analysis results
 */
export async function analyzeEANs(file: File, eanColumnName: string): Promise<EANAnalysisResult> {
  // Extract all EAN values from the column
  const eanValues = await extractEANColumnValues(file, eanColumnName);

  // Filter to only valid GTIN-13 codes
  const validEANs = eanValues
    .map(value => value.trim())
    .filter(value => validateGTIN13(value));

  // Count occurrences of each EAN
  const eanCounts: { [ean: string]: number } = {};
  
  validEANs.forEach(ean => {
    eanCounts[ean] = (eanCounts[ean] || 0) + 1;
  });

  // Calculate statistics
  const uniqueEANs = Object.keys(eanCounts);
  const uniqueCount = uniqueEANs.length;
  const totalEANs = validEANs.length;
  
  // Count duplicates: EAN codes that appear more than once
  const duplicateCount = uniqueEANs.filter(ean => eanCounts[ean] > 1).length;

  return {
    uniqueCount,
    duplicateCount,
    totalEANs,
  };
}

