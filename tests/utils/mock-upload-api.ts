/**
 * Helper functions for mocking upload API tests
 */

import { vi } from 'vitest';

export function createMockSupabaseForUpload() {
  let callCount = 0;
  
  const mockFrom = vi.fn().mockImplementation(() => {
    callCount++;
    
    // First call: duplicate check (select().eq().single())
    if (callCount === 1) {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };
    }
    
    // Second call: insert (insert().select().single())
    if (callCount === 2) {
      return {
        insert: vi.fn(),
      };
    }
    
    // Third call: update (update().eq())
    if (callCount === 3) {
      return {
        update: vi.fn(),
      };
    }
    
    // Default
    return {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };
  });

  return {
    from: mockFrom,
    reset: () => {
      callCount = 0;
      mockFrom.mockClear();
    },
  };
}

