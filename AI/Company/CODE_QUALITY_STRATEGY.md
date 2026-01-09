# DataBiz Code Quality Strategy

> **Version**: 1.0.0  
> **Last Updated**: 2026-01-08  
> **Applies to**: DataBiz project (Prototype → MVP transition)  
> **Related Documents**: [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), [README.md](README.md), [AI/README.md](../README.md)

---

## 🎯 Philosophy & Principles

### 1. Consistency First

**Same patterns everywhere prevent refactoring.**

- ✅ **DO**: Use existing patterns before creating new ones
- ✅ **DO**: Check this document and related docs before implementing
- ❌ **DON'T**: Invent new patterns without checking existing codebase
- ❌ **DON'T**: Mix different approaches for the same problem

**Rationale**: Inconsistent patterns create technical debt. When patterns are consistent, AI agents and developers can predict where code lives and how it works.

### 2. Patterns over Perfection

**Good enough patterns now > perfect patterns later.**

- ✅ **DO**: Choose patterns that scale to MVP
- ✅ **DO**: Document decisions and trade-offs
- ❌ **DON'T**: Over-engineer for hypothetical future needs
- ❌ **DON'T**: Refactor working code "just because"

**Rationale**: We're in prototype phase. Speed matters, but we must avoid patterns that will require major refactoring at MVP.

### 3. AI Agent Friendly

**Clear, enforceable rules for AI agents.**

- ✅ **DO**: Provide explicit examples of correct patterns
- ✅ **DO**: Document anti-patterns to avoid
- ✅ **DO**: Create checklists for common tasks
- ❌ **DON'T**: Leave patterns ambiguous or open to interpretation

**Rationale**: AI agents need explicit guidance. Vague rules lead to inconsistent implementations.

### 4. Prevent Refactoring

**Choose patterns that scale to MVP without major changes.**

- ✅ **DO**: Use TypeScript strict mode (already enabled)
- ✅ **DO**: Structure code for growth (DDD structure)
- ✅ **DO**: Separate concerns (services, schemas, types)
- ❌ **DON'T**: Create tight coupling between domains
- ❌ **DON'T**: Use patterns that won't scale

**Rationale**: Refactoring is expensive. Better to start with scalable patterns than fix later.

---

## 📁 Code Organization Patterns

### File Naming Conventions

**Standardize on these conventions:**

| Type | Convention | Example |
|------|------------|---------|
| React Components | PascalCase | `UploadSection.tsx` |
| API Routes | kebab-case | `upload/route.ts` |
| Services | PascalCase | `AuthService.ts` |
| Utilities | camelCase | `fileProcessor.ts` |
| Types | camelCase with `.types.ts` | `user.types.ts` |
| Schemas | camelCase with `.schema.ts` | `invite.schema.ts` |
| Constants | UPPER_SNAKE_CASE | `upload-constants.ts` |

**Current State**: Mixed conventions exist. Standardize as we touch files.

### Component Size Limits

**Reference existing guidelines:**

| Component Type | Max Lines | Location |
|----------------|-----------|----------|
| Page Component | 100 | `app/(routes)/` |
| Feature Component | 150 | `components/` |
| UI Component | 100 | `components/ui/` |
| Service Class | 200 | `src/domains/*/services/` |
| Utility Function | 80 | `lib/` |

**Rule**: If a component exceeds these limits, extract sub-components or split into smaller functions.

### Function Responsibility Rules

**One function, one responsibility:**

- ✅ **DO**: Keep functions focused on a single task
- ✅ **DO**: Extract complex logic into separate functions
- ✅ **DO**: Use descriptive function names
- ❌ **DON'T**: Create functions that do multiple unrelated things
- ❌ **DON'T**: Use generic names like `process()` or `handle()`

**Example**:
```typescript
// ✅ GOOD: Clear responsibility
async function validateFileExtension(file: File): Promise<ValidationResult> {
  // Only validates extension
}

// ❌ BAD: Multiple responsibilities
async function processFile(file: File): Promise<void> {
  // Validates, uploads, parses, and processes - too much!
}
```

### Import Organization

**Standardize import order:**

1. External dependencies (React, Next.js, etc.)
2. Internal absolute imports (`@/lib/`, `@/components/`)
3. Relative imports (`./`, `../`)
4. Type-only imports (use `import type`)

**Example**:
```typescript
// External
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Internal absolute
import { getSupabaseServer } from '@/lib/supabase-server';
import { UploadErrorCode } from '@/lib/upload-constants';

// Relative
import { validateFile } from './fileValidation';

// Types
import type { FileMetadata } from './types';
```

---

## ⚠️ Error Handling Standards

### API Route Error Responses

**Standardize on this format:**

```typescript
// ✅ GOOD: Success response
NextResponse.json(
  {
    success: true,
    data: { sessionId: 123, fileName: 'file.csv' },
    message: 'File uploaded successfully', // Optional
  },
  { status: 200 }
);

// ✅ GOOD: Error response with error code
NextResponse.json(
  {
    success: false,
    error: UploadErrorCode.FILE_NOT_PROVIDED,
    message: getErrorMessage(UploadErrorCode.FILE_NOT_PROVIDED),
  },
  { status: 400 }
);

// ❌ BAD: Inconsistent error format
NextResponse.json({ error: 'File not provided' }, { status: 400 });
NextResponse.json({ success: false, msg: 'Failed' }, { status: 500 });
```

**Current State**: Mixed formats exist. Some routes use `error` field, some use direct messages. Standardize as we touch routes.

### Error Code Pattern

**Use error code enums for consistency:**

```typescript
// ✅ GOOD: Centralized error codes (like upload-constants.ts)
export enum UploadErrorCode {
  FILE_NOT_PROVIDED = 'FILE_NOT_PROVIDED',
  FILE_EXTENSION_INVALID = 'FILE_EXTENSION_INVALID',
  // ...
}

export function getErrorMessage(code: UploadErrorCode, details?: string): string {
  const messages: Record<UploadErrorCode, string> = {
    [UploadErrorCode.FILE_NOT_PROVIDED]: 'No file provided in request',
    // ...
  };
  return messages[code] || 'An unknown error occurred';
}
```

**Rule**: Create error code enums per domain/module. Use `getErrorMessage()` for user-friendly messages.

### Error Logging Pattern

**Use structured logging (replace console.log):**

```typescript
// ✅ GOOD: Structured logging with context
console.error('[ModuleName] Operation failed', {
  error: errorMessage,
  context: { sessionId, fileName },
  stack: errorStack,
});

// ❌ BAD: Unstructured console.log
console.log('Error:', error);
```

**Current State**: 91 console.log/warn/error calls in `lib/`, 49 in `app/api/`. Replace with structured logging incrementally.

### Error Recovery Strategies

**Document recovery patterns per error type:**

| Error Type | Recovery Strategy | Example |
|------------|-------------------|---------|
| Validation Error | Return 400, don't retry | Invalid file extension |
| Database Error | Log, return 500, may retry | Connection failure |
| Storage Error | Log, mark session failed, graceful degradation | File not found |
| Business Logic Error | Return 400/409, user action required | Duplicate file |

**Rule**: Always update session/entity status on error. Never leave entities in inconsistent states.

---

## 🔒 Type Safety & Validation

### TypeScript Strict Mode

**Already enabled. Maintain these rules:**

- ✅ `strict: true` in `tsconfig.json`
- ✅ No `any` types (use `unknown` if type is truly unknown)
- ✅ Explicit return types for exported functions
- ✅ Type definitions for all API responses

**Rule**: If TypeScript complains, fix the type issue. Don't use `@ts-ignore` or `any` to bypass.

### Zod Schema Patterns

**Use Zod for runtime validation:**

```typescript
// ✅ GOOD: Zod schema for API input
const uploadSchema = z.object({
  file: z.instanceof(File),
  supplierId: z.string().uuid(),
});

// In route handler
const body = uploadSchema.parse(await request.json());
```

**Location**: Place schemas in `src/domains/{domain}/schemas/` following DDD structure.

**Current State**: Some routes use Zod (auth routes), others don't. Standardize as we touch routes.

### Type Definitions Location

**Organize types by domain:**

```
src/domains/
├── identity/
│   ├── types/
│   │   ├── user.types.ts
│   │   └── invite.types.ts
│   └── schemas/
│       ├── user.schema.ts
│       └── invite.schema.ts
└── imports/
    ├── types/
    │   └── session.types.ts
    └── schemas/
        └── upload.schema.ts
```

**Rule**: Types go in `types/`, Zod schemas go in `schemas/`. Keep them separate.

---

## 🛠️ Code Quality Tools

### Phase 1: Prototype (Now)

**Minimal tooling to enforce consistency:**

1. **Prettier** - Automatic code formatting
2. **ESLint Extension** - Consistency rules (no-console, naming, etc.)
3. **Pre-commit Hooks** - Format + lint staged files only

**Rationale**: Don't slow down prototype development. Focus on preventing common issues.

### Phase 2: MVP Preparation (Later)

**Additional tooling for production readiness:**

1. **TypeScript Strictness Increase** - `noUnusedLocals`, `noUnusedParameters`
2. **Test Coverage Requirements** - Minimum 70% (per existing standards)
3. **CI/CD Quality Gates** - Block merge if lint/test fails

**Rationale**: Add stricter rules as we approach MVP. Don't add them during prototype phase.

---

## 📝 Logging & Debugging Standards

### Remove Debug Code

**Current Issue**: Debug fetch calls exist in `lib/fileProcessor.ts`:

```typescript
// ❌ BAD: Debug code in production
fetch('http://127.0.0.1:7243/ingest/...', { /* ... */ }).catch(() => {});
```

**Rule**: Remove all debug code before committing. Use proper logging instead.

### Structured Logging Pattern

**Replace console.log with structured logging:**

```typescript
// ✅ GOOD: Structured logging with context
const logContext = {
  module: 'FileProcessor',
  operation: 'processFile',
  sessionId,
  fileName: session.file_name,
};

console.log(`[${logContext.module}] Starting ${logContext.operation}`, logContext);
console.error(`[${logContext.module}] ${logContext.operation} failed`, {
  ...logContext,
  error: errorMessage,
  stack: errorStack,
});

// ❌ BAD: Unstructured logging
console.log('Processing file');
console.log('Error:', error);
console.log(`Session ${sessionId} failed`);
```

**Log Levels**:
- `console.log` - Info (operation start, progress)
- `console.warn` - Warnings (non-critical issues)
- `console.error` - Errors (failures, exceptions)

**Rule**: Always include context (module name, operation, relevant IDs) in log messages.

### Logging Format

**Standardize log message format:**

```
[ModuleName] Message description
```

**Examples**:
- `[FileProcessor] Processing session 123: file.csv`
- `[EANAnalysis] Error processing session 123: Invalid column`
- `[Upload] File uploaded successfully: file.csv`

**Rule**: Use consistent module names. Match the file/service name.

---

## 🤖 AI Agent Guidelines

### Pattern Verification Checklist

**Before writing code, verify:**

- [ ] Checked existing similar code for patterns
- [ ] Used existing error handling pattern
- [ ] Used existing logging pattern
- [ ] Followed file naming conventions
- [ ] Used existing type definitions
- [ ] Checked for existing utilities before creating new ones

### "Check Existing Patterns First" Rule

**Always check before creating:**

1. **Error Handling**: Check `lib/upload-constants.ts` for error code pattern
2. **API Routes**: Check `app/api/upload/route.ts` for response format
3. **Services**: Check `src/domains/identity/services/` for service structure
4. **Types**: Check `src/domains/*/types/` for type definitions
5. **Schemas**: Check `src/domains/*/schemas/` for Zod patterns

**Rule**: If a pattern exists, use it. Don't create a new one.

### Code Review Criteria

**Before marking code complete, verify:**

- [ ] No `console.log` (use structured logging)
- [ ] No debug code (remove fetch calls, TODO comments)
- [ ] Error handling follows standard format
- [ ] Types are defined (no `any`)
- [ ] Zod validation for API inputs
- [ ] File size within limits
- [ ] Function has single responsibility

### Anti-Patterns to Avoid

**Common mistakes to prevent:**

1. **❌ Mixing error response formats**
   ```typescript
   // BAD: Inconsistent formats
   return NextResponse.json({ error: 'Message' }); // Route A
   return NextResponse.json({ success: false, message: 'Message' }); // Route B
   ```

2. **❌ Using console.log for errors**
   ```typescript
   // BAD: Unstructured logging
   console.log('Error:', error);
   ```

3. **❌ Leaving debug code**
   ```typescript
   // BAD: Debug code in production
   fetch('http://localhost:7243/...');
   ```

4. **❌ Creating new patterns without checking**
   ```typescript
   // BAD: New error format when standard exists
   return { status: 'error', msg: 'Failed' };
   ```

5. **❌ Using `any` to bypass TypeScript**
   ```typescript
   // BAD: Bypassing type safety
   const data: any = await response.json();
   ```

---

## 🔄 Migration Path

### Incremental Adoption

**Don't break prototype speed. Apply standards incrementally:**

1. **New Code**: Always follow standards
2. **Touched Code**: Apply standards when modifying
3. **Legacy Code**: Leave alone unless refactoring

**Rule**: Don't do mass refactoring. Apply standards as you touch code.

### Priority Order

**High-impact patterns first:**

1. **Error Response Format** - Affects all API routes
2. **Logging Pattern** - Affects all modules
3. **Type Definitions** - Affects type safety
4. **File Naming** - Affects code organization
5. **Component Size** - Affects maintainability

**Rule**: Fix patterns that cause the most inconsistency first.

### Refactoring Guidelines

**When to refactor vs. when to leave:**

| Situation | Action |
|-----------|--------|
| Adding new feature to existing file | Apply standards to new code, leave old code |
| Fixing bug in existing file | Apply standards to fixed code |
| Major feature rewrite | Apply all standards |
| Code works, no changes needed | Leave alone |

**Rule**: Refactor when it adds value (fixing bugs, adding features). Don't refactor "just because."

---

## 📚 Related Documents

- **[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)** - UI component patterns and design principles
- **[README.md](README.md)** - Project context and agent guidelines
- **[AI/README.md](../README.md)** - Technical requirements and database model
- **[.ai/company/QUALITY_RULES.md](../../.ai/company/agent-library/QUALITY_RULES.md)** - Iron Dome protocol
- **[.ai/company/GENERAL_POLICY.md](../../.ai/company/GENERAL_POLICY.md)** - Company-wide standards

---

## ✅ Success Criteria

- [x] AI agents can reference clear patterns
- [x] Inconsistent patterns are documented and standardized
- [ ] Code quality tools prevent common issues (Phase 1)
- [ ] All new code follows standards
- [ ] Existing code migrates incrementally

---

**Last Updated**: 2026-01-08  
**Version**: 1.0.0

