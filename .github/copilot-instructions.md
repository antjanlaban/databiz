# DataBiz AI Coding Agent Instructions

## Project Overview
Next.js 15 app for importing product data (CSV/Excel) to Supabase PostgreSQL.
Workflow: upload → detect EAN conflicts → resolve conflicts → browse products.

## 🚨 Critical Rule: NO ASSUMPTIONS, ALWAYS VERIFY

**Always verify the actual system state:**

### Database & Supabase
```bash
# ✅ Correct: Check database schema in Supabase SQL Editor
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public';

# ✅ Check Supabase logs for errors
# Go to Supabase Dashboard → Logs → API/Database logs

# ❌ Wrong: Assume migration files reflect current state
```

### Code Verification
```bash
# ✅ Test actual API response
curl http://localhost:3000/api/endpoint

# ✅ Check console.log output in browser/terminal
# ❌ Assume code works without testing
```

**Examples where this fails:**
- ❌ "The products table has column X" → ✅ Query database: `SELECT * FROM products LIMIT 1`
- ❌ "The migration was executed" → ✅ Check Supabase Table Editor
- ❌ "The RLS policy works like this" → ✅ Test with query and check logs
- ❌ "The env var exists" → ✅ Check with `echo $NEXT_PUBLIC_SUPABASE_URL`

## Tech Stack
- Next.js 15 App Router + TypeScript
- Supabase (PostgreSQL)
- Tailwind CSS
- PapaParse (CSV) + ExcelJS (Excel)

## Key Patterns

### 1. Client-Side Data Access
All pages with database operations use:
```tsx
'use client';
export const dynamic = 'force-dynamic';
```
[lib/supabase.ts](lib/supabase.ts) is singleton with SSR fallbacks.

### 2. Database Schema
3 tables in [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql):
- `products` - Unique EAN, auto-updating `updated_at` trigger
- `import_sessions` - Status tracking: `pending|processing|completed|failed`
- `ean_conflicts` - JSONB product data, cascading deletes

Types: [lib/database.types.ts](lib/database.types.ts)

### 3. Upload Flow
[app/upload/page.tsx](app/upload/page.tsx): Parse → Create session → Batch EAN check with `.in()` → Insert new + create conflicts → Update status

Important details:
- Column matching is case-insensitive
- Validate required fields + trim whitespace
- Collect errors, don't stop import

### 4. Conflict Resolution
[app/conflicts/page.tsx](app/conflicts/page.tsx): Side-by-side comparison with 3 options (`keep_existing|use_new|skip`).
Updates are atomic: DB update → mark resolved → UI update.

### 5. Component Library
Minimal, extend as needed:
- Button: 3 variants (`primary`, `secondary`, `danger`)
- Card, Table, Navigation
Don't add heavy UI libraries.

## Development

### Setup
```bash
npm install
npm run dev  # http://localhost:3000
```

Env vars in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

### Database
Run [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql) in Supabase SQL Editor.
Schema contains triggers, indexes, and permissive RLS policies.

**Note**: No authentication implemented (intentional).

## Code Patterns

### Error Handling
```tsx
try {
  const { data, error } = await supabase.from('products').select('*');
  if (error) throw error;
} catch (err) {
  setError(err instanceof Error ? err.message : 'Operation failed');
}
```

### Supabase Queries
```tsx
// Batch lookups
.in('ean', eanArray)

// Filtering & sorting
.eq('resolved', false)
.order('created_at', { ascending: false })
```

### TypeScript
Use interfaces from [lib/database.types.ts](lib/database.types.ts). Check errors with `error instanceof Error`.

## File Organization

**Keep root directory clean**:
- Research → `research/` or `docs/research/`
- Scripts → `scripts/` folder
- Temp files → `temp/`
- ❌ No `.mjs`, test files, or experiments in root

## Testing
No automated tests. Manual validation:
1. Upload test CSV/Excel file with EAN, name, price, supplier columns
2. Check `/conflicts` page for duplicates
3. Verify `/eans` listings
4. Review `/sessions` history

## Key Files Reference
- [lib/supabase.ts](lib/supabase.ts) - Singleton Supabase client with SSR handling
- [lib/fileParser.ts](lib/fileParser.ts) - CSV/Excel parsing with validation
- [lib/database.types.ts](lib/database.types.ts) - TypeScript schema definitions
- [IMPLEMENTATION.md](IMPLEMENTATION.md) - Detailed technical decisions and security notes
