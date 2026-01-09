/**
 * Script to convert an approved session to JSON
 * Run with: npx tsx scripts/convert-session-to-json.ts <sessionId>
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { convertApprovedDatasetToJSON } from '../lib/dataConverter';

async function convertSession(sessionId: number) {
  console.log(`🔄 Converting session ${sessionId} to JSON...\n`);

  try {
    const jsonPath = await convertApprovedDatasetToJSON(sessionId);
    console.log(`✅ Successfully converted session ${sessionId} to JSON`);
    console.log(`   JSON path: ${jsonPath}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to convert session ${sessionId}:`, errorMessage);
    process.exit(1);
  }
}

// Get session ID from command line argument
const sessionIdArg = process.argv[2];
if (!sessionIdArg) {
  console.error('Usage: npx tsx scripts/convert-session-to-json.ts <sessionId>');
  process.exit(1);
}

const sessionId = parseInt(sessionIdArg, 10);
if (isNaN(sessionId)) {
  console.error('Invalid session ID. Must be a number.');
  process.exit(1);
}

// Run the conversion
convertSession(sessionId).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

