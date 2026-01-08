# Lovable Prompt Library

**Last Updated:** 17 oktober 2025  
**Version:** 1.0

---

## Overview

Ready-to-use prompts voor Lovable AI - copy-paste en aanpassen voor je specifieke needs.

**Prompt Structure:**

```
[Action] [Component/Feature] [Location]

Features:
- [List key features]

Requirements:
- [Technical specs]

Styling:
- [Design specs]

Data:
- [Data source and API]
```

---

## Category 1: Components

### Generic Data Table

```
Create reusable DataTable component in src/components/ui/data-table.tsx

Features:
- Generic type parameter for row data
- Column definitions with sortable support
- Pagination (client-side)
- Row selection (checkbox)
- Bulk action toolbar (shows when items selected)
- Empty state
- Loading skeleton
- Search/filter integration

Props:
- data: T[]
- columns: ColumnDef<T>[]
- onRowClick?: (row: T) => void
- enableRowSelection?: boolean
- pageSize?: number (default 20)

Styling:
- Dark mode support
- Compact rows: 36px height
- Text size: text-tiny (11px) for cells
- Hover: bg-interactive-hover
- Selected row: blue left border

Use TanStack Table for logic.
shadcn/ui Table components for styling.
```

---

### Product Card Component

```
Create ProductCard component in src/components/products/ProductCard.tsx

Props:
- sku: ProductSKU (with nested style, color_variant, brand)
- onClick?: () => void

Display:
- Product image (color variant primary image)
- SKU code (font-mono, text-tiny)
- Style name (text-sm, font-medium)
- Brand badge (pill, text-tiny)
- Price (text-base, font-semibold)
- Stock indicator:
  - Green dot if > 10
  - Orange dot + "Laag" if 1-10
  - Red dot + "Uitverkocht" if 0

Styling:
- Card from shadcn/ui
- bg-background-secondary in dark mode
- Hover: scale-105 transition
- Cursor pointer
- 16px padding

TypeScript: Full type safety with ProductSKU interface.
```

---

### Filter Bar Component

```
Create FilterBar component in src/components/common/FilterBar.tsx

Features:
- Multi-select dropdowns for: Brand, Color, Size
- Single-select for: Product Type (KERN/RAND), Status (Active/Inactive)
- Search input (debounced 300ms)
- Price range slider
- "Reset Filters" button (shows count)
- Results count display

Props:
- onFilterChange: (filters: FilterState) => void
- resultCount: number

State Management:
- Local state with useState
- Debounced search with useDebounce hook
- Emit filter changes to parent

Styling:
- Horizontal layout on desktop, stacked on mobile
- bg-background-secondary card
- 16px padding
- Gap 12px between filters
- Dark mode support

Use shadcn/ui: Select, Input, Slider, Button, Badge
```

---

## Category 2: Forms

### Product Style Form

```
Create ProductStyleForm component in src/components/products/ProductStyleForm.tsx

Mode: Create or Edit (based on prop)

Fields:
- style_name* (Input, max 200 chars, must be unique per brand)
- brand_id* (Select dropdown, fetch from Supabase brands table)
- supplier_article_code (Input, optional, max 100 chars - original supplier code)
- supplier_id (Select dropdown, fetch from suppliers, optional)
- product_type* (Radio buttons: KERN/RAND, default KERN)
- material_composition (Textarea, max 500 chars)
- fabric_weight (Input type number, suffix "g/m²")
- gender (Select: Unisex/Heren/Dames/Kinderen)
- description_short_nl (Textarea, max 500 chars)
- description_long_nl (Textarea, max 2000 chars)

Validation:
- Zod schema with all business rules
- style_name: required, unique per brand (check in database)
- supplier_article_code: optional, alphanumeric, max 100 chars
- Real-time validation errors under fields

Submit:
- If create: INSERT to product_styles, redirect to detail page
- If edit: UPDATE product_styles, show success toast

Styling:
- Single column layout
- Form from shadcn/ui
- Labels above inputs
- Helper text below inputs
- Dark mode
- Sticky footer with Cancel + Save buttons

Use React Hook Form + Zod + TanStack Mutation.
```

---

### SKU Bulk Edit Dialog

```
Create SKUBulkEditDialog component in src/components/products/SKUBulkEditDialog.tsx

Props:
- selectedSKUs: ProductSKU[] (array of selected items)
- onSave: (updates: Partial<ProductSKU>) => Promise<void>
- open: boolean
- onClose: () => void

Edit Options (tabs or sections):
1. Pricing:
   - Discount type: Percentage or Amount
   - Discount value (input)
   - Valid from (date picker)
   - Valid until (date picker)

2. Stock:
   - Action: Add to stock / Subtract / Set to
   - Quantity (input)

3. Status:
   - Active/Inactive toggle
   - Published/Unpublished toggle

Preview:
- Show: "X SKUs will be updated"
- List affected SKU codes (scrollable if many)

Actions:
- Cancel (close dialog)
- Apply (execute mutation)

Styling:
- Dialog from shadcn/ui
- Max width 600px
- Dark mode
- Form validation

On success: close dialog, show toast, refetch SKU list.
```

---

## Category 3: Pages

### Dashboard Page

```
Create Dashboard page at src/pages/Dashboard.tsx

Route: /dashboard

Layout:
- Hero section:
  - Welcome message: "Welkom terug, [User Name]"
  - Quick stats cards (grid 4-col):
    - Total Products (KERN only, active)
    - Import Jobs (this week)
    - Low Stock Items (< 10)
    - Recent Exports (today)

- Recent Activity section:
  - Timeline of recent actions:
    - Products created/updated
    - Imports completed
    - Exports synced
  - Show last 10 items
  - "View All" link

- Quick Actions section:
  - Large buttons for common tasks:
    - Nieuwe Import
    - Nieuw Product
    - Sync naar Gripp
    - Export naar Calculated

Styling:
- Grid layout (responsive)
- Cards with icons
- Stats: large numbers with trend indicators
- Dark mode
- Use Lucide React icons

Data: Fetch from multiple Supabase tables (products count, import_jobs, sync_jobs)
Use TanStack Query with parallel queries.
```

---

### Products List Page

```
Create Products list page at src/pages/products/ProductsList.tsx

Route: /products

Layout:
- Page header:
  - Title: "Producten"
  - Button: "Nieuw Product" (navigate to /products/new)

- FilterBar component (see component library)

- DataTable component:
  - Columns: Checkbox, SKU Code, Name, Brand, Color, Size, Price, Stock, Actions
  - Sort: by Name (default), SKU, Price, Stock
  - Row click: navigate to /products/:styleId
  - Actions menu (3-dot icon):
    - Edit
    - Archive
    - Duplicate

- Bulk Actions Toolbar (shows when items selected):
  - "X selected"
  - Edit Prices button
  - Update Stock button
  - Archive button
  - Clear selection

- Pagination: 20 items per page, show total count

Data:
- Query: product_skus with joins (style, brand, color_variant)
- Filter: WHERE tenant_id = current AND is_active = true
- Use TanStack Query with filter params

Styling:
- Full-width layout
- Cards for sections
- Dark mode
```

---

### Import Wizard Page

```
Create multi-step Import Wizard at src/pages/import/ImportWizard.tsx

Route: /import/new

Steps (4 total):

1. Upload:
   - Drag & drop zone
   - File type validation (.xlsx, .xls, .csv)
   - Size limit 10MB
   - Upload to Supabase Storage
   - Show upload progress

2. Column Mapping:
   - Parse uploaded file (use SheetJS or PapaParse)
   - Show preview: first 10 rows
   - Mapping interface:
     - Left: Excel columns
     - Middle: Arrow icon
     - Right: PIM field dropdown
   - Auto-suggest mappings
   - Required fields highlighted
   - Save/load template

3. Validation:
   - Run validation (Zod schemas)
   - Show results:
     - ✓ Valid (count)
     - ⚠ Warnings (expandable list)
     - ✗ Errors (expandable list)
   - Download error log button
   - Continue/Fix buttons

4. Processing:
   - Call Edge Function "import-products"
   - Real-time progress bar
   - Live counts: inserted, updated, failed
   - Supabase Realtime subscription for updates
   - On complete: results summary + action buttons

Stepper UI:
- Show step numbers and progress bar at top
- Disable future steps until current complete
- Back button (except on step 4)
- Next/Finish buttons

State Management:
- Use React Context or Zustand for wizard state
- Persist file path, mappings between steps

Styling:
- Full-screen wizard
- Dark mode
- Large, clear step indicators
```

---

## Category 4: Data Fetching

### Products Query Hook

```
Create useProductsQuery custom hook in src/hooks/useProductsQuery.ts

Purpose: Fetch products with filters, pagination, sorting

Parameters:
- filters: FilterState (brand, color, size, type, status, search)
- pagination: { page: number, pageSize: number }
- sorting: { column: string, direction: 'asc' | 'desc' }

Query Logic:
- Base query: product_skus table
- Joins: color_variant, product_styles, brands
- Where: tenant_id + filters
- Order by: sorting
- Limit/Offset: pagination

Return:
- data: ProductSKU[]
- totalCount: number
- isLoading: boolean
- error: Error | null
- refetch: () => void

Use TanStack Query:
- Query key includes all params
- Cache time: 5 minutes
- Stale time: 1 minute
- Refetch on window focus

TypeScript: Full type safety with ProductSKU interface from database types.
```

---

### Product Mutations Hook

```
Create useProductMutations custom hook in src/hooks/useProductMutations.ts

Purpose: CRUD operations for products

Mutations:
1. createStyle(data: NewProductStyle): Promise<ProductStyle>
2. updateStyle(id: number, data: Partial<ProductStyle>): Promise<ProductStyle>
3. archiveStyle(id: number): Promise<void>
4. createColorVariant(data: NewColorVariant): Promise<ColorVariant>
5. createSKUs(colorVariantId: number, sizes: string[], defaultPrice: number): Promise<ProductSKU[]>
6. updateSKUPrice(id: number, price: number): Promise<ProductSKU>
7. bulkUpdateSKUs(ids: number[], updates: Partial<ProductSKU>): Promise<void>

Each mutation:
- Uses TanStack Mutation
- Optimistic updates where applicable
- Success toast notification
- Error handling with toast
- Invalidates relevant queries

Return:
- createStyleMutation
- updateStyleMutation
- etc. (all mutations)

Example usage:
const { createStyleMutation } = useProductMutations();
createStyleMutation.mutate(formData);
```

---

## Category 5: Utilities

### EAN Validator Function

```
Create EAN-13 validator function in src/lib/validators.ts

Function: validateEAN13(ean: string): boolean

Logic:
1. Check length = 13
2. Check all digits
3. Calculate check digit:
   - Sum odd positions × 1
   - Sum even positions × 3
   - Calculate (10 - (sum % 10)) % 10
   - Compare with last digit
4. Return true if valid

Also export:
- generateEAN13(): string (generates valid random EAN)

Use in:
- Zod schemas for validation
- Import validation step
- SKU generation
```

---

### Price Formatter Utility

```
Create price formatting utilities in src/lib/formatters.ts

Functions:

1. formatPrice(cents: number, currency = 'EUR'): string
   - Convert cents to euros
   - Format with 2 decimals
   - Add currency symbol
   - Example: 4495 → "€44,95"

2. formatPriceRange(min: number, max: number): string
   - Example: (2995, 4995) → "€29,95 - €49,95"

3. calculateMargin(cost: number, sell: number): number
   - Return margin percentage
   - Formula: ((sell - cost) / cost) * 100

4. formatMargin(margin: number): string
   - Example: 34.5 → "34,5%"
   - Add color class: green if > 20%, orange if 10-20%, red if < 10%

Use throughout app for consistent price display.
```

---

## Category 6: Edge Functions

### Import Products Edge Function

```
Create Supabase Edge Function: supabase/functions/import-products/index.ts

Purpose: Server-side import processing

Input (JSON):
{
  "file_path": "imports/tenant-id/file.xlsx",
  "tenant_id": "uuid",
  "column_mappings": [...]
}

Process:
1. Download file from Storage
2. Parse file (SheetJS for Excel, PapaParse for CSV)
3. Apply column mappings
4. For each row (batches of 100):
   - Transform data
   - Validate with Zod
   - Normalize (colors, sizes)
   - Upsert to database (match on SKU)
   - Log errors
5. Update import_jobs table with progress
6. Return results

Error Handling:
- Try/catch per batch
- Continue on errors (log them)
- Mark job as completed with errors

Dependencies:
- npm install xlsx papaparse zod

Deploy: supabase functions deploy import-products
```

---

### Export to Gripp Edge Function

```
Create Supabase Edge Function: supabase/functions/export-gripp/index.ts

Purpose: Sync products to Gripp ERP

Input (JSON):
{
  "tenant_id": "uuid",
  "sync_type": "full" | "delta"
}

Process:
1. Create sync_jobs record
2. Query products:
   - WHERE tenant_id + product_type='KERN' + is_active + is_published
   - If delta: WHERE updated_at > last_sync_time
3. Transform to Gripp format (see export-formats.md)
4. Batch POST to Gripp API (100 per request)
5. Handle rate limits (429 → wait 60s, retry)
6. Update sync_jobs with results
7. Return summary

Gripp API:
- Endpoint: process.env.GRIPP_API_URL
- Auth: Bearer token from process.env.GRIPP_API_KEY
- POST /api/v2/products/bulk

Error Handling:
- Retry on network errors (max 3)
- Log failed items
- Continue with successful batches

Deploy: supabase functions deploy export-gripp
```

---

## Prompt Best Practices

### ✅ Good Prompts

**Clear Structure:**

```
Create [Component] in [Location]

Features: [bullet list]
Props: [types]
Styling: [specifics]
Data: [source + query]
```

**Specific Requirements:**

```
- Use exact color: #0097D7
- Table row height: 36px
- Font size: text-tiny (11px)
- Dark mode: bg-background-secondary
```

**Include Examples:**

```
Example usage:
<ProductCard sku={sku} onClick={() => navigate(`/products/${sku.id}`)} />
```

### ❌ Bad Prompts

**Too Vague:**

```
Make a product page
```

**No Context:**

```
Add a table
```

**Missing Requirements:**

```
Create form for products
(Which fields? Validation? Styling?)
```

---

## Troubleshooting Prompts

### Fix Dark Mode Issues

```
Fix dark mode styling for [Component]

Current issue: [describe problem]

Requirements:
- Background: use bg-background-secondary (not hard-coded colors)
- Text: use text-primary for headings, text-secondary for body
- Borders: use border-border-primary
- Hover states: use bg-interactive-hover
- Apply dark: prefix to all color utilities

Ensure component uses Tailwind dark mode classes, not inline styles.
```

---

### Fix Type Errors

```
Fix TypeScript errors in [File]

Errors:
[paste error messages]

Requirements:
- Use proper types from src/types/database.ts
- No 'any' types
- Strict mode compliant
- Add missing type definitions if needed

Show full corrected code.
```

---

### Optimize Query Performance

```
Optimize Supabase query performance for [Query]

Current query: [paste query]

Issues:
- Slow response time (> 1s)
- Fetching too much data

Optimize:
- Add indexes on filtered columns
- Use select() to fetch only needed columns
- Implement pagination if not present
- Add proper joins (avoid N+1)

Show optimized query + SQL for any needed indexes.
```

---

_Use deze prompts als starting point - aanpassen naar je specifieke needs._
