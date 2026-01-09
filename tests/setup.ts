/**
 * Vitest setup file
 * Runs before each test file
 */

import { expect, afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Add custom matchers if needed
expect.extend({});


