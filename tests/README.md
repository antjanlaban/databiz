# Test Documentation

## Test Setup

This project uses [Vitest](https://vitest.dev/) for testing, configured for Next.js 15 with TypeScript.

## Test Structure

```
tests/
├── unit/                    # Unit tests (isolated functions)
│   └── lib/
│       └── fileValidation.test.ts
├── integration/             # Integration tests (API routes, services)
│   └── api/
│       └── upload.test.ts
├── utils/                   # Test utilities and helpers
│   ├── test-helpers.ts      # General test utilities
│   ├── mock-supabase.ts     # Supabase mocking utilities
│   └── mock-upload-api.ts   # Upload API specific mocks
└── setup.ts                 # Vitest setup file
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests once (CI mode)
npm run test:run

# Run tests with coverage
npm run test:coverage
```

## Test Types

### Unit Tests
- Test individual functions in isolation
- No external dependencies
- Fast execution
- Examples: `fileValidation.test.ts`

### Integration Tests
- Test API routes and service interactions
- Mock external dependencies (Supabase, Storage)
- Test complete workflows
- Examples: `upload.test.ts`

## Test Utilities

### `createMockFile(name, content, type)`
Creates a mock File object for testing.

### `createTestCSV(rows)`
Creates CSV content from array of objects.

### `createTestProducts(count)`
Generates test product data.

### `createMockSupabaseForUpload()`
Creates a properly configured Supabase mock for upload API tests.

## Writing Tests

### Example Unit Test

```typescript
import { describe, it, expect } from 'vitest';
import { validateFileExtension } from '@/lib/fileValidation';

describe('validateFileExtension', () => {
  it('should accept .csv files', () => {
    const file = createMockFile('test.csv', 'content');
    const result = validateFileExtension(file);
    expect(result.valid).toBe(true);
  });
});
```

### Example Integration Test

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/upload/route';

describe('POST /api/upload', () => {
  it('should upload file successfully', async () => {
    // Setup mocks
    // Call API
    // Assert response
  });
});
```

## Coverage Goals

- **Unit Tests**: 80%+ code coverage
- **Integration Tests**: All API endpoints covered
- **Critical Paths**: 100% coverage

## Notes

- Tests run in Node.js environment (not browser)
- Use `vi.mock()` for mocking modules
- Clean up mocks in `beforeEach` hooks
- Tests should be isolated and independent

